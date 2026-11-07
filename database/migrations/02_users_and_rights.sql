CREATE TABLE IF NOT EXISTS role (
    role_code  VARCHAR(12) PRIMARY KEY,
    role_name  VARCHAR(30) NOT NULL
);

CREATE TABLE IF NOT EXISTS module (
    module_code VARCHAR(12) PRIMARY KEY,
    module_name VARCHAR(30) NOT NULL,
    sort_order  INT NOT NULL
);

CREATE TABLE IF NOT EXISTS rights (
    right_code  VARCHAR(30) PRIMARY KEY,
    module_code VARCHAR(12) NOT NULL REFERENCES module,
    label       VARCHAR(40) NOT NULL,
    sort_order  INT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_user (
    id          UUID PRIMARY KEY REFERENCES auth.users (id),
    email       VARCHAR(120) NOT NULL UNIQUE,
    first_name  VARCHAR(30) NOT NULL DEFAULT '',
    last_name   VARCHAR(30) NOT NULL DEFAULT '',
    role        VARCHAR(12) NOT NULL DEFAULT 'user' REFERENCES role,
    status      VARCHAR(12) NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'active', 'blocked', 'disapproved')),
    empno       VARCHAR(5) REFERENCES employee,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_deleted  BOOLEAN NOT NULL DEFAULT FALSE,
    stamp       VARCHAR(60)
);

CREATE TABLE IF NOT EXISTS user_permission (
    user_id     UUID NOT NULL REFERENCES app_user (id),
    right_code  VARCHAR(30) NOT NULL REFERENCES rights,
    is_deleted  BOOLEAN NOT NULL DEFAULT FALSE,
    stamp       VARCHAR(60),
    PRIMARY KEY (user_id, right_code)
);

ALTER TABLE app_user DROP CONSTRAINT IF EXISTS app_user_empno_fkey;
UPDATE app_user SET empno = NULL WHERE empno NOT IN (SELECT empno FROM employee);
ALTER TABLE app_user ADD CONSTRAINT app_user_empno_fkey FOREIGN KEY (empno) REFERENCES employee;

DROP TRIGGER IF EXISTS app_user_biu_stamp ON app_user;
DROP TRIGGER IF EXISTS app_user_bd_block ON app_user;
DROP TRIGGER IF EXISTS app_user_aiu_audit ON app_user;
DROP TRIGGER IF EXISTS user_permission_biu_stamp ON user_permission;
DROP TRIGGER IF EXISTS user_permission_bd_block ON user_permission;
DROP TRIGGER IF EXISTS user_permission_aiu_audit ON user_permission;

CREATE TRIGGER app_user_biu_stamp BEFORE INSERT OR UPDATE ON app_user
    FOR EACH ROW EXECUTE FUNCTION trg_set_stamp();
CREATE TRIGGER app_user_bd_block BEFORE DELETE ON app_user
    FOR EACH ROW EXECUTE FUNCTION trg_block_hard_delete();
CREATE TRIGGER app_user_aiu_audit AFTER INSERT OR UPDATE ON app_user
    FOR EACH ROW EXECUTE FUNCTION trg_audit_log('id');
CREATE TRIGGER user_permission_biu_stamp BEFORE INSERT OR UPDATE ON user_permission
    FOR EACH ROW EXECUTE FUNCTION trg_set_stamp();
CREATE TRIGGER user_permission_bd_block BEFORE DELETE ON user_permission
    FOR EACH ROW EXECUTE FUNCTION trg_block_hard_delete();
CREATE TRIGGER user_permission_aiu_audit AFTER INSERT OR UPDATE ON user_permission
    FOR EACH ROW EXECUTE FUNCTION trg_audit_log('user_id', 'right_code');

ALTER FUNCTION trg_audit_log() SECURITY DEFINER SET search_path = public;
ALTER FUNCTION trg_check_children() SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION my_role() RETURNS TEXT
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_role TEXT;
BEGIN
    SELECT role INTO v_role FROM app_user
     WHERE id = auth.uid() AND status = 'active' AND is_deleted = FALSE;
    RETURN v_role;
END;
$$;

CREATE OR REPLACE FUNCTION has_right(p_right TEXT) RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF my_role() IN ('superadmin', 'admin') THEN
        RETURN TRUE;
    END IF;
    IF my_role() = 'user' THEN
        RETURN EXISTS (SELECT 1 FROM user_permission
                        WHERE user_id = auth.uid() AND right_code = p_right AND is_deleted = FALSE);
    END IF;
    RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION handle_new_auth_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    INSERT INTO app_user (id, email, first_name, last_name)
    VALUES (NEW.id, lower(NEW.email),
            left(COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''), 30),
            left(COALESCE(NEW.raw_user_meta_data ->> 'last_name', ''), 30))
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();

