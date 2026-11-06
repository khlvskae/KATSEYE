import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { LIMITS, PAY_TERMS } from '../lib/tables';
import { Alert, ConfirmModal, EmptyRow, Field, FormButtons, Modal, RowActions, SearchBox, StatusBadge, useList } from '../components/ui';
import { nextCode } from '../lib/format';

const SEARCH = ['custNo', 'custName', 'address', 'payterms'];

export default function Customers() {
  const { can } = useAuth();
  const { customers, setDeleted } = useData();
  const { list, search, setSearch, tabs } = useList(customers, SEARCH);
  const [editing, setEditing] = useState(null);     // { row, original }
  const [confirm, setConfirm] = useState(null);

  const sorted = [...list].sort((a, b) => a.custNo.localeCompare(b.custNo));

  return (
    <>
      <div className="module-toolbar">
        <h3>Customers</h3>
        <div className="toolbar-right">
          {tabs}
          <SearchBox value={search} onChange={setSearch} placeholder="Search customers…" />
          {can('customers.add') && (
            <button type="button" className="btn btn-primary btn-sm"
              onClick={() => setEditing({ row: { custNo: nextCode('C', 4, customers.map(c => c.custNo)), custName: '', address: '', payterms: 'COD' }, original: null })}>
              + Add Customer
            </button>
          )}
        </div>
      </div>

      <div className="data-table-wrap">
        <table className="data-table">
          <thead><tr><th>Cust No</th><th>Customer Name</th><th>Address</th><th>Pay Terms</th><th>Status</th><th>Stamp</th><th>Actions</th></tr></thead>
          <tbody>
            {sorted.length === 0 && <EmptyRow cols={7}>{search ? 'No customers match your search.' : 'No customers here.'}</EmptyRow>}
            {sorted.map(c => (
              <tr key={c.custNo} className={c.isDeleted ? 'deleted-row' : ''}>
                <td><strong>{c.custNo}</strong></td>
                <td>{c.custName}</td>
                <td>{c.address}</td>
                <td>{c.payterms}</td>
                <td><StatusBadge deleted={c.isDeleted} /></td>
                <td><div className="stamp-text">{c.stamp || '—'}</div></td>
                <td>
                  <RowActions row={c} canEdit={can('customers.edit')} canDelete={can('customers.delete')}
                    onEdit={() => setEditing({ row: { ...c }, original: c })}
                    onDelete={() => setConfirm(c)}
                    onRestore={() => setDeleted('customers', c, false)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && <CustomerForm {...editing} existing={customers} onClose={() => setEditing(null)} />}
      {confirm && (
        <ConfirmModal title="Delete customer?" onClose={() => setConfirm(null)}
          message={`${confirm.custNo} · ${confirm.custName} will move to the Deleted tab. A customer with active sales cannot be deleted.`}
          onConfirm={() => setDeleted('customers', confirm, true)} />
      )}
    </>
  );
}

function CustomerForm({ row, original, existing, onClose }) {
  const { saveRow } = useData();
  const [f, setF] = useState(row);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = k => e => setF(x => ({ ...x, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    const fe = {};
    if (!f.custNo.trim()) fe.custNo = 'Enter a customer number.';
    else if (!original && existing.some(c => c.custNo === f.custNo.trim())) fe.custNo = 'This customer number is already used.';
    if (!f.custName.trim()) fe.custName = 'Enter the customer name.';
    if (!f.address.trim()) fe.address = 'Enter the address.';
    setErrors(fe); setError('');
    if (Object.keys(fe).length) return;
    setSaving(true);
    const err = await saveRow('customers', { ...f, custNo: f.custNo.trim(), custName: f.custName.trim(), address: f.address.trim(), isDeleted: original?.isDeleted }, original);
    setSaving(false);
    if (err) setError(err); else onClose();
  }

  return (
    <Modal title={original ? 'Edit Customer' : 'Add Customer'} sub="Customer details" size="modal-lg" onClose={onClose}>
      <Alert>{error}</Alert>
      <form onSubmit={submit} noValidate>
        <Field label="Customer No." htmlFor="custNo" error={errors.custNo}>
          <input id="custNo" value={f.custNo} onChange={set('custNo')} maxLength={LIMITS.custNo} readOnly={!!original} placeholder="C0083" />
        </Field>
        <Field label="Customer Name" htmlFor="custName" error={errors.custName}>
          <input id="custName" value={f.custName} onChange={set('custName')} maxLength={LIMITS.custName} />
        </Field>
        <Field label="Address" htmlFor="custAddress" error={errors.address}>
          <input id="custAddress" value={f.address} onChange={set('address')} maxLength={LIMITS.address} />
        </Field>
        <Field label="Payment Terms" htmlFor="custPay">
          <select id="custPay" className="select" value={f.payterms} onChange={set('payterms')}>
            {PAY_TERMS.map(t => <option key={t} value={t}>{t === 'COD' ? 'COD (cash on delivery)' : t === '30D' ? '30D (30 days)' : '45D (45 days)'}</option>)}
          </select>
        </Field>
        <FormButtons saving={saving} label="Save Customer" onCancel={onClose} />
      </form>
    </Modal>
  );
}
