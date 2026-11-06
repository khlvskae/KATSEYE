import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { money, priceOn, saleTotal, todayISO } from '../lib/format';
import { EmptyRow, FilterTabs } from '../components/ui';

const REPORTS = [
  { id: 'topCustomers', label: 'Top Customers', right: 'reports.topCustomers' },
  { id: 'productMaster', label: 'Product Master List', right: 'reports.productMaster' },
  { id: 'topProducts', label: 'Top Products', right: 'reports.topProducts' },
  { id: 'activeEmployees', label: 'Active Employees', right: 'reports.activeEmployees' },
  { id: 'allEmployees', label: 'All Employees', right: 'reports.allEmployees' },
  { id: 'empJobHistory', label: 'Employee Job History', right: 'reports.empJobHistory' },
  { id: 'topSales', label: 'Top Sales', right: 'reports.topSales' },
];

export default function Reports() {
  const { can } = useAuth();
  const allowed = REPORTS.filter(r => can(r.right));
  const [id, setId] = useState(allowed[0]?.id);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [topN, setTopN] = useState(10);
  const [empNo, setEmpNo] = useState('');
  if (!allowed.length) return <div className="empty-state">No reports are assigned to your account.</div>;
  const current = allowed.find(r => r.id === id) || allowed[0];
  const filters = { from, to, topN, empNo, setEmpNo };
  const usesDates = ['topCustomers', 'topProducts', 'topSales'].includes(current.id);

  return (
    <>
      <div className="tab-row no-print">
        <FilterTabs value={current.id} onChange={setId} options={allowed.map(r => ({ value: r.id, label: r.label }))} />
      </div>
      <div className="report-print-area">
        <div className="module-toolbar">
          <h3>{current.label}</h3>
          <div className="toolbar-right no-print">
            {usesDates && (
              <>
                <label className="inline-label">From<input type="date" value={from} onChange={e => setFrom(e.target.value)} /></label>
                <label className="inline-label">To<input type="date" value={to} onChange={e => setTo(e.target.value)} /></label>
                <label className="inline-label">Top N<input type="number" min="1" max="200" value={topN} style={{ width: 80 }}
                  onChange={e => setTopN(Math.max(1, parseInt(e.target.value, 10) || 10))} /></label>
              </>
            )}
            <div className="report-actions" style={{ alignSelf: 'flex-end' }}>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => window.print()}>Print / Save as PDF</button>
            </div>
          </div>
        </div>
        {usesDates && (from || to) && (
          <p style={{ color: 'var(--text-muted)', fontSize: '.9rem', marginBottom: 12 }}>
            Sales from {from || 'the beginning'} to {to || todayISO()}.
          </p>
        )}
        <ReportBody id={current.id} f={filters} />
      </div>
    </>
  );
}

