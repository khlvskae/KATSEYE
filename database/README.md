# Hope, Inc. ERP: database

PostgreSQL on Supabase. Everything that builds the database lives here, in run order.

```
database/
├── migrate.sh                    runs everything in order
├── migrations/                   database changes, run once each, in number order
│   ├── 01_tables.sql             professor's HopeDB_audit.sql (tables + data)
│   ├── 02_users_and_rights.sql   accounts, roles, modules, rights
│   ├── 03_password_reset.sql     reset tokens
│   ├── 04_audit_user.sql         audit log shows who is signed in
│   ├── 05_security.sql           who can read / add / edit / delete
│   ├── 06_hr.sql                 Sprint 3: HR views, job history rules, indexes
│   └── 07_sales_and_reports.sql  Sprint 4: sales totals, balances, reports
├── seeds/
│   ├── 01_roles_and_rights.sql   default roles, modules, rights
│   ├── 02_admins.sql             team superadmins
│   └── demo/hr_sample_data.sql   sample HR data (only with --demo)
├── tests/                        each file prints PASS/FAIL and changes nothing
│   ├── test_audit.sql            test_password_reset.sql
│   ├── test_job_history.sql      test_reports.sql
│   └── check_hr_delete.sql       check_sales_delete.sql
├── scripts/backup.sh, restore.sh
├── docs/DATABASE.md              design notes + review checklist
└── dist/hope-all-in-one.sql      everything in one file, for the SQL Editor
```

`TASKS.md` in this folder maps every DB Admin task ID to its file and lines.

## Setup (no Docker)

1. Install the PostgreSQL client, version 17 or newer:
   - Mac: `brew install postgresql@17`, then run the `echo 'export PATH=…'` line brew prints
   - Windows: install PostgreSQL from postgresql.org, tick **Command Line Tools**, and run the scripts in **Git Bash**
2. Get your connection string from Supabase → **Connect** → **Session pooler**, and put your database password in it.
3. Run:
   ```bash
   cd database
   export HOPE_DB_URL='postgresql://postgres.xxxx:PASSWORD@aws-0-xx.pooler.supabase.com:5432/postgres'
   ./migrate.sh            # build or update the database
   ./migrate.sh --test     # every test should say PASS
   ```

| Command | What it does |
|---|---|
| `./migrate.sh` | Applies any new migrations (each in one transaction), then the seeds |
| `./migrate.sh --status` | Lists applied / pending migrations, and flags any edited after applying |
| `./migrate.sh --demo` | Also loads `seeds/demo/` |
| `./migrate.sh --test` | Runs `tests/`; exits with an error if any row says FAIL |
| `./migrate.sh --rebuild` | **Wipes** the public schema and builds from 01 (asks you to type REBUILD) |
| `./migrate.sh --bundle` | Writes `dist/hope-all-in-one.sql` (no database needed) |
| `scripts/backup.sh` | Saves `backups/hope-YYYYMMDD-HHMM.dump` |
| `scripts/restore.sh <file>` | Restores a backup (asks you to type RESTORE) |

### Without the command line

On a **new, empty** Supabase project, open **SQL Editor**, paste all of `dist/hope-all-in-one.sql`, and click **Run**. Then run each file in `tests/` the same way.

### Team superadmins (no passwords in the repo)

1. Supabase → Authentication → Users → **Invite user** for each team member.
2. Put the emails in `seeds/02_admins.sql`.
3. Run `./migrate.sh` again. The result lists each email as `superadmin` or `not invited yet`.

## Rules for changing the database

- Never edit a migration that has already been applied. Add a new `08_something.sql` instead. `--status` shows `CHANGED` if someone did.
- Never commit `HOPE_DB_URL`, passwords, the service_role key or `backups/`.
- Run `./migrate.sh --test` before you push.
