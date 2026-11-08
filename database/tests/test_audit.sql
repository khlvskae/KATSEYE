DROP TABLE IF EXISTS pg_temp.audit_user_results;
CREATE TEMP TABLE audit_user_results (test TEXT, expected TEXT, got TEXT, result TEXT);

DO $$
DECLARE
    v_user  app_user;
    v_cust  TEXT;
    v_by    TEXT;
    v_stamp TEXT;
BEGIN
    SELECT * INTO v_user FROM app_user WHERE NOT is_deleted ORDER BY created_at LIMIT 1;
    SELECT custno INTO v_cust FROM customer WHERE NOT is_deleted ORDER BY custno LIMIT 1;
    IF v_user.id IS NULL THEN
        INSERT INTO audit_user_results VALUES ('Signed-in website user', 'an account in app_user', 'none found', 'SKIP: create a user first');
        RETURN;
    END IF;

    BEGIN
        PERFORM set_config('request.jwt.claims', json_build_object('sub', v_user.id, 'role', 'authenticated')::text, true);
        PERFORM set_config('request.jwt.claim.sub', v_user.id::text, true);
        UPDATE customer SET custname = left('audit test ' || custname, 20) WHERE custno = v_cust;
        SELECT action_by INTO v_by FROM audit_log ORDER BY audit_id DESC LIMIT 1;
        SELECT stamp INTO v_stamp FROM customer WHERE custno = v_cust;
        RAISE EXCEPTION 'UNDO';
    EXCEPTION WHEN OTHERS THEN
        IF SQLERRM <> 'UNDO' THEN v_by := 'error: ' || SQLERRM; END IF;
    END;
    PERFORM set_config('request.jwt.claims', '', true);
    PERFORM set_config('request.jwt.claim.sub', '', true);
    INSERT INTO audit_user_results VALUES ('audit_log.action_by for a signed-in user',
        split_part(v_user.email, '@', 1), v_by, CASE WHEN v_by = split_part(v_user.email, '@', 1) THEN 'PASS' ELSE 'FAIL' END);
    INSERT INTO audit_user_results VALUES ('Row stamp for a signed-in user',
        'EDIT ' || split_part(v_user.email, '@', 1) || ' …', v_stamp,
        CASE WHEN v_stamp LIKE 'EDIT ' || split_part(v_user.email, '@', 1) || ' %' THEN 'PASS' ELSE 'FAIL' END);

    BEGIN
        PERFORM set_config('app.username', 'script-test', true);
        UPDATE customer SET custname = left('audit test ' || custname, 20) WHERE custno = v_cust;
        SELECT action_by INTO v_by FROM audit_log ORDER BY audit_id DESC LIMIT 1;
        RAISE EXCEPTION 'UNDO';
    EXCEPTION WHEN OTHERS THEN
        IF SQLERRM <> 'UNDO' THEN v_by := 'error: ' || SQLERRM; END IF;
    END;
    PERFORM set_config('app.username', '', true);
    INSERT INTO audit_user_results VALUES ('action_by when a script sets app.username', 'script-test', v_by,
        CASE WHEN v_by = 'script-test' THEN 'PASS' ELSE 'FAIL' END);

    BEGIN
        UPDATE customer SET custname = left('audit test ' || custname, 20) WHERE custno = v_cust;
        SELECT action_by INTO v_by FROM audit_log ORDER BY audit_id DESC LIMIT 1;
        RAISE EXCEPTION 'UNDO';
    EXCEPTION WHEN OTHERS THEN
        IF SQLERRM <> 'UNDO' THEN v_by := 'error: ' || SQLERRM; END IF;
    END;
    INSERT INTO audit_user_results VALUES ('action_by with no user (SQL Editor)', session_user::text, v_by,
        CASE WHEN v_by = session_user::text THEN 'PASS' ELSE 'FAIL' END);
END;
$$;

SELECT * FROM audit_user_results;
