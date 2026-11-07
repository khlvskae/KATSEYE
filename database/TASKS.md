# DB Admin tasks → code

Paths are relative to `database/`. Line numbers are for this commit.
Every row was checked by a fresh rebuild plus `./migrate.sh --test` (all PASS).

## Sprint 1

| Task | File | Lines | What's there |
|---|---|---|---|
| **S1-DBA-01** Migration setup | `migrate.sh` | 88–94 | `schema_migrations` table (filename + checksum) |
| | | 108–128 | Apply each new migration in one transaction |
| | | 68–86 | `--rebuild` (wipe + rebuild, asks first) |
| | | 41–56 | `--bundle` → `dist/hope-all-in-one.sql` |
| | `README.md` | all | Setup without Docker |
| **S1-DBA-02** Base HOPE tables | `migrations/01_tables.sql` | 13–1006 | 10 tables + data (`employee` 13, `department` 54, `job` 67, `jobHistory` 85, `customer` 148, `sales` 237, `product` 369, `salesDetail` 431, `payment` 751, `priceHist` 922) |
| | | 1008–1192 | Audit trail and soft delete (`audit_log` 1008, stamp 1031, child check 1092, attached 1137) |
| **S1-DBA-03** Users / roles / rights tables | `migrations/02_users_and_rights.sql` | 1–17 | `role`, `module`, `rights` |
| | | 19–39 | `app_user`, `user_permission` |
| | | 41–43 | Link `app_user.empno` to `employee` |
| | | 45–63 | Stamp / no-delete / audit triggers on the account tables |
| | | 68–91 | `my_role()`, `has_right()` |
| | | 93–107 | New sign-ups become pending accounts |
| | | 109–125 | Last-superadmin guard |
| | | 127–188 | `admin_save_user`, `admin_set_rights` |
| | | 190–214 | Who can see accounts (row-level security) |
| | `migrations/05_security.sql` | 1–49 | `trg_check_rights`: add / edit / delete rights on every change |
| | | 51–117 | Row-level security + triggers on the 10 tables |
| **S1-DBA-04** Password reset tokens | `migrations/03_password_reset.sql` | 1–14 | `password_reset_token` table (hash only) |
| | | 16–19 | `reset_token_hash()` SHA-256 |
| | | 21–44 | `issue_password_reset_token(email, minutes)` |
| | | 46–67 | `consume_password_reset_token(token)` |
| | `tests/test_password_reset.sql` | all | 7 checks |
| **S1-DBA-05** Seed roles & superadmins | `seeds/01_roles_and_rights.sql` | 1, 7, 15 | 3 roles, 5 modules, 41 rights |
| | `seeds/02_admins.sql` | 1–25 | Add existing sign-ups, promote the team's emails (no passwords) |
| **S1-DBA-06** Audit logs the logged-in user | `migrations/04_audit_user.sql` | 1–15 | `audit_user()`: logged-in user → `app.username` → DB login |
| | `tests/test_audit.sql` | all | 4 checks |

## Sprint 3

| Task | File | Lines | What's there |
|---|---|---|---|
| **S3-DBA-01** Current job / department views | `migrations/06_hr.sql` | 1 | `employee_current_job` |
| | | 23 | `employee_job_as_of(date)` |
| | | 39 | `department_headcount` |
| **S3-DBA-02** Job history validation | same file | 54–91 | `trg_jobhistory_validate` (hire date 68, same-day change 77) |
| | | 93–96 | Trigger |
| | | 98 | Unique index: one change per employee per day |
| | `tests/test_job_history.sql` | all | 5 checks |
| **S3-DBA-03** Link `app_user.empno` | same file | 101 | One account per employee |
| | | 104–132 | `admin_link_employee(user, empno)` |
| | | 134 | `app_user_employee` view |
| **S3-DBA-04** Verify delete checks | `tests/check_hr_delete.sql` | all | 8 checks (employee, department, job) |
| **S3-DBA-05** HR sample data | `seeds/demo/hr_sample_data.sql` | 3, 7, 12, 20 | Department, jobs, 5 employees, job histories (`./migrate.sh --demo`) |
| **S3-DBA-06** Indexes + backup/restore | `migrations/06_hr.sql` | 145–157 | 13 indexes |
| | `scripts/backup.sh` | 29 | `pg_dump` |
| | `scripts/restore.sh` | 35, 47 | Re-link sign-up trigger, `pg_restore` |

## Sprint 4

| Task | File | Lines | What's there |
|---|---|---|---|
| **S4-DBA-01** Sales totals query | `migrations/07_sales_and_reports.sql` | 1 | `price_on(prodcode, date)` |
| | | 9 | `sales_line_amount` view |
| | | 29 | `sales_total` view |
| **S4-DBA-02** Payment balance view | same file | 45 | `payment_balance` (Paid / Open / Overpaid) |
| | | 62 | `customer_balance` |
| **S4-DBA-03** Report queries | same file | 72 | `report_product_master()` |
| | | 81 | `report_employees(active_only)` |
| | | 93 | `report_employee_job_history(empno)` |
| | | 104, 115, 126 | `report_top_customers / products / sales(from, to, n)` |
| **S4-DBA-04** Audit log query with filters | same file | 136–183 | `audit_log_search(table, action, user, record, from, to, limit)` |
| | `tests/test_reports.sql` | all | 13 checks for S4-DBA-01..04 |
| **S4-DBA-05** Verify sales delete rules | `tests/check_sales_delete.sql` | all | 7 checks |
| **S4-DBA-06** Review & rebuild checklist | `docs/DATABASE.md` | "Rebuild, backup and review checklist" | Checklist + last run result |
| | `migrate.sh` | 143–154 | `--test` fails on any FAIL row |
