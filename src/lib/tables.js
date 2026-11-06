// Screen fields ⇄ PostgreSQL columns for each Hope, Inc. table.
// PostgreSQL stores unquoted names in lowercase (custNo → custno).
const nn = v => (v === '' || v === undefined ? null : v);

export const TABLES = {
  customers: {
    table: 'customer', keys: ['custno'],
    toDb: r => ({ custno: r.custNo, custname: r.custName, address: r.address, payterm: r.payterms, is_deleted: !!r.isDeleted }),
    fromDb: d => ({ custNo: d.custno, custName: d.custname, address: d.address, payterms: d.payterm, isDeleted: d.is_deleted, stamp: d.stamp }),
  },
  products: {
    table: 'product', keys: ['prodcode'],
    toDb: r => ({ prodcode: r.prodCode, description: r.description, unit: r.unit, is_deleted: !!r.isDeleted }),
    fromDb: d => ({ prodCode: d.prodcode, description: d.description, unit: d.unit, isDeleted: d.is_deleted, stamp: d.stamp }),
  },
  prices: {
    table: 'pricehist', keys: ['effdate', 'prodcode'],
    toDb: r => ({ effdate: r.effDate, prodcode: r.prodCode, unitprice: Number(r.unitPrice), is_deleted: !!r.isDeleted }),
    fromDb: d => ({ effDate: d.effdate, prodCode: d.prodcode, unitPrice: Number(d.unitprice), isDeleted: d.is_deleted, stamp: d.stamp }),
  },
  employees: {
    table: 'employee', keys: ['empno'],
    toDb: r => ({ empno: r.empNo, lastname: r.lastName, firstname: r.firstName, gender: r.gender, birthdate: nn(r.birthDate), hiredate: nn(r.hireDate), sepdate: nn(r.sepDate), is_deleted: !!r.isDeleted }),
    fromDb: d => ({ empNo: d.empno, lastName: d.lastname, firstName: d.firstname, gender: d.gender, birthDate: d.birthdate || '', hireDate: d.hiredate || '', sepDate: d.sepdate || '', isDeleted: d.is_deleted, stamp: d.stamp }),
  },
  jobs: {
    table: 'job', keys: ['jobcode'],
    toDb: r => ({ jobcode: r.jobCode, jobdesc: r.jobDesc, is_deleted: !!r.isDeleted }),
    fromDb: d => ({ jobCode: d.jobcode, jobDesc: d.jobdesc, isDeleted: d.is_deleted, stamp: d.stamp }),
  },
  depts: {
    table: 'department', keys: ['deptcode'],
    toDb: r => ({ deptcode: r.deptCode, deptname: r.deptName, is_deleted: !!r.isDeleted }),
    fromDb: d => ({ deptCode: d.deptcode, deptName: d.deptname, isDeleted: d.is_deleted, stamp: d.stamp }),
  },
  jobHist: {
    table: 'jobhistory', keys: ['empno', 'jobcode', 'effdate'],
    toDb: r => ({ empno: r.empNo, jobcode: r.jobCode, effdate: r.effDate, salary: Number(r.salary), deptcode: nn(r.deptCode), is_deleted: !!r.isDeleted }),
    fromDb: d => ({ empNo: d.empno, jobCode: d.jobcode, effDate: d.effdate, salary: Number(d.salary), deptCode: d.deptcode, isDeleted: d.is_deleted, stamp: d.stamp }),
  },
  sales: {
    table: 'sales', keys: ['transno'],
    toDb: r => ({ transno: r.transNo, salesdate: nn(r.salesDate), custno: r.custNo, empno: r.empNo, is_deleted: !!r.isDeleted }),
    fromDb: d => ({ transNo: d.transno, salesDate: d.salesdate || '', custNo: d.custno, empNo: d.empno, isDeleted: d.is_deleted, stamp: d.stamp }),
  },
  sDetails: {
    table: 'salesdetail', keys: ['transno', 'prodcode'],
    toDb: r => ({ transno: r.transNo, prodcode: r.prodCode, quantity: Number(r.quantity), is_deleted: !!r.isDeleted }),
    fromDb: d => ({ transNo: d.transno, prodCode: d.prodcode, quantity: Number(d.quantity), isDeleted: d.is_deleted, stamp: d.stamp }),
  },
  payments: {
    table: 'payment', keys: ['orno'],
    toDb: r => ({ orno: r.orNo, paydate: nn(r.payDate), amount: Number(r.amount), transno: r.transNo, is_deleted: !!r.isDeleted }),
    fromDb: d => ({ orNo: d.orno, payDate: d.paydate || '', amount: Number(d.amount), transNo: d.transno, isDeleted: d.is_deleted, stamp: d.stamp }),
  },
};

// The key of a screen row, e.g. "C0001" or "TR000001|AD0001"
export function rowKey(name, row) {
  const d = TABLES[name].toDb(row);
  return TABLES[name].keys.map(k => d[k]).join('|');
}

// Database limits, used for maxLength on inputs
export const LIMITS = {
  custNo: 5, custName: 20, address: 50,
  prodCode: 6, description: 30,
  empNo: 5, lastName: 15, firstName: 15,
  jobCode: 4, jobDesc: 20, deptCode: 3, deptName: 20,
  transNo: 8, orNo: 8,
};
export const PAY_TERMS = ['COD', '30D', '45D'];
export const UNITS = ['pc', 'ea', 'mtr', 'pkg', 'ltr'];
