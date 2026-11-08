DROP TABLE IF EXISTS pg_temp.job_history_results;
CREATE TEMP TABLE job_history_results (test TEXT, expected TEXT, result TEXT, detail TEXT);

DO $$
DECLARE
    v_msg TEXT;
    h     jobhistory;
    e     employee;
    v_job TEXT;
BEGIN
    SELECT * INTO h FROM jobhistory WHERE NOT is_deleted ORDER BY empno, effdate LIMIT 1;
    SELECT * INTO e FROM employee WHERE empno = h.empno;
    SELECT jobcode INTO v_job FROM job WHERE jobcode <> h.jobcode AND NOT is_deleted LIMIT 1;

    BEGIN
        INSERT INTO jobhistory (empno, jobcode, effdate, salary, deptcode) VALUES (h.empno, v_job, h.effdate, 1, h.deptcode);
        RAISE EXCEPTION 'NOT_BLOCKED';
    EXCEPTION WHEN OTHERS THEN v_msg := SQLERRM; END;
    INSERT INTO job_history_results VALUES ('Two job changes on ' || h.effdate || ' for ' || h.empno, 'blocked',
        CASE WHEN v_msg LIKE '%already has a job change%' THEN 'PASS' ELSE 'FAIL' END, v_msg);

    BEGIN
        INSERT INTO jobhistory (empno, jobcode, effdate, salary, deptcode) VALUES (h.empno, v_job, e.hiredate - 1, 1, h.deptcode);
        RAISE EXCEPTION 'NOT_BLOCKED';
    EXCEPTION WHEN OTHERS THEN v_msg := SQLERRM; END;
    INSERT INTO job_history_results VALUES ('Date before the hire date', 'blocked',
        CASE WHEN v_msg LIKE '%before the hire date%' THEN 'PASS' ELSE 'FAIL' END, v_msg);

    SELECT * INTO e FROM employee WHERE sepdate IS NOT NULL AND NOT is_deleted LIMIT 1;
    IF e.empno IS NOT NULL THEN
        BEGIN
            INSERT INTO jobhistory (empno, jobcode, effdate, salary, deptcode) VALUES (e.empno, v_job, e.sepdate + 1, 1, h.deptcode);
            RAISE EXCEPTION 'NOT_BLOCKED';
        EXCEPTION WHEN OTHERS THEN v_msg := SQLERRM; END;
        INSERT INTO job_history_results VALUES ('Date after the separation date', 'blocked',
            CASE WHEN v_msg LIKE '%after the separation date%' THEN 'PASS' ELSE 'FAIL' END, v_msg);
    END IF;

    BEGIN
        INSERT INTO jobhistory (empno, jobcode, effdate, salary, deptcode) VALUES (h.empno, 'ZZZZ', h.effdate + 1, 1, h.deptcode);
        RAISE EXCEPTION 'NOT_BLOCKED';
    EXCEPTION WHEN OTHERS THEN v_msg := SQLERRM; END;
    INSERT INTO job_history_results VALUES ('Unknown job code', 'blocked',
        CASE WHEN v_msg <> 'NOT_BLOCKED' THEN 'PASS' ELSE 'FAIL' END, v_msg);

    BEGIN
        INSERT INTO jobhistory (empno, jobcode, effdate, salary, deptcode) VALUES (h.empno, v_job, CURRENT_DATE - 1, 1, h.deptcode);
        UPDATE jobhistory SET is_deleted = true WHERE empno = h.empno AND jobcode = v_job AND effdate = CURRENT_DATE - 1;
        INSERT INTO jobhistory (empno, jobcode, effdate, salary, deptcode) VALUES (h.empno, h.jobcode, CURRENT_DATE - 1, 1, h.deptcode);
        RAISE EXCEPTION 'UNDO_OK';
    EXCEPTION WHEN OTHERS THEN v_msg := SQLERRM; END;
    INSERT INTO job_history_results VALUES ('Valid change; same date reused after a soft delete', 'allowed',
        CASE WHEN v_msg = 'UNDO_OK' THEN 'PASS' ELSE 'FAIL' END, CASE WHEN v_msg = 'UNDO_OK' THEN 'saved, then undone' ELSE v_msg END);
END;
$$;

SELECT * FROM job_history_results;