CREATE OR REPLACE FUNCTION trg_last_superadmin() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    IF OLD.role = 'superadmin' AND OLD.status = 'active' AND OLD.is_deleted = FALSE
       AND (NEW.role <> 'superadmin' OR NEW.status <> 'active' OR NEW.is_deleted = TRUE)
       AND (SELECT COUNT(*) FROM app_user
             WHERE role = 'superadmin' AND status = 'active'
               AND is_deleted = FALSE AND id <> OLD.id) = 0 THEN
        RAISE EXCEPTION 'You cannot demote, block or remove the last active superadmin.';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS app_user_bu_last_super ON app_user;
CREATE TRIGGER app_user_bu_last_super BEFORE UPDATE ON app_user
    FOR EACH ROW EXECUTE FUNCTION trg_last_superadmin();

CREATE OR REPLACE FUNCTION admin_save_user(p_id UUID, p_first TEXT, p_last TEXT, p_role TEXT, p_status TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_target_role TEXT;
BEGIN
    IF my_role() IS NULL OR my_role() NOT IN ('superadmin', 'admin') THEN
        RAISE EXCEPTION 'Only admins and superadmins can manage users.';
    END IF;
    SELECT role INTO v_target_role FROM app_user WHERE id = p_id AND is_deleted = FALSE;
    IF v_target_role IS NULL THEN
        RAISE EXCEPTION 'User not found.';
    END IF;
    IF my_role() = 'admin' AND (v_target_role <> 'user' OR p_role <> 'user') THEN
        RAISE EXCEPTION 'Admins can only manage accounts with the User role.';
    END IF;
    IF p_id = auth.uid() AND p_status <> 'active' THEN
        RAISE EXCEPTION 'You cannot block or disable your own account.';
    END IF;
    IF p_id = auth.uid() AND p_role <> v_target_role THEN
        RAISE EXCEPTION 'You cannot change your own role.';
    END IF;

    UPDATE app_user
       SET first_name = left(trim(p_first), 30), last_name = left(trim(p_last), 30),
           role = p_role, status = p_status
     WHERE id = p_id;
END;
$$;

CREATE OR REPLACE FUNCTION admin_set_rights(p_id UUID, p_rights TEXT[])
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_right TEXT;
BEGIN
    IF my_role() IS NULL OR my_role() NOT IN ('superadmin', 'admin') THEN
        RAISE EXCEPTION 'Only admins and superadmins can assign rights.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM app_user WHERE id = p_id AND role = 'user' AND is_deleted = FALSE) THEN
        RAISE EXCEPTION 'Rights can only be assigned to accounts with the User role.';
    END IF;
    FOREACH v_right IN ARRAY p_rights LOOP
        IF NOT EXISTS (SELECT 1 FROM rights WHERE right_code = v_right) THEN
            RAISE EXCEPTION 'Unknown right: %', v_right;
        END IF;
    END LOOP;

    UPDATE user_permission SET is_deleted = TRUE
     WHERE user_id = p_id AND is_deleted = FALSE AND NOT (right_code = ANY (p_rights));

    FOREACH v_right IN ARRAY p_rights LOOP
        UPDATE user_permission SET is_deleted = FALSE
         WHERE user_id = p_id AND right_code = v_right AND is_deleted = TRUE;
        INSERT INTO user_permission (user_id, right_code) VALUES (p_id, v_right)
        ON CONFLICT DO NOTHING;
    END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION admin_save_user(UUID, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION admin_set_rights(UUID, TEXT[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION admin_save_user(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_set_rights(UUID, TEXT[]) TO authenticated;

ALTER TABLE app_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permission ENABLE ROW LEVEL SECURITY;
ALTER TABLE role ENABLE ROW LEVEL SECURITY;
ALTER TABLE module ENABLE ROW LEVEL SECURITY;
ALTER TABLE rights ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app_user, user_permission, role, module, rights, audit_log FROM anon;
GRANT SELECT ON app_user, user_permission, role, module, rights, audit_log TO authenticated;

DROP POLICY IF EXISTS app_user_read ON app_user;
DROP POLICY IF EXISTS user_permission_read ON user_permission;
DROP POLICY IF EXISTS lookup_read ON role;
DROP POLICY IF EXISTS lookup_read ON module;
DROP POLICY IF EXISTS lookup_read ON rights;
DROP POLICY IF EXISTS audit_read ON audit_log;

CREATE POLICY app_user_read ON app_user FOR SELECT TO authenticated
    USING (id = auth.uid() OR my_role() = 'superadmin' OR (my_role() = 'admin' AND role <> 'superadmin'));
CREATE POLICY user_permission_read ON user_permission FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR my_role() = 'superadmin'
           OR (my_role() = 'admin' AND (SELECT role FROM app_user WHERE id = user_id) <> 'superadmin'));
CREATE POLICY lookup_read ON role FOR SELECT TO authenticated USING (true);
CREATE POLICY lookup_read ON module FOR SELECT TO authenticated USING (true);
CREATE POLICY lookup_read ON rights FOR SELECT TO authenticated USING (true);
CREATE POLICY audit_read ON audit_log FOR SELECT TO authenticated USING (my_role() = 'superadmin');
