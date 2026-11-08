# DB Admin Tasks

**Prepared by:** Khrisz Cortez, Database Administrator

This document lists each DB Admin task and where its code can be found. All file paths are
inside the `database` folder. Line numbers are based on the latest version in the repository.

## Sprint 1

| Task ID | Task | File | Lines | Description |
|---|---|---|---|---|
| S1-DBA-01 | Database setup and migration script | `migrate.sh` | 88–94 | Table that tracks which migrations have been run |
| | | | 108–128 | Runs new migration files in order |
| | | | 68–86 | Rebuild option |
| | | `README.md` | – | Setup guide for the team |
| S1-DBA-02 | HOPE base tables and sample data | `migrations/01_tables.sql` | 13–1006 | Ten tables and their sample data (professor's script) |
| | | | 1008–1192 | Audit log, stamp, and soft delete triggers |
| S1-DBA-03 | Users, roles, modules, and rights | `migrations/02_users_and_rights.sql` | 1–17 | `role`, `module`, and `rights` tables |
| | | | 19–39 | `app_user` and `user_permission` tables |
| | | | 68–91 | `my_role()` and `has_right()` functions |
| | | | 93–107 | New sign-ups are set to pending |
| | | | 109–125 | Protection for the last superadmin |
| | | | 127–188 | Functions for updating users and rights |
| | | | 190–214 | Access rules for the account tables |
| | | `migrations/05_security.sql` | 1–49 | Checks add, edit, and delete rights on every change |
| | | | 51–117 | View rights on the ten business tables |
| S1-DBA-04 | Password reset token table | `migrations/03_password_reset.sql` | 1–14 | Token table (hashed, with expiry and used flag) |
| | | | 21–44 | Creates a new token |
| | | | 46–67 | Validates and uses a token |
| | | `tests/test_password_reset.sql` | – | 7 tests |
| S1-DBA-05 | Seed data | `seeds/01_roles_and_rights.sql` | 1–57 | 3 roles, 5 modules, and 41 rights |
| | | `seeds/02_admins.sql` | – | Assigns 1 superadmin and 4 admins |
| S1-DBA-06 | Record the logged-in user in the audit log | `migrations/04_audit_user.sql` | 1–15 | `audit_user()` function |
| | | `tests/test_audit.sql` | – | 4 tests |

## Sprint 2

| Task ID | Task | File | Lines | Description |
|---|---|---|---|---|
| S2-DBA-01 | Customer and product active views and indexes | `migrations/01_tables.sql` | 1181–1182 | `customer_active` and `product_active` views |
| | | `migrations/08_customer_product.sql` | 3–4 | Indexes on customer and product names |
| S2-DBA-02 | Current price as of a given date | `migrations/07_sales_and_reports.sql` | 1–7 | `price_on()` function |
| S2-DBA-03 | Validation constraints (payTerms, unit) | `migrations/01_tables.sql` | 151–152, 371–372 | Allowed values for pay term and unit |
| S2-DBA-04 | Child-record delete checks for customer and product | `tests/check_sales_delete.sql` | – | Tests 5 and 6 |
| S2-DBA-05 | Customer, product, and price history demo data | `seeds/demo/customer_product_sample_data.sql` | – | 5 customers, 5 products, and 10 prices |
| S2-DBA-06 | Search performance check and index tuning | `migrations/08_customer_product.sql` | 6–8 | Search indexes for "contains" searches |
| | | | 10–29 | `search_customers()` and `search_products()` functions |
| | | `tests/check_search_speed.sql` | – | 9 tests on index usage and search speed |

## Sprint 3

| Task ID | Task | File | Lines | Description |
|---|---|---|---|---|
| S3-DBA-01 | Employee current job and department | `migrations/06_hr.sql` | 1–21 | `employee_current_job` view |
| | | | 23–37 | `employee_job_as_of()` function |
| | | | 39–52 | `department_headcount` view |
| S3-DBA-02 | Job history validation | `migrations/06_hr.sql` | 54–96 | Validation of job history dates |
| | | | 98 | One job change per employee per day |
| | | `tests/test_job_history.sql` | – | 5 tests |
| S3-DBA-03 | Link `app_user.empno` to employee | `migrations/06_hr.sql` | 101 | One account per employee |
| | | | 104–132 | `admin_link_employee()` function |
| | | | 134 | `app_user_employee` view |
| S3-DBA-04 | Child-record delete checks for employee, department, and job | `tests/check_hr_delete.sql` | – | 8 tests |
| S3-DBA-05 | HR demo data | `seeds/demo/hr_sample_data.sql` | – | 1 department, 2 jobs, and 5 employees |
| S3-DBA-06 | Indexes and backup/restore script | `migrations/06_hr.sql` | 145–157 | 13 indexes |
| | | `scripts/backup.sh` | 29 | Backup command |
| | | `scripts/restore.sh` | 47 | Restore command |

## Sprint 4

| Task ID | Task | File | Lines | Description |
|---|---|---|---|---|
| S4-DBA-01 | Sales totals and line amounts | `migrations/07_sales_and_reports.sql` | 9–27 | Amount per line item |
| | | | 29–43 | Total per sale |
| S4-DBA-02 | Payment balance view | `migrations/07_sales_and_reports.sql` | 45–60 | Balance per sale (Paid, Open, Overpaid) |
| | | | 62–70 | Balance per customer |
| S4-DBA-03 | Report queries | `migrations/07_sales_and_reports.sql` | 72–134 | Seven report functions |
| S4-DBA-04 | Audit log query with filters | `migrations/07_sales_and_reports.sql` | 136–183 | Search by table, action, user, and date |
| | | `tests/test_reports.sql` | – | 13 tests for S4-DBA-01 to S4-DBA-04 |
| S4-DBA-05 | Delete rules for sales with details or payments | `tests/check_sales_delete.sql` | – | 7 tests |
| S4-DBA-06 | Final database review | `docs/DATABASE.md` | – | Final review checklist |
