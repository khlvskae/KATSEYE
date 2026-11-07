CREATE OR REPLACE FUNCTION price_on(p_prodcode TEXT, p_date DATE) RETURNS NUMERIC
LANGUAGE sql STABLE SECURITY INVOKER AS $$
    SELECT unitprice FROM pricehist
     WHERE prodcode = p_prodcode AND effdate <= p_date AND NOT is_deleted
     ORDER BY effdate DESC
     LIMIT 1;
$$;

CREATE OR REPLACE VIEW sales_line_amount WITH (security_invoker = true) AS
SELECT d.transno,
       s.salesdate,
       s.custno,
       s.empno,
       d.prodcode,
       p.description,
       p.unit,
       d.quantity,
       pr.unitprice                                   AS unit_price,
       round(d.quantity * coalesce(pr.unitprice, 0), 2) AS amount
  FROM salesdetail d
  JOIN sales   s ON s.transno = d.transno AND NOT s.is_deleted
  JOIN product p ON p.prodcode = d.prodcode
  LEFT JOIN LATERAL (
        SELECT h.unitprice FROM pricehist h
         WHERE h.prodcode = d.prodcode AND h.effdate <= s.salesdate AND NOT h.is_deleted
         ORDER BY h.effdate DESC LIMIT 1) pr ON true
 WHERE NOT d.is_deleted;

CREATE OR REPLACE VIEW sales_total WITH (security_invoker = true) AS
SELECT s.transno,
       s.salesdate,
       s.custno,
       c.custname,
       s.empno,
       trim(e.firstname || ' ' || e.lastname)  AS salesperson,
       count(l.prodcode)                      AS line_count,
       coalesce(sum(l.amount), 0)             AS total
  FROM sales s
  LEFT JOIN customer c          ON c.custno = s.custno
  LEFT JOIN employee e          ON e.empno = s.empno
  LEFT JOIN sales_line_amount l ON l.transno = s.transno
 WHERE NOT s.is_deleted
 GROUP BY s.transno, s.salesdate, s.custno, c.custname, s.empno, e.firstname, e.lastname;

CREATE OR REPLACE VIEW payment_balance WITH (security_invoker = true) AS
SELECT t.transno,
       t.salesdate,
       t.custno,
       t.custname,
       t.total,
       coalesce(p.paid, 0)                AS paid,
       t.total - coalesce(p.paid, 0)      AS balance,
       coalesce(p.payments, 0)            AS payment_count,
       p.last_payment,
       CASE WHEN abs(t.total - coalesce(p.paid, 0)) < 0.005 THEN 'Paid'
            WHEN t.total - coalesce(p.paid, 0) > 0         THEN 'Open'
            ELSE 'Overpaid' END            AS status
  FROM sales_total t
  LEFT JOIN (SELECT transno, sum(amount) AS paid, count(*) AS payments, max(paydate) AS last_payment
               FROM payment WHERE NOT is_deleted GROUP BY transno) p ON p.transno = t.transno;

CREATE OR REPLACE VIEW customer_balance WITH (security_invoker = true) AS
SELECT custno,
       custname,
       count(*)      AS transactions,
       sum(total)    AS total,
       sum(paid)     AS paid,
       sum(balance)  AS balance
  FROM payment_balance
 GROUP BY custno, custname;

CREATE OR REPLACE FUNCTION report_product_master()
RETURNS TABLE (prodcode VARCHAR, description VARCHAR, unit VARCHAR, current_price NUMERIC)
LANGUAGE sql STABLE SECURITY INVOKER AS $$
    SELECT p.prodcode, p.description, p.unit, price_on(p.prodcode, CURRENT_DATE)
      FROM product p
     WHERE NOT p.is_deleted
     ORDER BY p.prodcode;
$$;

CREATE OR REPLACE FUNCTION report_employees(p_active_only BOOLEAN DEFAULT true)
RETURNS TABLE (empno VARCHAR, lastname VARCHAR, firstname VARCHAR, gender CHAR, birthdate DATE, hiredate DATE,
               sepdate DATE, status TEXT, jobdesc VARCHAR, deptname VARCHAR)
LANGUAGE sql STABLE SECURITY INVOKER AS $$
    SELECT c.empno, c.lastname, c.firstname, c.gender::char, e.birthdate, c.hiredate, c.sepdate,
           CASE WHEN c.is_employed THEN 'Active' ELSE 'Separated' END, c.jobdesc, c.deptname
      FROM employee_current_job c
      JOIN employee e ON e.empno = c.empno
     WHERE c.is_employed OR NOT p_active_only
     ORDER BY c.empno;
$$;

CREATE OR REPLACE FUNCTION report_employee_job_history(p_empno TEXT)
RETURNS TABLE (effdate DATE, jobcode VARCHAR, jobdesc VARCHAR, deptcode VARCHAR, deptname VARCHAR, salary NUMERIC)
LANGUAGE sql STABLE SECURITY INVOKER AS $$
    SELECT h.effdate, h.jobcode, j.jobdesc, h.deptcode, d.deptname, h.salary
      FROM jobhistory h
      LEFT JOIN job        j ON j.jobcode = h.jobcode
      LEFT JOIN department d ON d.deptcode = h.deptcode
     WHERE h.empno = p_empno AND NOT h.is_deleted
     ORDER BY h.effdate DESC;
