INSERT INTO role VALUES
    ('superadmin', 'Superadmin'),
    ('admin', 'Admin'),
    ('user', 'User')
ON CONFLICT DO NOTHING;

INSERT INTO module VALUES
    ('customers', 'Customer', 1),
    ('products', 'Product', 2),
    ('hr', 'Human Resources', 3),
    ('sales', 'Sales', 4),
    ('reports', 'Reports', 5)
ON CONFLICT DO NOTHING;

INSERT INTO rights VALUES
    ('customers.view', 'customers', 'View Customers', 1),
    ('customers.add', 'customers', 'Add Customer', 2),
    ('customers.edit', 'customers', 'Edit Customer', 3),
    ('customers.delete', 'customers', 'Delete Customer', 4),
    ('products.view', 'products', 'View Products', 1),
    ('products.add', 'products', 'Add Product', 2),
    ('products.edit', 'products', 'Edit Product', 3),
    ('products.delete', 'products', 'Delete Product', 4),
    ('products.priceAdd', 'products', 'Add Price', 5),
    ('products.priceEdit', 'products', 'Edit Price', 6),
    ('products.priceDelete', 'products', 'Delete Price', 7),
    ('hr.view', 'hr', 'View Human Resources', 1),
    ('hr.jobAdd', 'hr', 'Add Job', 2),
    ('hr.jobEdit', 'hr', 'Edit Job', 3),
    ('hr.jobDelete', 'hr', 'Delete Job', 4),
    ('hr.deptAdd', 'hr', 'Add Department', 5),
    ('hr.deptEdit', 'hr', 'Edit Department', 6),
    ('hr.deptDelete', 'hr', 'Delete Department', 7),
    ('hr.empAdd', 'hr', 'Add Employee', 8),
    ('hr.empEdit', 'hr', 'Edit Employee', 9),
    ('hr.empDelete', 'hr', 'Delete Employee', 10),
    ('hr.jhView', 'hr', 'View Job History', 11),
    ('hr.jhAdd', 'hr', 'Add Job History', 12),
    ('hr.jhEdit', 'hr', 'Edit Job History', 13),
    ('hr.jhDelete', 'hr', 'Delete Job History', 14),
    ('sales.view', 'sales', 'View Sales', 1),
    ('sales.add', 'sales', 'Add Sale', 2),
    ('sales.edit', 'sales', 'Edit Sale', 3),
    ('sales.delete', 'sales', 'Delete Sale', 4),
    ('sales.detailView', 'sales', 'View Sale Details', 5),
    ('sales.detailAdd', 'sales', 'Add Sale Detail', 6),
    ('sales.detailEdit', 'sales', 'Edit Sale Detail', 7),
    ('sales.detailDelete', 'sales', 'Delete Sale Detail', 8),
    ('reports.view', 'reports', 'View Reports', 1),
    ('reports.topCustomers', 'reports', 'Top Customers', 2),
    ('reports.productMaster', 'reports', 'Product Master List', 3),
    ('reports.topProducts', 'reports', 'Top Products', 4),
    ('reports.activeEmployees', 'reports', 'Active Employees', 5),
    ('reports.allEmployees', 'reports', 'All Employees', 6),
    ('reports.empJobHistory', 'reports', 'Employee Job History', 7),
    ('reports.topSales', 'reports', 'Top Sales', 8)
ON CONFLICT DO NOTHING;

SELECT 'roles' AS seeded, count(*) FROM role
UNION ALL SELECT 'modules', count(*) FROM module
UNION ALL SELECT 'rights', count(*) FROM rights;
