// Rights catalogue. Must match the "rights" table in hope-inc-database.sql.
export const ALL_PERMS = {
  'customers.view': 'View Customers', 'customers.add': 'Add Customer', 'customers.edit': 'Edit Customer', 'customers.delete': 'Delete Customer',
  'products.view': 'View Products', 'products.add': 'Add Product', 'products.edit': 'Edit Product', 'products.delete': 'Delete Product',
  'products.priceAdd': 'Add Price', 'products.priceEdit': 'Edit Price', 'products.priceDelete': 'Delete Price',
  'hr.view': 'View Human Resources', 'hr.jobAdd': 'Add Job', 'hr.jobEdit': 'Edit Job', 'hr.jobDelete': 'Delete Job',
  'hr.deptAdd': 'Add Department', 'hr.deptEdit': 'Edit Department', 'hr.deptDelete': 'Delete Department',
  'hr.empAdd': 'Add Employee', 'hr.empEdit': 'Edit Employee', 'hr.empDelete': 'Delete Employee',
  'hr.jhView': 'View Job History', 'hr.jhAdd': 'Add Job History', 'hr.jhEdit': 'Edit Job History', 'hr.jhDelete': 'Delete Job History',
  'sales.view': 'View Sales', 'sales.add': 'Add Sale', 'sales.edit': 'Edit Sale', 'sales.delete': 'Delete Sale',
  'sales.detailView': 'View Sale Details', 'sales.detailAdd': 'Add Sale Detail', 'sales.detailEdit': 'Edit Sale Detail', 'sales.detailDelete': 'Delete Sale Detail',
  'reports.view': 'View Reports', 'reports.topCustomers': 'Top Customers', 'reports.productMaster': 'Product Master List',
  'reports.topProducts': 'Top Products', 'reports.activeEmployees': 'Active Employees', 'reports.allEmployees': 'All Employees',
  'reports.empJobHistory': 'Employee Job History', 'reports.topSales': 'Top Sales',
};

export const PERM_GROUPS = [
  { key: 'customers', label: 'Customer Management', view: 'customers.view', items: ['customers.add', 'customers.edit', 'customers.delete'] },
  { key: 'products', label: 'Product Management', view: 'products.view',
    items: ['products.add', 'products.edit', 'products.delete', 'products.priceAdd', 'products.priceEdit', 'products.priceDelete'] },
  { key: 'hr', label: 'Human Resources', view: 'hr.view',
    items: ['hr.jobAdd', 'hr.jobEdit', 'hr.jobDelete', 'hr.deptAdd', 'hr.deptEdit', 'hr.deptDelete',
      'hr.empAdd', 'hr.empEdit', 'hr.empDelete', 'hr.jhView', 'hr.jhAdd', 'hr.jhEdit', 'hr.jhDelete'] },
  { key: 'sales', label: 'Sales', view: 'sales.view',
    items: ['sales.add', 'sales.edit', 'sales.delete', 'sales.detailView', 'sales.detailAdd', 'sales.detailEdit', 'sales.detailDelete'] },
  { key: 'reports', label: 'Reports', view: 'reports.view',
    items: ['reports.topCustomers', 'reports.productMaster', 'reports.topProducts', 'reports.activeEmployees',
      'reports.allEmployees', 'reports.empJobHistory', 'reports.topSales'] },
];
