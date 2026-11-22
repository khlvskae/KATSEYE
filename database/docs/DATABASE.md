Hope, Inc. ERP – Database Documentation

Prepared by: Khrisz Cortez, Database Administrator

1. Introduction

The Hope, Inc. ERP database stores the company's employee, customer, product, sales, and payment records. It also manages user accounts and controls what each user is allowed to do. The database runs on PostgreSQL through Supabase.

2. Tables
Group	Tables	Description	File
Human Resources	employee, department, job, jobhistory	Employees, departments, job titles, and job changes	01
Sales	customer, product, pricehist, sales, salesdetail, payment	Customers, products, prices, sales, line items, and payments	01
History	audit_log	Record of every add, edit, delete, and restore	01
Accounts	app_user, user_permission	User accounts and the rights given to each user	02
Reference	role, module, rights	List of roles, modules, and available rights	02
Security	password_reset_token	Password reset tokens	03

All business tables include two additional columns from the professor's script:

is_deleted – Records are not permanently deleted. They are marked as deleted so they can be restored later.
stamp – Shows the last action, the user who did it, and the date and time (for example, EDIT jdelacruz 2026-11-06 12:08 PM).

Each table also has an _active view (for example, employee_active) that shows only the records that are not deleted.

3. Views and Functions
Name	Description	File
employee_current_job	Current job, department, and salary of each employee	06
employee_job_as_of(date)	Job, department, and salary of each employee on a given date	06
department_headcount	Number of employees and total salary per department	06
admin_link_employee(), app_user_employee	Links a user account to an employee record	06
price_on(product, date)	Price of a product on a given date	07
price_history_of(product)	All prices of a product, with the date each price was valid until	10
product_active_price	Active products with their current price	09
sales_line_amount, sales_total	Amount of each line item and total of each sale	07
payment_balance, customer_balance	Amount paid and remaining balance per sale and per customer	07
report_...()	Seven reports: Product Master List, Active Employees, All Employees, Employee Job History, Top Customers, Top Products, and Top Sales	07
audit_log_search()	Searches the audit log by table, action, user, and date	07
search_customers(), search_products()	Searches customers and products by any part of the name	08
issue_password_reset_token(), consume_password_reset_token()	Creates and validates password reset tokens	03
admin_save_user(), admin_set_rights()	Updates user details and rights from the Users page	02
4. Security
Login – Supabase Auth handles login and passwords. Passwords are hashed and are never stored in our own tables.
Account status – New accounts start as pending and must be approved. Only active accounts can use the system. Accounts can also be blocked or disapproved.
Roles
Superadmin – has all rights, manages all accounts, and can view the audit log.
Admin – has all rights and manages user accounts, but cannot manage superadmins.
User – has only the rights assigned to them.
Viewing records – Row Level Security (RLS) is enabled on every table. Users can only see records they have a view right for.
Changing records – A trigger checks the user's add, edit, or delete right on every change. This means the database blocks the action even if the button is not hidden on the website.
Deleting records – Permanent deletes are blocked. A record cannot be deleted while it is still used by another active record (for example, a customer that still has sales).
Validation – Pay term must be COD, 30D, or 45D, and unit must be pc, ea, mtr, pkg, or ltr. Customer names and product descriptions cannot be blank.
Job history – An employee cannot have two job changes on the same date, and the date cannot be before the hire date or after the separation date.
Audit log – Every add, edit, delete, and restore is saved in the audit log together with the username of the person who made the change.
Superadmin protection – The last active superadmin cannot be removed, blocked, or changed to another role.
5. Indexes

Indexes were added to make searching and filtering faster. They were tested using tests/check_search_speed.sql.

Index	Purpose
Customer name, customer address, product description (trigram)	Fast "contains" searches, such as searching "medical" in customer names
Customer name, product description (regular)	Fast sorting and exact matching by name
Sales, sales detail, payment, price history, job history	Fast lookups by customer, product, employee, and date
Audit log	Fast filtering by table and date

Index tuning: We also tested indexes on customer pay term and product unit. The test showed that the database did not use them because these columns only have 3 and 5 possible values. Since they did not improve performance, these indexes were removed.

6. Testing

Each test file shows a PASS or FAIL result for every check. The tests undo all their changes, so they are safe to run on the live database.

How to run a test:

Open the test file in VS Code and copy everything.
In Supabase, open SQL Editor → New query, paste it, and click Run.
Every row in the result should say PASS.
Test File	What It Checks	Result
test_audit.sql	The audit log records the logged-in user	4/4 PASS
test_password_reset.sql	Reset tokens are hashed, expire, and can only be used once	7/7 PASS
test_job_history.sql	Job history date rules	5/5 PASS
check_hr_delete.sql	Employees, departments, and jobs in use cannot be deleted	8/8 PASS
check_sales_delete.sql	Sales with items or payments, and customers or products in use, cannot be deleted	7/7 PASS
test_reports.sql	Sales totals, balances, reports, and audit log search are correct	13/13 PASS
check_search_speed.sql	Search indexes are used and searches are fast	9/9 PASS
check_customer_product_rules.sql	Pay term, unit, and blank-name rules; product price view and price history	7/7 PASS
Total		60/60 PASS
7. Final Review Checklist
[x] All migrations have been run (./migrate.sh --status)
[x] A backup was created using scripts/backup.sh
[x] The database was rebuilt from scratch, and all tests passed
[x] The rebuild was repeated to confirm that the scripts can be run again
[x] The backup was restored and the record counts were checked (82 customers, 32 employees, 57 products, 124 sales, 165 payments)
[x] No passwords or secret keys are stored in the repository
[x] dist/hope-inc.sql (full database file) is up to date
[ ] The rights list (41) has been compared with the course guide (36)
8. Change Log
Sprint	File	What was added
1	01_tables.sql	Professor's base tables, sample data, audit log, and soft delete
1	02_users_and_rights.sql	User accounts, roles, modules, and rights
1	03_password_reset.sql	Password reset tokens
1	04_audit_user.sql	Audit log records the logged-in user
1	05_security.sql	View, add, edit, and delete rights on every table
2	08_customer_product.sql	Customer and product search indexes and search functions
2	09_product_current_price.sql	product_active_price view
2	10_price_history.sql	price_history_of() function
2	11_name_not_blank.sql	Customer names and product descriptions cannot be blank
3	06_hr.sql	HR views, job history rules, account-to-employee link, and indexes
4	07_sales_and_reports.sql	Sales totals, payment balances, reports, and audit log search

The file numbers show the order the files run in, not the sprint they belong to.