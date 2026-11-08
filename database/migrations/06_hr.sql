CREATE OR REPLACE VIEW employee_current_job WITH (security_invoker = true) AS
SELECT DISTINCT ON (e.empno)
       e.empno,
       e.lastname,
       e.firstname,
       e.gender,
       e.hiredate,
       e.sepdate,
       (e.sepdate IS NULL)  AS is_employed,
       h.jobcode,
       j.jobdesc,
       h.deptcode,
       d.deptname,
       h.salary,
       h.effdate            AS job_since
  FROM employee e
  LEFT JOIN jobhistory h ON h.empno = e.empno AND NOT h.is_deleted AND h.effdate <= CURRENT_DATE
  LEFT JOIN job        j ON j.jobcode = h.jobcode
  LEFT JOIN department d ON d.deptcode = h.deptcode
 WHERE NOT e.is_deleted
 ORDER BY e.empno, h.effdate DESC NULLS LAST;

CREATE OR REPLACE FUNCTION employee_job_as_of(p_date DATE)
RETURNS TABLE (empno VARCHAR, lastname VARCHAR, firstname VARCHAR, jobcode VARCHAR, jobdesc VARCHAR,
               deptcode VARCHAR, deptname VARCHAR, salary NUMERIC, job_since DATE)
LANGUAGE sql STABLE SECURITY INVOKER AS $$
    SELECT DISTINCT ON (e.empno)
           e.empno, e.lastname, e.firstname, h.jobcode, j.jobdesc, h.deptcode, d.deptname, h.salary, h.effdate
      FROM employee e
      JOIN jobhistory h ON h.empno = e.empno AND NOT h.is_deleted AND h.effdate <= p_date
      LEFT JOIN job        j ON j.jobcode = h.jobcode
      LEFT JOIN department d ON d.deptcode = h.deptcode
     WHERE NOT e.is_deleted
       AND e.hiredate <= p_date
       AND (e.sepdate IS NULL OR e.sepdate >= p_date)
     ORDER BY e.empno, h.effdate DESC;
$$;

CREATE OR REPLACE VIEW department_headcount WITH (security_invoker = true) AS
SELECT d.deptcode,
       d.deptname,
       count(c.empno)          AS employees,
       coalesce(sum(c.salary), 0) AS total_salary
  FROM department d
  LEFT JOIN employee_current_job c ON c.deptcode = d.deptcode AND c.is_employed
 WHERE NOT d.is_deleted
 GROUP BY d.deptcode, d.deptname;

REVOKE ALL ON employee_current_job, department_headcount FROM anon;
GRANT SELECT ON employee_current_job, department_headcount TO authenticated;
REVOKE ALL ON FUNCTION employee_job_as_of(DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION employee_job_as_of(DATE) TO authenticated;

CREATE OR REPLACE FUNCTION trg_jobhistory_validate() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
    v_emp employee;
BEGIN
    IF NEW.is_deleted THEN
        RETURN NEW;
    END IF;

    SELECT * INTO v_emp FROM employee WHERE empno = NEW.empno;
    IF v_emp.empno IS NULL OR v_emp.is_deleted THEN
        RAISE EXCEPTION 'Employee % does not exist or has been deleted.', NEW.empno;
    END IF;
    IF v_emp.hiredate IS NOT NULL AND NEW.effdate < v_emp.hiredate THEN
        RAISE EXCEPTION 'The effective date % is before the hire date %.', NEW.effdate, v_emp.hiredate;
    END IF;
    IF v_emp.sepdate IS NOT NULL AND NEW.effdate > v_emp.sepdate THEN
        RAISE EXCEPTION 'The effective date % is after the separation date %.', NEW.effdate, v_emp.sepdate;
    END IF;

    IF EXISTS (SELECT 1 FROM jobhistory
                WHERE empno = NEW.empno AND effdate = NEW.effdate AND NOT is_deleted
                  AND jobcode <> NEW.jobcode) THEN
        RAISE EXCEPTION 'Employee % already has a job change on %. Edit that entry instead.', NEW.empno, NEW.effdate;
    END IF;

    IF TG_OP = 'INSERT' OR NEW.jobcode IS DISTINCT FROM OLD.jobcode THEN
        IF NOT EXISTS (SELECT 1 FROM job WHERE jobcode = NEW.jobcode AND NOT is_deleted) THEN
            RAISE EXCEPTION 'Job % does not exist or has been deleted.', NEW.jobcode;
        END IF;
    END IF;
    IF NEW.deptcode IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.deptcode IS DISTINCT FROM OLD.deptcode) THEN
        IF NOT EXISTS (SELECT 1 FROM department WHERE deptcode = NEW.deptcode AND NOT is_deleted) THEN
            RAISE EXCEPTION 'Department % does not exist or has been deleted.', NEW.deptcode;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS jobhistory_biu_validate ON jobhistory;