function ReportBody({ id, f }) {
  const d = useData();
  const inRange = s => !s.isDeleted && (!f.from || s.salesDate >= f.from) && (!f.to || s.salesDate <= f.to);
  const details = d.sDetails.filter(x => !x.isDeleted);
  const custName = no => d.customers.find(c => c.custNo === no)?.custName || no;
  const empName = no => { const e = d.employees.find(x => x.empNo === no); return e ? `${e.firstName} ${e.lastName}` : no; };

  if (id === 'topCustomers') {
    const map = {};
    d.sales.filter(inRange).forEach(s => { map[s.custNo] = (map[s.custNo] || 0) + saleTotal(s, details, d.prices); });
    const rows = Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, f.topN);
    return (
      <Table head={['Rank', 'Cust No', 'Customer Name', 'Total Sales']} money={[3]} empty="No sales in this period.">
        {rows.map(([no, total], i) => [i + 1, <strong key="n">{no}</strong>, custName(no), money(total)])}
      </Table>
    );
  }
  if (id === 'productMaster') {
    const today = todayISO();
    const rows = d.products.filter(p => !p.isDeleted).sort((a, b) => a.prodCode.localeCompare(b.prodCode));
    return (
      <Table head={['Prod Code', 'Description', 'Unit', 'Current Price']} money={[3]} empty="No active products.">
        {rows.map(p => { const pr = priceOn(d.prices, p.prodCode, today); return [<strong key="c">{p.prodCode}</strong>, p.description, p.unit, pr ? money(pr) : '—']; })}
      </Table>
    );
  }
  if (id === 'topProducts') {
    const map = {};
    d.sales.filter(inRange).forEach(s => details.filter(x => x.transNo === s.transNo).forEach(x => {
      map[x.prodCode] = map[x.prodCode] || { qty: 0, amount: 0 };
      map[x.prodCode].qty += Number(x.quantity);
      map[x.prodCode].amount += Number(x.quantity) * priceOn(d.prices, x.prodCode, s.salesDate);
    }));
    const desc = c => d.products.find(p => p.prodCode === c)?.description || c;
    const rows = Object.entries(map).sort((a, b) => b[1].amount - a[1].amount).slice(0, f.topN);
    return (
      <Table head={['Rank', 'Prod Code', 'Description', 'Qty Sold', 'Sales Amount']} money={[3, 4]} empty="No sales in this period.">
        {rows.map(([c, v], i) => [i + 1, <strong key="c">{c}</strong>, desc(c), v.qty.toLocaleString(), money(v.amount)])}
      </Table>
    );
  }
  if (id === 'activeEmployees' || id === 'allEmployees') {
    const all = id === 'allEmployees';
    const rows = d.employees.filter(e => !e.isDeleted && (all || !e.sepDate)).sort((a, b) => a.empNo.localeCompare(b.empNo));
    const head = ['Emp No', 'Last Name', 'First Name', 'Gender', 'Birth Date', 'Hire Date', ...(all ? ['Sep Date', 'Status'] : [])];
    return (
      <Table head={head} empty="No employees.">
        {rows.map(e => [<strong key="n">{e.empNo}</strong>, e.lastName, e.firstName, e.gender, e.birthDate || '—', e.hireDate || '—',
          ...(all ? [e.sepDate || '—', e.sepDate ? <span key="s" className="badge badge-deleted">Separated</span> : <span key="s" className="badge badge-active">Active</span>] : [])])}
      </Table>
    );
  }
  if (id === 'empJobHistory') {
    const jobName = c => d.jobs.find(j => j.jobCode === c)?.jobDesc || c;
    const deptName = c => d.depts.find(x => x.deptCode === c)?.deptName || c;
    const rows = d.jobHist.filter(h => h.empNo === f.empNo && !h.isDeleted).sort((a, b) => b.effDate.localeCompare(a.effDate));
    return (
      <>
        <label className="inline-label no-print" style={{ maxWidth: 360, marginBottom: 16 }}>Employee
          <select value={f.empNo} onChange={e => f.setEmpNo(e.target.value)}>
            <option value="">Choose an employee…</option>
            {d.employees.filter(e => !e.isDeleted).sort((a, b) => a.lastName.localeCompare(b.lastName))
              .map(e => <option key={e.empNo} value={e.empNo}>{e.lastName}, {e.firstName} ({e.empNo})</option>)}
          </select>
        </label>
        {f.empNo ? (
          <>
            <p style={{ marginBottom: 12 }}><strong>{empName(f.empNo)}</strong> · Employee {f.empNo}</p>
            <Table head={['Effective Date', 'Job', 'Department', 'Salary']} money={[3]} empty="No job history for this employee.">
              {rows.map(h => [h.effDate, `${h.jobCode} · ${jobName(h.jobCode)}`, h.deptCode ? `${h.deptCode} · ${deptName(h.deptCode)}` : '—', money(h.salary)])}
            </Table>
          </>
        ) : <div className="empty-state">Choose an employee to see their job history.</div>}
      </>
    );
  }
  if (id === 'topSales') {
    const rows = d.sales.filter(inRange).map(s => ({ s, total: saleTotal(s, details, d.prices) }))
      .sort((a, b) => b.total - a.total).slice(0, f.topN);
    return (
      <Table head={['Rank', 'Trans No', 'Date', 'Customer', 'Salesperson', 'Total']} money={[5]} empty="No sales in this period.">
        {rows.map(({ s, total }, i) => [i + 1, <strong key="t">{s.transNo}</strong>, s.salesDate, custName(s.custNo), empName(s.empNo), money(total)])}
      </Table>
    );
  }
  return null;
}

// Simple report table; children is an array of row arrays
function Table({ head, money: moneyCols = [], empty, children }) {
  return (
    <div className="data-table-wrap">
      <table className="data-table">
        <thead><tr>{head.map((h, i) => <th key={h} className={moneyCols.includes(i) ? 'money' : undefined}>{h}</th>)}</tr></thead>
        <tbody>
          {children.length === 0 && <EmptyRow cols={head.length}>{empty}</EmptyRow>}
          {children.map((cells, r) => (
            <tr key={r}>{cells.map((c, i) => <td key={i} className={moneyCols.includes(i) ? 'money' : undefined}>{c}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
