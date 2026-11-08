DROP TABLE IF EXISTS pg_temp.query_results;
CREATE TEMP TABLE query_results (test TEXT, result TEXT, detail TEXT);

INSERT INTO query_results
SELECT 'Line amounts = quantity × price on the sales date',
       CASE WHEN count(*) FILTER (WHERE amount <> round(quantity * price_on(prodcode, salesdate), 2)) = 0 THEN 'PASS' ELSE 'FAIL' END,
       count(*) || ' lines checked'
  FROM sales_line_amount;

INSERT INTO query_results
SELECT 'Sum of sale totals = sum of line amounts',
       CASE WHEN (SELECT sum(total) FROM sales_total) = (SELECT sum(amount) FROM sales_line_amount) THEN 'PASS' ELSE 'FAIL' END,
       'total ' || (SELECT sum(total) FROM sales_total);

INSERT INTO query_results
SELECT 'One sales_total row per active sale',
       CASE WHEN (SELECT count(*) FROM sales_total) = (SELECT count(*) FROM sales WHERE NOT is_deleted) THEN 'PASS' ELSE 'FAIL' END,
       (SELECT count(*) FROM sales_total) || ' sales';

INSERT INTO query_results
SELECT 'Paid in payment_balance = active payments on active sales',
       CASE WHEN (SELECT sum(paid) FROM payment_balance) =
                 (SELECT coalesce(sum(p.amount), 0) FROM payment p JOIN sales s ON s.transno = p.transno
                   WHERE NOT p.is_deleted AND NOT s.is_deleted) THEN 'PASS' ELSE 'FAIL' END,
       'paid ' || (SELECT sum(paid) FROM payment_balance) || ', outstanding ' || (SELECT sum(balance) FILTER (WHERE balance > 0) FROM payment_balance);

INSERT INTO query_results
SELECT 'Balance = total − paid, with the right status',
       CASE WHEN count(*) FILTER (WHERE balance <> total - paid
                 OR status <> CASE WHEN abs(balance) < 0.005 THEN 'Paid' WHEN balance > 0 THEN 'Open' ELSE 'Overpaid' END) = 0
            THEN 'PASS' ELSE 'FAIL' END,
       count(*) FILTER (WHERE status = 'Open') || ' open, ' || count(*) FILTER (WHERE status = 'Paid') || ' paid'
  FROM payment_balance;

INSERT INTO query_results
SELECT 'Customer balances add up to transaction balances',
       CASE WHEN (SELECT sum(balance) FROM customer_balance) = (SELECT sum(balance) FROM payment_balance) THEN 'PASS' ELSE 'FAIL' END,
       (SELECT count(*) FROM customer_balance) || ' customers';

INSERT INTO query_results
SELECT 'Product Master List lists every active product',
       CASE WHEN (SELECT count(*) FROM report_product_master()) = (SELECT count(*) FROM product WHERE NOT is_deleted) THEN 'PASS' ELSE 'FAIL' END,
       (SELECT count(*) FROM report_product_master()) || ' products';

INSERT INTO query_results
SELECT 'Active vs All Employees',
       CASE WHEN (SELECT count(*) FROM report_employees(true))  = (SELECT count(*) FROM employee WHERE NOT is_deleted AND sepdate IS NULL)
             AND (SELECT count(*) FROM report_employees(false)) = (SELECT count(*) FROM employee WHERE NOT is_deleted) THEN 'PASS' ELSE 'FAIL' END,
       (SELECT count(*) FROM report_employees(true)) || ' active of ' || (SELECT count(*) FROM report_employees(false));

INSERT INTO query_results
SELECT 'Employee Job History is newest first',
       CASE WHEN (SELECT bool_and(a.effdate >= b.effdate) FROM
                   (SELECT effdate, row_number() OVER () n FROM report_employee_job_history((SELECT empno FROM jobhistory GROUP BY empno ORDER BY count(*) DESC LIMIT 1))) a
                   JOIN (SELECT effdate, row_number() OVER () n FROM report_employee_job_history((SELECT empno FROM jobhistory GROUP BY empno ORDER BY count(*) DESC LIMIT 1))) b
                     ON b.n = a.n + 1) THEN 'PASS' ELSE 'FAIL' END,
       'checked the employee with the most changes';

INSERT INTO query_results
SELECT 'Top N returns at most N rows, ranked by amount',
       CASE WHEN (SELECT count(*) FROM report_top_customers(NULL, NULL, 5)) <= 5
             AND (SELECT count(*) FROM report_top_products(NULL, NULL, 3)) <= 3
             AND (SELECT count(*) FROM report_top_sales(NULL, NULL, 7)) <= 7
             AND (SELECT bool_and(total_sales >= coalesce(lead_v, 0)) FROM
                  (SELECT total_sales, lead(total_sales) OVER (ORDER BY rank) lead_v FROM report_top_customers(NULL, NULL, 10)) x)
            THEN 'PASS' ELSE 'FAIL' END,
       'top customer: ' || coalesce((SELECT custname || ' ' || total_sales FROM report_top_customers(NULL, NULL, 1)), 'none');

INSERT INTO query_results
SELECT 'Date range only includes sales inside it',
       CASE WHEN NOT EXISTS (SELECT 1 FROM report_top_sales('2011-01-01', '2011-01-31', 500) WHERE salesdate NOT BETWEEN '2011-01-01' AND '2011-01-31')
             AND (SELECT count(*) FROM report_top_sales('2011-01-01', '2011-01-31', 500))
               = (SELECT count(*) FROM sales WHERE NOT is_deleted AND salesdate BETWEEN '2011-01-01' AND '2011-01-31')
            THEN 'PASS' ELSE 'FAIL' END,
       (SELECT count(*) FROM report_top_sales('2011-01-01', '2011-01-31', 500)) || ' sales in January 2011';

INSERT INTO query_results
SELECT 'Audit search filters by table and action',
       CASE WHEN NOT EXISTS (SELECT 1 FROM audit_log_search(p_table => 'customer', p_action => 'add') WHERE table_name <> 'customer' OR action <> 'ADD')
            THEN 'PASS' ELSE 'FAIL' END,
       (SELECT count(*) FROM audit_log_search(p_table => 'customer', p_action => 'ADD', p_limit => 100000)) || ' customer ADD entries';

INSERT INTO query_results
SELECT 'Audit search respects the limit and is newest first',
       CASE WHEN (SELECT count(*) FROM audit_log_search(p_limit => 5)) <= 5
             AND (SELECT bool_and(audit_id >= coalesce(nxt, 0)) FROM (SELECT audit_id, lead(audit_id) OVER () nxt FROM audit_log_search(p_limit => 50)) x)
            THEN 'PASS' ELSE 'FAIL' END,
       'limit 5';

SELECT * FROM query_results;
