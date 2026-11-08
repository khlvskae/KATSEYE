CREATE TABLE IF NOT EXISTS password_reset_token (
    token_id    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id     UUID        NOT NULL REFERENCES app_user (id),
    token_hash  CHAR(64)    NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ,
    is_used     BOOLEAN     GENERATED ALWAYS AS (used_at IS NOT NULL) STORED,
    CHECK (expires_at > created_at)
);
CREATE INDEX IF NOT EXISTS password_reset_token_user_idx ON password_reset_token (user_id, created_at DESC);

ALTER TABLE password_reset_token ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON password_reset_token FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION reset_token_hash(p_token TEXT) RETURNS CHAR(64)
LANGUAGE sql IMMUTABLE AS $$
    SELECT encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
$$;

CREATE OR REPLACE FUNCTION issue_password_reset_token(p_email TEXT, p_minutes INT DEFAULT 60)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_user  app_user;
    v_token TEXT;
BEGIN
    IF p_minutes NOT BETWEEN 5 AND 1440 THEN
        RAISE EXCEPTION 'A reset token must last between 5 minutes and 24 hours.';
    END IF;
    SELECT * INTO v_user FROM app_user
     WHERE email = lower(trim(p_email)) AND NOT is_deleted AND status = 'active';
    IF v_user.id IS NULL THEN
        RETURN NULL;
    END IF;

    UPDATE password_reset_token SET used_at = now()
     WHERE user_id = v_user.id AND used_at IS NULL;

    v_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
    INSERT INTO password_reset_token (user_id, token_hash, expires_at)
    VALUES (v_user.id, reset_token_hash(v_token), now() + make_interval(mins => p_minutes));
    RETURN v_token;
END;
$$;

CREATE OR REPLACE FUNCTION consume_password_reset_token(p_token TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_row password_reset_token;
BEGIN
    SELECT * INTO v_row FROM password_reset_token
     WHERE token_hash = reset_token_hash(p_token)
       FOR UPDATE;
    IF v_row.token_id IS NULL THEN
        RAISE EXCEPTION 'This reset link is not valid. Request a new one.';
    ELSIF v_row.used_at IS NOT NULL THEN
        RAISE EXCEPTION 'This reset link has already been used. Request a new one.';
    ELSIF v_row.expires_at < now() THEN
        RAISE EXCEPTION 'This reset link has expired. Request a new one.';
    END IF;
    UPDATE password_reset_token SET used_at = now() WHERE token_id = v_row.token_id;
    RETURN v_row.user_id;
END;
$$;

REVOKE ALL ON FUNCTION issue_password_reset_token(TEXT, INT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION consume_password_reset_token(TEXT)    FROM PUBLIC, anon, authenticated;
