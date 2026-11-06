import { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { LIMITS, UNITS } from '../lib/tables';
import { money, priceOn, todayISO } from '../lib/format';
import { Alert, ConfirmModal, EmptyRow, Field, FilterTabs, FormButtons, Modal, RowActions, SearchBox, StatusBadge, useList } from '../components/ui';

const SEARCH = ['prodCode', 'description', 'unit'];

export default function Products() {
  const { can } = useAuth();
  const { products, prices, setDeleted } = useData();
  const { list, search, setSearch, tabs } = useList(products, SEARCH);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [historyFor, setHistoryFor] = useState(null);
  const sorted = [...list].sort((a, b) => a.prodCode.localeCompare(b.prodCode));

  return (
    <>
      <div className="module-toolbar">
        <h3>Products</h3>
        <div className="toolbar-right">
          {tabs}
          <SearchBox value={search} onChange={setSearch} placeholder="Search products…" />
          {can('products.add') && (
            <button type="button" className="btn btn-primary btn-sm"
              onClick={() => setEditing({ row: { prodCode: '', description: '', unit: 'ea' }, original: null })}>+ Add Product</button>
          )}
        </div>
      </div>

      <div className="data-table-wrap">
        <table className="data-table">
          <thead><tr><th>Code</th><th>Description</th><th>Unit</th><th className="money">Current Price</th><th>Status</th><th>Stamp</th><th>Actions</th></tr></thead>
          <tbody>
            {sorted.length === 0 && <EmptyRow cols={7}>{search ? 'No products match your search.' : 'No products here.'}</EmptyRow>}
            {sorted.map(p => {
              const current = priceOn(prices, p.prodCode, todayISO());
              return (
                <tr key={p.prodCode} className={p.isDeleted ? 'deleted-row' : ''}>
                  <td><strong>{p.prodCode}</strong></td>
                  <td>{p.description}</td>
                  <td>{p.unit}</td>
                  <td className="money">{current ? money(current) : '—'}</td>
                  <td><StatusBadge deleted={p.isDeleted} /></td>
                  <td><div className="stamp-text">{p.stamp || '—'}</div></td>
                  <td>
                    <RowActions row={p} canEdit={can('products.edit')} canDelete={can('products.delete')}
                      onEdit={() => setEditing({ row: { ...p }, original: p })}
                      onDelete={() => setConfirm(p)} onRestore={() => setDeleted('products', p, false)}>
                      <button key="h" type="button" className="btn-edit" onClick={() => setHistoryFor(p)}>Prices</button>
                    </RowActions>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editing && <ProductForm {...editing} existing={products} onClose={() => setEditing(null)} />}
      {historyFor && <PriceHistory product={historyFor} onClose={() => setHistoryFor(null)} />}
      {confirm && (
        <ConfirmModal title="Delete product?" onClose={() => setConfirm(null)}
          message={`${confirm.prodCode} · ${confirm.description} will move to the Deleted tab. A product with active sales lines or prices cannot be deleted.`}
          onConfirm={() => setDeleted('products', confirm, true)} />
      )}
    </>
  );
}

function ProductForm({ row, original, existing, onClose }) {
  const { saveRow } = useData();
  const [f, setF] = useState(row);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = k => e => setF(x => ({ ...x, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    const fe = {};
    const code = f.prodCode.trim().toUpperCase();
    if (!code) fe.prodCode = 'Enter a product code.';
    else if (!original && existing.some(p => p.prodCode === code)) fe.prodCode = 'This product code is already used.';
    if (!f.description.trim()) fe.description = 'Enter a description.';
    setErrors(fe); setError('');
    if (Object.keys(fe).length) return;
    setSaving(true);
    const err = await saveRow('products', { ...f, prodCode: code, description: f.description.trim(), isDeleted: original?.isDeleted }, original);
    setSaving(false);
    if (err) setError(err); else onClose();
  }

  return (
    <Modal title={original ? 'Edit Product' : 'Add Product'} sub="Product details" size="modal-lg" onClose={onClose}>
      <Alert>{error}</Alert>
      <form onSubmit={submit} noValidate>
        <Field label="Product Code" htmlFor="prodCode" error={errors.prodCode}>
          <input id="prodCode" value={f.prodCode} onChange={set('prodCode')} maxLength={LIMITS.prodCode} readOnly={!!original} placeholder="AD0005" />
        </Field>
        <Field label="Description" htmlFor="prodDesc" error={errors.description}>
          <input id="prodDesc" value={f.description} onChange={set('description')} maxLength={LIMITS.description} />
        </Field>
        <Field label="Unit" htmlFor="prodUnit">
          <select id="prodUnit" className="select" value={f.unit} onChange={set('unit')}>
            {UNITS.map(u => <option key={u}>{u}</option>)}
          </select>
        </Field>
        <FormButtons saving={saving} label="Save Product" onCancel={onClose} />
      </form>
    </Modal>
  );
}

function PriceHistory({ product, onClose }) {
  const { can } = useAuth();
  const { prices, setDeleted } = useData();
  const [filter, setFilter] = useState('active');
  const [editing, setEditing] = useState(null);
  const rows = useMemo(() => prices
    .filter(p => p.prodCode === product.prodCode)
    .filter(p => filter === 'all' || (filter === 'deleted' ? p.isDeleted : !p.isDeleted))
    .sort((a, b) => b.effDate.localeCompare(a.effDate)), [prices, product, filter]);

  if (editing) {
    return <PriceForm {...editing} product={product} existing={prices} onClose={() => setEditing(null)} />;
  }
  return (
    <Modal title={`Price History · ${product.prodCode}`} sub={product.description} size="modal-xl" onClose={onClose}>
      <div className="module-toolbar">
        <FilterTabs value={filter} onChange={setFilter} options={[
          { value: 'active', label: 'Active' }, { value: 'deleted', label: 'Deleted' }, { value: 'all', label: 'All' }]} />
        {can('products.priceAdd') && !product.isDeleted && (
          <button type="button" className="btn btn-primary btn-sm"
            onClick={() => setEditing({ row: { effDate: todayISO(), prodCode: product.prodCode, unitPrice: '' }, original: null })}>+ Add Price</button>
        )}
      </div>
      <div className="data-table-wrap modal-body-scroll">
        <table className="data-table">
          <thead><tr><th>Effective Date</th><th className="money">Unit Price</th><th>Status</th><th>Stamp</th><th>Actions</th></tr></thead>
          <tbody>
            {rows.length === 0 && <EmptyRow cols={5}>No prices here.</EmptyRow>}
            {rows.map(p => (
              <tr key={p.effDate} className={p.isDeleted ? 'deleted-row' : ''}>
                <td><strong>{p.effDate}</strong></td>
                <td className="money">{money(p.unitPrice)}</td>
                <td><StatusBadge deleted={p.isDeleted} /></td>
                <td><div className="stamp-text">{p.stamp || '—'}</div></td>
                <td>
                  <RowActions row={p} canEdit={can('products.priceEdit')} canDelete={can('products.priceDelete')}
                    onEdit={() => setEditing({ row: { ...p }, original: p })}
                    onDelete={() => setDeleted('prices', p, true)} onRestore={() => setDeleted('prices', p, false)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}

function PriceForm({ row, original, product, existing, onClose }) {
  const { saveRow } = useData();
  const [f, setF] = useState({ ...row, unitPrice: row.unitPrice === '' ? '' : String(row.unitPrice) });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    const fe = {};
    if (!f.effDate) fe.effDate = 'Choose the effective date.';
    else if (!original && existing.some(p => p.prodCode === product.prodCode && p.effDate === f.effDate)) fe.effDate = 'This product already has a price on that date.';
    if (!(Number(f.unitPrice) > 0)) fe.unitPrice = 'Enter a price greater than zero.';
    setErrors(fe); setError('');
    if (Object.keys(fe).length) return;
    setSaving(true);
    const err = await saveRow('prices', { ...f, unitPrice: Number(f.unitPrice), isDeleted: original?.isDeleted }, original);
    setSaving(false);
    if (err) setError(err); else onClose();
  }

  return (
    <Modal title={original ? 'Edit Price' : 'Add Price'} sub={`${product.prodCode} · ${product.description}`} size="modal-lg" onClose={onClose}>
      <Alert>{error}</Alert>
      <form onSubmit={submit} noValidate>
        <Field label="Effective Date" htmlFor="priceDate" error={errors.effDate}>
          <input id="priceDate" type="date" value={f.effDate} readOnly={!!original} onChange={e => setF(x => ({ ...x, effDate: e.target.value }))} />
        </Field>
        <Field label="Unit Price" htmlFor="priceAmt" error={errors.unitPrice}>
          <input id="priceAmt" type="number" min="0.01" step="0.01" value={f.unitPrice} onChange={e => setF(x => ({ ...x, unitPrice: e.target.value }))} placeholder="0.00" />
        </Field>
        <FormButtons saving={saving} label="Save Price" onCancel={onClose} />
      </form>
    </Modal>
  );
}