CREATE TRIGGER jobhistory_biu_validate
    BEFORE INSERT OR UPDATE ON jobhistory
    FOR EACH ROW EXECUTE FUNCTION trg_jobhistory_validate();

CREATE UNIQUE INDEX IF NOT EXISTS jobhistory_one_change_per_day
    ON jobhistory (empno, effdate) WHERE NOT is_deleted;

CREATE UNIQUE INDEX IF NOT EXISTS app_user_one_account_per_employee
    ON app_user (empno) WHERE empno IS NOT NULL AND NOT is_deleted;

CREATE OR REPLACE FUNCTION admin_link_employee(p_user UUID, p_empno TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_me     TEXT := my_role();
    v_target app_user;
BEGIN
    IF v_me IS NULL OR v_me NOT IN ('superadmin', 'admin') THEN
        RAISE EXCEPTION 'Only admins and superadmins can link accounts to employees.';
    END IF;
    SELECT * INTO v_target FROM app_user WHERE id = p_user AND NOT is_deleted;
    IF v_target.id IS NULL THEN
        RAISE EXCEPTION 'User not found.';
    END IF;
    IF v_me = 'admin' AND v_target.role <> 'user' THEN
        RAISE EXCEPTION 'Admins can only manage accounts with the User role.';
    END IF;
    IF p_empno IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM employee WHERE empno = p_empno AND NOT is_deleted) THEN
            RAISE EXCEPTION 'Employee % does not exist or has been deleted.', p_empno;
        END IF;
        IF EXISTS (SELECT 1 FROM app_user WHERE empno = p_empno AND id <> p_user AND NOT is_deleted) THEN
            RAISE EXCEPTION 'Employee % is already linked to another account.', p_empno;
        END IF;
    END IF;
    UPDATE app_user SET empno = p_empno WHERE id = p_user;
END;
$$;
REVOKE ALL ON FUNCTION admin_link_employee(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION admin_link_employee(UUID, TEXT) TO authenticated;

CREATE OR REPLACE VIEW app_user_employee WITH (security_invoker = true) AS
SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.status,
       u.empno, e.lastname AS emp_lastname, e.firstname AS emp_firstname,
       c.jobdesc, c.deptname
  FROM app_user u
  LEFT JOIN employee e ON e.empno = u.empno
  LEFT JOIN employee_current_job c ON c.empno = u.empno
 WHERE NOT u.is_deleted;
REVOKE ALL ON app_user_employee FROM anon;
GRANT SELECT ON app_user_employee TO authenticated;

CREATE INDEX IF NOT EXISTS jobhistory_jobcode_idx  ON jobhistory (jobcode)  WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS jobhistory_deptcode_idx ON jobhistory (deptcode) WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS jobhistory_emp_date_idx ON jobhistory (empno, effdate DESC);
CREATE INDEX IF NOT EXISTS sales_empno_idx         ON sales (empno)         WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS sales_custno_idx        ON sales (custno)        WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS sales_salesdate_idx     ON sales (salesdate);
CREATE INDEX IF NOT EXISTS salesdetail_prodcode_idx ON salesdetail (prodcode) WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS payment_transno_idx     ON payment (transno)     WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS pricehist_prod_date_idx ON pricehist (prodcode, effdate DESC) WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS employee_name_idx       ON employee (lower(lastname), lower(firstname));
CREATE INDEX IF NOT EXISTS audit_log_table_idx     ON audit_log (table_name, audit_id DESC);
CREATE INDEX IF NOT EXISTS audit_log_at_idx        ON audit_log (action_at);
CREATE INDEX IF NOT EXISTS user_permission_user_idx ON user_permission (user_id) WHERE NOT is_deleted;

ANALYZE employee; ANALYZE jobhistory; ANALYZE sales; ANALYZE salesdetail; ANALYZE payment; ANALYZE pricehist;
