INSERT INTO app_user (id, email)
SELECT id, lower(email) FROM auth.users
ON CONFLICT (id) DO NOTHING;

WITH team(email) AS (VALUES
    ('member1@example.com'),
    ('member2@example.com'),
    ('member3@example.com'),
    ('member4@example.com'),
    ('member5@example.com')
), promoted AS (
    UPDATE app_user u SET role = 'superadmin', status = 'active'
      FROM team t
     WHERE u.email = lower(t.email) AND NOT u.is_deleted
       AND (u.role <> 'superadmin' OR u.status <> 'active')
    RETURNING u.email
)
SELECT t.email,
       CASE WHEN u.id IS NULL THEN 'not invited yet'
            WHEN u.role = 'superadmin' OR p.email IS NOT NULL THEN 'superadmin'
            ELSE u.role END AS result
  FROM team t
  LEFT JOIN app_user u ON u.email = lower(t.email)
  LEFT JOIN promoted p ON p.email = lower(t.email)
 ORDER BY t.email;
