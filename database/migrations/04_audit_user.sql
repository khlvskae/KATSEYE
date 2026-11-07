CREATE OR REPLACE FUNCTION audit_user() RETURNS TEXT
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_name TEXT;
BEGIN
    SELECT split_part(email, '@', 1) INTO v_name FROM app_user WHERE id = auth.uid();
    IF v_name IS NULL THEN
        v_name := NULLIF(current_setting('app.username', true), '');
    END IF;
    IF v_name IS NULL THEN
        v_name := session_user;
    END IF;
    RETURN v_name;
END;
$$;
