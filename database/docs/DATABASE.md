# Hope, Inc. ERP: database design

## Tables

| Group | Tables | From |
|---|---|---|
| HR | `employee`, `department`, `job`, `jobhistory` | 01 |
| Sales | `customer`, `sales`, `salesdetail`, `payment`, `product`, `pricehist` | 01 |
| History | `audit_log` (append-only) | 01 |
| Accounts | `app_user` (1:1 with Supabase `auth.users`), `user_permission` | 02 |
| Lookups | `role`, `module`, `rights` | 02 + seeds/01 |
| Password reset | `password_reset_token` (hash only) | 03 |
| Tooling | `schema_migrations` (filename, checksum, applied_at) | migrate.sh |

Every business table has `is_deleted` (soft delete) and `stamp` (e.g. `EDIT jdoe 2026-11-06 12:08 PM`), plus a `<table>_active` view.

## Views and functions

| Name | Purpose | From |
|---|---|---|
| `employee_current_job`, `employee_job_as_of(date)`, `department_headcount` | Current / historical job and department | 06 |
| `app_user_employee`, `admin_link_employee(user, empno)` | Account ↔ employee link | 06 |
| `price_on(prodcode, date)` | Unit price in force on a date | 07 |
| `sales_line_amount`, `sales_total` | Line amounts and transaction totals | 07 |
| `payment_balance`, `customer_balance` | Paid / balance / status (Paid, Open, Overpaid) | 07 |
| `report_product_master()`, `report_employees(active_only)`, `report_employee_job_history(empno)`, `report_top_customers/products/sales(from, to, n)` | Reports | 07 |
| `audit_log_search(table, action, user, record, from, to, limit)` | Filtered audit log with a field-by-field diff | 07 |
| `issue_password_reset_token(email, minutes)`, `consume_password_reset_token(token)` | Reset tokens | 03 |
| `admin_save_user`, `admin_set_rights` | Admin-only account changes | 02 |

All views use `security_invoker`, so they obey the reader's row-level security.

## Security model

1. **Who is signed in**: Supabase Auth. The website only ever uses the anon key. `auth.uid()` identifies the user in every query.
2. **Account state**: `app_user.status` is pending, active, blocked or disapproved. Only active accounts get any rights (`my_role()`, `has_right()`).
3. **Reading**: RLS on every table. A row is visible if the user has any right on that module.
4. **Writing**: `trg_check_rights` runs BEFORE INSERT/UPDATE and checks the add, edit or delete right, so hiding a button is never the only protection.
5. **Integrity**: hard DELETE and TRUNCATE are blocked; a parent can't be soft-deleted while it has active children (`trg_check_children`); job history is validated (`trg_jobhistory_validate`).
6. **History**: `trg_audit_log` writes every change with `action_by = audit_user()`. That is the signed-in user, then `app.username`, then the database login.
7. **Admin**: `trg_last_superadmin` stops the last active superadmin from being removed or demoted.

## Rebuild, backup and review checklist (S4-DBA-06)

Before a release or a demo:

- [ ] `./migrate.sh --status`: nothing pending, nothing `CHANGED`
- [ ] `scripts/backup.sh` against the live project; keep the `.dump` off GitHub
- [ ] Rebuild a **spare** Supabase project or local database from scratch: `./migrate.sh --rebuild --test`. Every test says PASS.
- [ ] Run `./migrate.sh --rebuild` a second time; it must succeed again (scripts are repeatable)
- [ ] Restore the backup onto the spare: `scripts/restore.sh backups/<file>.dump`. Spot-check counts: 82 customers, 32 employees, 57 products, 124 sales, 165 payments
- [ ] Rights catalogue in `seeds/01_roles_and_rights.sql` matches `src/lib/rights.js` and guide 3.8 (currently 41 vs 36: **to confirm**)
- [ ] No secrets in the repo: `git grep -nE "service_role|postgresql://.*:.*@"` finds only the `xxxx:PASSWORD` placeholders
- [ ] `./migrate.sh --bundle` and commit the refreshed `dist/hope-all-in-one.sql`

Last full run: rebuilt twice from scratch, 44/44 test rows PASS, backup → change → restore returned the original data.
