import { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { money, nextCode, priceOn, saleTotal, todayISO } from '../lib/format';
import { Alert, ConfirmModal, EmptyRow, Field, FilterTabs, FormButtons, Modal, RowActions, SearchBox, StatusBadge, useList } from '../components/ui';

export default function Sales() {
  const { can } = useAuth();
  const { sales, customers, employees, sDetails, prices, setDeleted } = useData();
  const custName = no => customers.find(c => c.custNo === no)?.custName || no;
  const empName = no => { const e = employees.find(x => x.empNo === no); return e ? `${e.firstName} ${e.lastName}` : no; };
  const fields = useMemo(() => ['transNo', 'salesDate', 'custNo', r => custName(r.custNo), r => empName(r.empNo)], [customers, employees]); // eslint-disable-line react-hooks/exhaustive-deps
  const { list, search, setSearch, tabs } = useList(sales, fields);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [detailsFor, setDetailsFor] = useState(null);
  const sorted = [...list].sort((a, b) => b.transNo.localeCompare(a.transNo));

  return (
    <>
      <div className="module-toolbar">
        <h3>Sales Transactions</h3>
        <div className="toolbar-right">
          {tabs}
          <SearchBox value={search} onChange={setSearch} placeholder="Search transaction, customer, salesperson…" />
          {can('sales.add') && (
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setEditing({
              row: { transNo: nextCode('TR', 6, sales.map(s => s.transNo)), salesDate: todayISO(), custNo: '', empNo: '' }, original: null,
            })}>+ New Sale</button>
          )}
        </div>
      </div>
      <div className="data-table-wrap">
        <table className="data-table">
          <thead><tr><th>Trans No</th><th>Date</th><th>Customer</th><th>Salesperson</th>{can('sales.detailView') && <th className="money">Total</th>}<th>Status</th><th>Stamp</th><th>Actions</th></tr></thead>
          <tbody>
            {sorted.length === 0 && <EmptyRow cols={8}>{search ? 'No sales match your search.' : 'No sales here.'}</EmptyRow>}
            {sorted.map(s => (
              <tr key={s.transNo} className={s.isDeleted ? 'deleted-row' : ''}>
                <td><strong>{s.transNo}</strong></td>
                <td>{s.salesDate}</td>
                <td>{custName(s.custNo)}</td>
                <td>{empName(s.empNo)}</td>
                {can('sales.detailView') && <td className="money">{money(saleTotal(s, sDetails, prices))}</td>}
                <td><StatusBadge deleted={s.isDeleted} /></td>
                <td><div className="stamp-text">{s.stamp || '—'}</div></td>
                <td>
                  <RowActions row={s} canEdit={can('sales.edit')} canDelete={can('sales.delete')}
                    onEdit={() => setEditing({ row: { ...s }, original: s })}
                    onDelete={() => setConfirm(s)} onRestore={() => setDeleted('sales', s, false)}>
                    {can('sales.detailView') && <button key="d" type="button" className="btn-edit" onClick={() => setDetailsFor(s)}>Items</button>}
                  </RowActions>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing && <SaleForm {...editing} onClose={() => setEditing(null)} />}
      {detailsFor && <SaleDetails sale={detailsFor} onClose={() => setDetailsFor(null)} />}
      {confirm && (
        <ConfirmModal title="Delete sale?" onClose={() => setConfirm(null)}
          message={`${confirm.transNo} will move to the Deleted tab. A sale with active line items or payments cannot be deleted; delete those first.`}
          onConfirm={() => setDeleted('sales', confirm, true)} />
      )}
    </>
  );
}

function SaleForm({ row, original, onClose }) {
  const { saveRow, customers, employees } = useData();
  const [f, setF] = useState(row);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = k => e => setF(x => ({ ...x, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    const fe = {};
    if (!f.salesDate) fe.salesDate = 'Choose the sales date.';
    if (!f.custNo) fe.custNo = 'Choose a customer.';
    if (!f.empNo) fe.empNo = 'Choose a salesperson.';
    setErrors(fe); setError('');
    if (Object.keys(fe).length) return;
    setSaving(true);
    const err = await saveRow('sales', { ...f, isDeleted: original?.isDeleted }, original);
    setSaving(false);
    if (err) setError(err); else onClose();
  }

  return (
    <Modal title={original ? 'Edit Sale' : 'New Sale'} sub="Transaction header" size="modal-lg" onClose={onClose}>
      <Alert>{error}</Alert>
      <form onSubmit={submit} noValidate>
        <div className="form-row">
          <Field label="Transaction No." htmlFor="saleNo"><input id="saleNo" value={f.transNo} readOnly /></Field>
          <Field label="Sales Date" htmlFor="saleDate" error={errors.salesDate}>
            <input id="saleDate" type="date" value={f.salesDate} onChange={set('salesDate')} />
          </Field>
        </div>
        <Field label="Customer" htmlFor="saleCust" error={errors.custNo}>
          <select id="saleCust" className="select" value={f.custNo} onChange={set('custNo')}>
            <option value="">Choose a customer…</option>
            {customers.filter(c => !c.isDeleted || c.custNo === f.custNo).sort((a, b) => a.custName.localeCompare(b.custName))
              .map(c => <option key={c.custNo} value={c.custNo}>{c.custName} ({c.custNo})</option>)}
          </select>
        </Field>
        <Field label="Salesperson" htmlFor="saleEmp" error={errors.empNo}>
          <select id="saleEmp" className="select" value={f.empNo} onChange={set('empNo')}>
            <option value="">Choose an employee…</option>
            {employees.filter(e => (!e.isDeleted && !e.sepDate) || e.empNo === f.empNo).sort((a, b) => a.lastName.localeCompare(b.lastName))
              .map(e => <option key={e.empNo} value={e.empNo}>{e.lastName}, {e.firstName} ({e.empNo})</option>)}
          </select>
        </Field>
        <FormButtons saving={saving} label="Save Sale" onCancel={onClose} />
      </form>
    </Modal>
  );
}

function SaleDetails({ sale, onClose }) {
  const { can } = useAuth();
  const { sDetails, products, prices, setDeleted } = useData();
  const [filter, setFilter] = useState('active');
  const [editing, setEditing] = useState(null);
  const desc = c => products.find(p => p.prodCode === c)?.description || c;
  const rows = sDetails.filter(d => d.transNo === sale.transNo)
    .filter(d => filter === 'all' || (filter === 'deleted' ? d.isDeleted : !d.isDeleted))
    .sort((a, b) => a.prodCode.localeCompare(b.prodCode));
  const total = saleTotal(sale, sDetails, prices);

  if (editing) return <DetailForm {...editing} sale={sale} existing={sDetails} onClose={() => setEditing(null)} />;

  return (
    <Modal title={`Line Items · ${sale.transNo}`} sub={`Sales date ${sale.salesDate} · prices as of that date`} size="modal-xl" onClose={onClose}>
      <div className="module-toolbar">
        <FilterTabs value={filter} onChange={setFilter} options={[
          { value: 'active', label: 'Active' }, { value: 'deleted', label: 'Deleted' }, { value: 'all', label: 'All' }]} />
        {can('sales.detailAdd') && !sale.isDeleted && (
          <button type="button" className="btn btn-primary btn-sm"
            onClick={() => setEditing({ row: { transNo: sale.transNo, prodCode: '', quantity: '1' }, original: null })}>+ Add Line</button>
        )}
      </div>
      <div className="data-table-wrap modal-body-scroll">
        <table className="data-table">
          <thead><tr><th>Product</th><th className="money">Qty</th><th className="money">Unit Price</th><th className="money">Amount</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {rows.length === 0 && <EmptyRow cols={6}>No line items here.</EmptyRow>}
            {rows.map(d => {
              const up = priceOn(prices, d.prodCode, sale.salesDate);
              return (
                <tr key={d.prodCode} className={d.isDeleted ? 'deleted-row' : ''}>
                  <td><strong>{d.prodCode}</strong> · {desc(d.prodCode)}</td>
                  <td className="money">{d.quantity}</td>
                  <td className="money">{up ? money(up) : 'No price'}</td>
                  <td className="money">{money(up * d.quantity)}</td>
                  <td><StatusBadge deleted={d.isDeleted} /></td>
                  <td>
                    <RowActions row={d} canEdit={can('sales.detailEdit')} canDelete={can('sales.detailDelete')}
                      onEdit={() => setEditing({ row: { ...d, quantity: String(d.quantity) }, original: d })}
                      onDelete={() => setDeleted('sDetails', d, true)} onRestore={() => setDeleted('sDetails', d, false)} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p style={{ textAlign: 'right', marginTop: 14, fontWeight: 700, fontSize: '1.05rem' }}>Total {money(total)}</p>
    </Modal>
  );
}

function DetailForm({ row, original, sale, existing, onClose }) {
  const { saveRow, products, prices } = useData();
  const [f, setF] = useState(row);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const up = f.prodCode ? priceOn(prices, f.prodCode, sale.salesDate) : 0;

  async function submit(e) {
    e.preventDefault();
    const fe = {};
    if (!f.prodCode) fe.prodCode = 'Choose a product.';
    else if (!original && existing.some(d => d.transNo === sale.transNo && d.prodCode === f.prodCode)) fe.prodCode = 'This product is already on the sale. Edit that line instead.';
    else if (!up) fe.prodCode = `This product has no price on or before ${sale.salesDate}. Add a price first.`;
    if (!(Number(f.quantity) > 0)) fe.quantity = 'Enter a quantity greater than zero.';
    setErrors(fe); setError('');
    if (Object.keys(fe).length) return;
    setSaving(true);
    const err = await saveRow('sDetails', { ...f, quantity: Number(f.quantity), isDeleted: original?.isDeleted }, original);
    setSaving(false);
    if (err) setError(err); else onClose();
  }

  return (
    <Modal title={original ? 'Edit Line' : 'Add Line'} sub={`${sale.transNo} · ${sale.salesDate}`} size="modal-lg" onClose={onClose}>
      <Alert>{error}</Alert>
      <form onSubmit={submit} noValidate>
        <Field label="Product" htmlFor="sdProd" error={errors.prodCode}>
          <select id="sdProd" className="select" value={f.prodCode} disabled={!!original} onChange={e => setF(x => ({ ...x, prodCode: e.target.value }))}>
            <option value="">Choose a product…</option>
            {products.filter(p => !p.isDeleted || p.prodCode === f.prodCode).sort((a, b) => a.prodCode.localeCompare(b.prodCode))
              .map(p => <option key={p.prodCode} value={p.prodCode}>{p.prodCode} · {p.description}</option>)}
          </select>
        </Field>
        <Field label="Quantity" htmlFor="sdQty" error={errors.quantity}>
          <input id="sdQty" type="number" min="1" step="1" value={f.quantity} onChange={e => setF(x => ({ ...x, quantity: e.target.value }))} />
        </Field>
        {f.prodCode && (
          <p style={{ fontSize: '.85rem', color: 'var(--text-muted)', margin: '-4px 0 14px' }}>
            {up ? <>Unit price on {sale.salesDate}: <strong>{money(up)}</strong> · amount {money(up * (Number(f.quantity) || 0))}</> : 'No price on this date.'}
          </p>
        )}
        <FormButtons saving={saving} label="Save Line" onCancel={onClose} />
      </form>
    </Modal>
  );
}
