DROP TABLE IF EXISTS pg_temp.reset_token_results;
CREATE TEMP TABLE reset_token_results (test TEXT, result TEXT, detail TEXT);

DO $$
DECLARE
    v_email TEXT;
    v_token TEXT;
    v_old   TEXT;
    v_msg   TEXT;
    v_uid   UUID;
    v_hash  TEXT;
    v_res   JSONB := '[]';
BEGIN
    SELECT email INTO v_email FROM app_user WHERE status = 'active' AND NOT is_deleted LIMIT 1;
    IF v_email IS NULL THEN
        INSERT INTO reset_token_results VALUES ('Reset tokens', 'SKIP', 'No active account yet. Create one first.');
        RETURN;
    END IF;

    BEGIN
        v_token := issue_password_reset_token(v_email, 60);
        SELECT token_hash INTO v_hash FROM password_reset_token ORDER BY token_id DESC LIMIT 1;
        v_res := v_res || jsonb_build_object('test', 'Token is stored as a SHA-256 hash, not as text', 'result', CASE WHEN v_hash = reset_token_hash(v_token) AND v_hash <> v_token THEN 'PASS' ELSE 'FAIL' END, 'detail', 'hash length ' || length(v_hash));

        BEGIN PERFORM consume_password_reset_token('not-a-real-token'); v_msg := 'accepted';
        EXCEPTION WHEN OTHERS THEN v_msg := SQLERRM; END;
        v_res := v_res || jsonb_build_object('test', 'Unknown token is refused', 'result', CASE WHEN v_msg LIKE '%not valid%' THEN 'PASS' ELSE 'FAIL' END, 'detail', v_msg);

        v_uid := consume_password_reset_token(v_token);
        v_res := v_res || jsonb_build_object('test', 'Valid token is accepted', 'result', CASE WHEN v_uid IS NOT NULL THEN 'PASS' ELSE 'FAIL' END, 'detail', 'returned the account id');

        BEGIN PERFORM consume_password_reset_token(v_token); v_msg := 'accepted';
        EXCEPTION WHEN OTHERS THEN v_msg := SQLERRM; END;
        v_res := v_res || jsonb_build_object('test', 'Used token is refused', 'result', CASE WHEN v_msg LIKE '%already been used%' THEN 'PASS' ELSE 'FAIL' END, 'detail', v_msg);

        v_token := issue_password_reset_token(v_email, 60);
        UPDATE password_reset_token SET created_at = now() - interval '2 hours', expires_at = now() - interval '1 hour'
         WHERE token_hash = reset_token_hash(v_token);
        BEGIN PERFORM consume_password_reset_token(v_token); v_msg := 'accepted';
        EXCEPTION WHEN OTHERS THEN v_msg := SQLERRM; END;
        v_res := v_res || jsonb_build_object('test', 'Expired token is refused', 'result', CASE WHEN v_msg LIKE '%expired%' THEN 'PASS' ELSE 'FAIL' END, 'detail', v_msg);

        v_old := issue_password_reset_token(v_email, 60);
        v_token := issue_password_reset_token(v_email, 60);
        BEGIN PERFORM consume_password_reset_token(v_old); v_msg := 'accepted';
        EXCEPTION WHEN OTHERS THEN v_msg := SQLERRM; END;
        v_res := v_res || jsonb_build_object('test', 'Older token stops working after a new request', 'result', CASE WHEN v_msg LIKE '%already been used%' THEN 'PASS' ELSE 'FAIL' END, 'detail', v_msg);

        v_res := v_res || jsonb_build_object('test', 'Unknown email returns nothing', 'result', CASE WHEN issue_password_reset_token('nobody@nowhere.invalid') IS NULL THEN 'PASS' ELSE 'FAIL' END, 'detail', 'NULL');

        RAISE EXCEPTION 'UNDO';
    EXCEPTION WHEN OTHERS THEN
        IF SQLERRM <> 'UNDO' THEN
            v_res := v_res || jsonb_build_object('test', 'Test run', 'result', 'FAIL', 'detail', SQLERRM);
        END IF;
    END;
    INSERT INTO reset_token_results SELECT * FROM jsonb_to_recordset(v_res) AS x(test TEXT, result TEXT, detail TEXT);
END;
$$;

SELECT * FROM reset_token_results;
