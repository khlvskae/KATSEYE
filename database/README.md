# Hope, Inc. ERP – Database

**Prepared by:** Khrisz Cortez, Database Administrator
**Course:** Information Management
**Database:** PostgreSQL (Supabase)

## Overview

This folder contains all the SQL files used to build the Hope, Inc. ERP database. The base
tables and sample data come from our professor's `HopeDB_audit.sql` script. On top of that,
we added user accounts, access rights, and the queries needed for Sprints 2 to 4.

## Folder Structure

| File / Folder | Description |
|---|---|
| `migrations/` | SQL files that build the database, run in number order (01 to 08) |
| `seeds/` | Starting data: roles, modules, rights, and team accounts |
| `seeds/demo/` | Sample customers, products, and employees for testing |
| `tests/` | Test scripts that show PASS or FAIL for each feature |
| `scripts/` | Backup and restore scripts |
| `dist/hope-all-in-one.sql` | All migrations and seeds combined into one file |
| `docs/DATABASE.md` | Database documentation |
| `TASKS.md` | List of DB Admin tasks and where to find the code for each |
| `migrate.sh` | Script that runs the migrations and seeds in the correct order |

### Migration Files

| File | Sprint | Description |
|---|---|---|
| `01_tables.sql` | 1 | Base tables, sample data, audit log, and soft delete (professor's script) |
| `02_users_and_rights.sql` | 1 | User accounts, roles, modules, and rights |
| `03_password_reset.sql` | 1 | Password reset tokens |
| `04_audit_user.sql` | 1 | Records the logged-in user in the audit log |
| `05_security.sql` | 1 | Permission checks for viewing, adding, editing, and deleting |
| `06_hr.sql` | 3 | HR views, job history rules, and indexes |
| `07_sales_and_reports.sql` | 4 | Sales totals, payment balances, reports, and audit log search |
| `08_customer_product.sql` | 2 | Customer and product search indexes |

The number at the start of each file name sets the order in which the files are run.
The tables must be created first, so the order should not be changed.

## Setup

### Option 1: Supabase SQL Editor

1. Open the Supabase project and go to **SQL Editor**.
2. Copy the contents of `dist/hope-all-in-one.sql`, paste them into a new query, and click **Run**.
3. Run each file in the `tests` folder to check the setup. All rows should show **PASS**.

> **Note:** This option re-creates the tables and resets the business data to the sample data.
> Use it only on a new project or when a full reset is intended.

### Option 2: Migration Script

This option requires the PostgreSQL command-line tool (`psql`).

- **Mac:** `brew install postgresql@17`
- **Windows:** Install PostgreSQL from postgresql.org, select **Command Line Tools**, and use **Git Bash**.

Copy the connection string from Supabase → **Connect** → **Session pooler**, then run:

```bash
cd database
export HOPE_DB_URL='postgresql://postgres.xxxx:PASSWORD@aws-0-xx.pooler.supabase.com:5432/postgres'
./migrate.sh           # builds or updates the database
./migrate.sh --test    # runs all tests
```

| Command | Description |
|---|---|
| `./migrate.sh` | Runs any new migration files, then the seeds |
| `./migrate.sh --status` | Shows which migration files have already been run |
| `./migrate.sh --demo` | Also loads the sample data in `seeds/demo` |
| `./migrate.sh --test` | Runs all test files |
| `./migrate.sh --rebuild` | Deletes and rebuilds the whole database (asks for confirmation) |
| `./migrate.sh --bundle` | Creates a new `dist/hope-all-in-one.sql` |
| `scripts/backup.sh` | Saves a backup of the database |
| `scripts/restore.sh <file>` | Restores the database from a backup |

## Team Accounts

| Role | Members |
|---|---|
| Superadmin | Khrisz Cortez |
| Admin | Ylthea Villanueva, Ashley Dobles, Norminah Pampa, Zyrian Acorda |

Passwords are not stored in any SQL file. To add the team accounts:

1. In Supabase, go to **Authentication → Users → Invite user** and invite each member.
2. Each member opens the email invitation and sets their own password.
3. Run `seeds/02_admins.sql` to assign the roles.

## Guidelines

- Do not edit a migration file that has already been run. Create a new file instead (for example, `09_new_change.sql`).
- Do not upload passwords, the `.env` file, or backup files to GitHub.
- Run the tests before pushing any changes.
