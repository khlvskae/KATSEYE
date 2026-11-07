CREATE TEMP TABLE delete_check_results (test TEXT, expected TEXT, result TEXT, detail TEXT);

DO $$
DECLARE
    v_msg  TEXT;
    v_emp  TEXT;
    v_dept TEXT;
    v_job  TEXT;
BEGIN
    SELECT empno    INTO v_emp  FROM jobhistory WHERE NOT is_deleted LIMIT 1;
    SELECT deptcode INTO v_dept FROM jobhistory WHERE NOT is_deleted AND deptcode IS NOT NULL LIMIT 1;
    SELECT jobcode  INTO v_job  FROM jobhistory WHERE NOT is_deleted LIMIT 1;

    BEGIN
        UPDATE employee SET is_deleted = true WHERE empno = v_emp;
        RAISE EXCEPTION 'NOT_BLOCKED';
    EXCEPTION WHEN OTHERS THEN v_msg := SQLERRM;
    END;
    INSERT INTO delete_check_results VALUES ('Delete employee ' || v_emp || ' (has job history)', 'blocked',
        CASE WHEN v_msg LIKE 'Cannot delete%' THEN 'PASS' ELSE 'FAIL' END, v_msg);

    SELECT empno INTO v_emp FROM sales WHERE NOT is_deleted LIMIT 1;
    BEGIN
        UPDATE employee SET is_deleted = true WHERE empno = v_emp;
        RAISE EXCEPTION 'NOT_BLOCKED';
    EXCEPTION WHEN OTHERS THEN v_msg := SQLERRM;
    END;
    INSERT INTO delete_check_results VALUES ('Delete employee ' || v_emp || ' (has sales)', 'blocked',
        CASE WHEN v_msg LIKE 'Cannot delete%' THEN 'PASS' ELSE 'FAIL' END, v_msg);

    BEGIN
        UPDATE department SET is_deleted = true WHERE deptcode = v_dept;
        RAISE EXCEPTION 'NOT_BLOCKED';
    EXCEPTION WHEN OTHERS THEN v_msg := SQLERRM;
    END;
    INSERT INTO delete_check_results VALUES ('Delete department ' || v_dept || ' (in use)', 'blocked',
        CASE WHEN v_msg LIKE 'Cannot delete%' THEN 'PASS' ELSE 'FAIL' END, v_msg);

    BEGIN
        UPDATE job SET is_deleted = true WHERE jobcode = v_job;
        RAISE EXCEPTION 'NOT_BLOCKED';
    EXCEPTION WHEN OTHERS THEN v_msg := SQLERRM;
    END;
    INSERT INTO delete_check_results VALUES ('Delete job ' || v_job || ' (in use)', 'blocked',
        CASE WHEN v_msg LIKE 'Cannot delete%' THEN 'PASS' ELSE 'FAIL' END, v_msg);

    BEGIN
        INSERT INTO department (deptcode, deptname) VALUES ('ZZT', 'Delete test');
        UPDATE department SET is_deleted = true WHERE deptcode = 'ZZT';
        RAISE EXCEPTION 'UNDO_OK';
    EXCEPTION WHEN OTHERS THEN v_msg := SQLERRM;
    END;
    INSERT INTO delete_check_results VALUES ('Delete unused department', 'allowed',
        CASE WHEN v_msg = 'UNDO_OK' THEN 'PASS' ELSE 'FAIL' END, CASE WHEN v_msg = 'UNDO_OK' THEN 'soft-deleted, then undone' ELSE v_msg END);

    BEGIN
        INSERT INTO job (jobcode, jobdesc) VALUES ('ZZTJ', 'Delete test');
        UPDATE job SET is_deleted = true WHERE jobcode = 'ZZTJ';
        RAISE EXCEPTION 'UNDO_OK';
    EXCEPTION WHEN OTHERS THEN v_msg := SQLERRM;
    END;
    INSERT INTO delete_check_results VALUES ('Delete unused job', 'allowed',
        CASE WHEN v_msg = 'UNDO_OK' THEN 'PASS' ELSE 'FAIL' END, CASE WHEN v_msg = 'UNDO_OK' THEN 'soft-deleted, then undone' ELSE v_msg END);

    BEGIN
        INSERT INTO employee (empno, lastname, firstname, gender, hiredate) VALUES ('99999', 'Test', 'Delete', 'F', '2020-01-01');
        INSERT INTO jobhistory (empno, jobcode, effdate, salary, deptcode) VALUES ('99999', v_job, '2020-01-01', 1000, v_dept);
        UPDATE jobhistory SET is_deleted = true WHERE empno = '99999';
        UPDATE employee SET is_deleted = true WHERE empno = '99999';
        RAISE EXCEPTION 'UNDO_OK';
    EXCEPTION WHEN OTHERS THEN v_msg := SQLERRM;
    END;
    INSERT INTO delete_check_results VALUES ('Delete employee after deleting their job history', 'allowed',
        CASE WHEN v_msg = 'UNDO_OK' THEN 'PASS' ELSE 'FAIL' END, CASE WHEN v_msg = 'UNDO_OK' THEN 'soft-deleted, then undone' ELSE v_msg END);

    BEGIN
        DELETE FROM job WHERE jobcode = v_job;
        RAISE EXCEPTION 'NOT_BLOCKED';
    EXCEPTION WHEN OTHERS THEN v_msg := SQLERRM;
    END;
    INSERT INTO delete_check_results VALUES ('Hard DELETE on job', 'blocked',
        CASE WHEN v_msg LIKE 'Hard delete%' THEN 'PASS' ELSE 'FAIL' END, v_msg);
END;
$$;

SELECT * FROM delete_check_results;