$$;

CREATE OR REPLACE FUNCTION report_top_customers(p_from DATE DEFAULT NULL, p_to DATE DEFAULT NULL, p_top INT DEFAULT 10)
RETURNS TABLE (rank BIGINT, custno VARCHAR, custname VARCHAR, transactions BIGINT, total_sales NUMERIC)
LANGUAGE sql STABLE SECURITY INVOKER AS $$
    SELECT row_number() OVER (ORDER BY sum(t.total) DESC, t.custno), t.custno, t.custname, count(*), sum(t.total)
      FROM sales_total t
     WHERE (p_from IS NULL OR t.salesdate >= p_from) AND (p_to IS NULL OR t.salesdate <= p_to)
     GROUP BY t.custno, t.custname
     ORDER BY sum(t.total) DESC, t.custno
     LIMIT greatest(p_top, 1);
$$;

CREATE OR REPLACE FUNCTION report_top_products(p_from DATE DEFAULT NULL, p_to DATE DEFAULT NULL, p_top INT DEFAULT 10)
RETURNS TABLE (rank BIGINT, prodcode VARCHAR, description VARCHAR, qty_sold NUMERIC, sales_amount NUMERIC)
LANGUAGE sql STABLE SECURITY INVOKER AS $$
    SELECT row_number() OVER (ORDER BY sum(l.amount) DESC, l.prodcode), l.prodcode, l.description, sum(l.quantity), sum(l.amount)
      FROM sales_line_amount l
     WHERE (p_from IS NULL OR l.salesdate >= p_from) AND (p_to IS NULL OR l.salesdate <= p_to)
     GROUP BY l.prodcode, l.description
     ORDER BY sum(l.amount) DESC, l.prodcode
     LIMIT greatest(p_top, 1);
$$;

CREATE OR REPLACE FUNCTION report_top_sales(p_from DATE DEFAULT NULL, p_to DATE DEFAULT NULL, p_top INT DEFAULT 10)
RETURNS TABLE (rank BIGINT, transno VARCHAR, salesdate DATE, custname VARCHAR, salesperson TEXT, total NUMERIC)
LANGUAGE sql STABLE SECURITY INVOKER AS $$
    SELECT row_number() OVER (ORDER BY t.total DESC, t.transno), t.transno, t.salesdate, t.custname, t.salesperson, t.total
      FROM sales_total t
     WHERE (p_from IS NULL OR t.salesdate >= p_from) AND (p_to IS NULL OR t.salesdate <= p_to)
     ORDER BY t.total DESC, t.transno
     LIMIT greatest(p_top, 1);
$$;

CREATE OR REPLACE FUNCTION audit_log_search(
    p_table  TEXT DEFAULT NULL,
    p_action TEXT DEFAULT NULL,
    p_user   TEXT DEFAULT NULL,
    p_record TEXT DEFAULT NULL,
    p_from   DATE DEFAULT NULL,
    p_to     DATE DEFAULT NULL,
    p_limit  INT  DEFAULT 300)
RETURNS TABLE (audit_id BIGINT, action_at TIMESTAMPTZ, table_name VARCHAR, action VARCHAR,
               record_key VARCHAR, action_by VARCHAR, changes TEXT)
LANGUAGE sql STABLE SECURITY INVOKER AS $$
    SELECT a.audit_id, a.action_at, a.table_name, a.action, a.record_key, a.action_by,
           CASE a.action
             WHEN 'EDIT' THEN (
                 SELECT string_agg(k || ': ' || coalesce(a.old_values ->> k, '∅') || ' → ' || coalesce(a.new_values ->> k, '∅'), '; ' ORDER BY k)
                   FROM jsonb_object_keys(a.new_values) k
                  WHERE k <> 'stamp' AND (a.old_values -> k) IS DISTINCT FROM (a.new_values -> k))
             WHEN 'ADD' THEN 'Added'
             WHEN 'DELETE' THEN 'Soft-deleted'
             ELSE 'Restored' END
      FROM audit_log a
     WHERE (p_table  IS NULL OR a.table_name = p_table)
       AND (p_action IS NULL OR a.action = upper(p_action))
       AND (p_user   IS NULL OR a.action_by ILIKE '%' || p_user || '%')
       AND (p_record IS NULL OR a.record_key = p_record)
       AND (p_from   IS NULL OR a.action_at >= p_from)
       AND (p_to     IS NULL OR a.action_at <  p_to + 1)
     ORDER BY a.audit_id DESC
     LIMIT greatest(p_limit, 1);
$$;

REVOKE ALL ON sales_line_amount, sales_total, payment_balance, customer_balance FROM anon;
GRANT SELECT ON sales_line_amount, sales_total, payment_balance, customer_balance TO authenticated;

DO $$
DECLARE f TEXT;
BEGIN
    FOREACH f IN ARRAY ARRAY[
        'price_on(text, date)', 'report_product_master()', 'report_employees(boolean)',
        'report_employee_job_history(text)', 'report_top_customers(date, date, integer)',
        'report_top_products(date, date, integer)', 'report_top_sales(date, date, integer)',
        'audit_log_search(text, text, text, text, date, date, integer)']
    LOOP
        EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', f);
        EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', f);
    END LOOP;
END;
$$;
