import { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { money, nextCode, salePaid, saleTotal, todayISO } from '../lib/format';
import { Alert, EmptyRow, Field, FilterTabs, FormButtons, Modal, RowActions, SearchBox, StatusBadge, useList } from '../components/ui';

function BalanceBadge({ b }) {
  if (Math.abs(b) < 0.005) return <span className="badge balance-paid">Paid</span>;
  return b > 0 ? <span className="badge balance-open">Open</span> : <span className="badge balance-over">Overpaid</span>;
}

export default function Payments() {
  const [tab, setTab] = useState('payments');
  return (
    <>
      <div className="tab-row">
        <FilterTabs value={tab} onChange={setTab} options={[{ value: 'payments', label: 'Payments' }, { value: 'balances', label: 'Balances' }]} />
      </div>
      {tab === 'payments' ? <PaymentList /> : <Balances />}
    </>
  );
}

function PaymentList() {
  const { can } = useAuth();
  const { payments, sales, customers, setDeleted } = useData();
  const custOf = t => { const s = sales.find(x => x.transNo === t); return customers.find(c => c.custNo === s?.custNo)?.custName || '—'; };
  const fields = useMemo(() => ['orNo', 'transNo', 'payDate', r => custOf(r.transNo)], [sales, customers]); // eslint-disable-line react-hooks/exhaustive-deps
  const { list, search, setSearch, tabs } = useList(payments, fields);
  const [editing, setEditing] = useState(null);
  const sorted = [...list].sort((a, b) => (b.payDate || '').localeCompare(a.payDate || '') || b.orNo.localeCompare(a.orNo));

  return (
    <>
      <div className="module-toolbar">
        <h3>Payments</h3>
        <div className="toolbar-right">
          {tabs}
          <SearchBox value={search} onChange={setSearch} placeholder="Search OR no., transaction, customer…" />
          {can('sales.add') && (
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setEditing({
              row: { orNo: nextCode('OR', 6, payments.map(p => p.orNo)), payDate: todayISO(), transNo: '', amount: '' }, original: null,
            })}>+ Record Payment</button>
          )}
        </div>
      </div>
      <div className="data-table-wrap">
        <table className="data-table">
          <thead><tr><th>OR No.</th><th>Pay Date</th><th>Transaction</th><th>Customer</th><th className="money">Amount</th><th>Status</th><th>Stamp</th><th>Actions</th></tr></thead>
          <tbody>
            {sorted.length === 0 && <EmptyRow cols={8}>{search ? 'No payments match your search.' : 'No payments here.'}</EmptyRow>}
            {sorted.map(p => (
              <tr key={p.orNo} className={p.isDeleted ? 'deleted-row' : ''}>
                <td><strong>{p.orNo}</strong></td>
                <td>{p.payDate}</td>
                <td>{p.transNo}</td>
                <td>{custOf(p.transNo)}</td>
                <td className="money">{money(p.amount)}</td>
                <td><StatusBadge deleted={p.isDeleted} /></td>
                <td><div className="stamp-text">{p.stamp || '—'}</div></td>
                <td>
                  <RowActions row={p} canEdit={can('sales.edit')} canDelete={can('sales.delete')}
                    onEdit={() => setEditing({ row: { ...p, amount: Number(p.amount).toFixed(2) }, original: p })}
                    onDelete={() => setDeleted('payments', p, true)} onRestore={() => setDeleted('payments', p, false)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing && <PaymentForm {...editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function PaymentForm({ row, original, onClose }) {
  const { saveRow, sales, customers, sDetails, prices, payments } = useData();
  const [f, setF] = useState(row);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const others = payments.filter(p => p.orNo !== original?.orNo);
  const sale = sales.find(s => s.transNo === f.transNo);
  const total = sale ? saleTotal(sale, sDetails, prices) : 0;
  const paid = sale ? salePaid(sale.transNo, others) : 0;
  const custName = no => customers.find(c => c.custNo === no)?.custName || no;

  function pickSale(t) {
    const s = sales.find(x => x.transNo === t);
    const bal = s ? saleTotal(s, sDetails, prices) - salePaid(t, others) : 0;
    setF(x => ({ ...x, transNo: t, amount: x.amount || (bal > 0 ? bal.toFixed(2) : '') }));
  }

  async function submit(e) {
    e.preventDefault();
    const fe = {};
    if (!f.payDate) fe.payDate = 'Choose the payment date.';
    if (!f.transNo) fe.transNo = 'Choose the transaction being paid.';
    if (!(Number(f.amount) > 0)) fe.amount = 'Enter an amount greater than zero.';
    if (sale?.salesDate && f.payDate && f.payDate < sale.salesDate) fe.payDate = `The payment date cannot be before the sales date (${sale.salesDate}).`;
    setErrors(fe); setError('');
    if (Object.keys(fe).length) return;
    setSaving(true);
    const err = await saveRow('payments', { ...f, amount: Number(f.amount), isDeleted: original?.isDeleted }, original);
    setSaving(false);
    if (err) setError(err); else onClose();
  }

  return (
    <Modal title={original ? 'Edit Payment' : 'Record Payment'} sub="Payment against a sales transaction" size="modal-lg" onClose={onClose}>
      <Alert>{error}</Alert>
      <form onSubmit={submit} noValidate>
        <div className="form-row">
          <Field label="OR No." htmlFor="payOr"><input id="payOr" value={f.orNo} readOnly /></Field>
          <Field label="Payment Date" htmlFor="payDate" error={errors.payDate}>
            <input id="payDate" type="date" value={f.payDate} onChange={e => setF(x => ({ ...x, payDate: e.target.value }))} />
          </Field>
        </div>
        <Field label="Transaction" htmlFor="payTrans" error={errors.transNo}>
          <select id="payTrans" className="select" value={f.transNo} onChange={e => pickSale(e.target.value)}>
            <option value="">Choose a transaction…</option>
            {sales.filter(s => !s.isDeleted || s.transNo === f.transNo).sort((a, b) => b.transNo.localeCompare(a.transNo)).map(s => (
              <option key={s.transNo} value={s.transNo}>
                {s.transNo} · {custName(s.custNo)} · balance {money(saleTotal(s, sDetails, prices) - salePaid(s.transNo, others))}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Amount" htmlFor="payAmt" error={errors.amount}>
          <input id="payAmt" type="number" min="0.01" step="0.01" value={f.amount} onChange={e => setF(x => ({ ...x, amount: e.target.value }))} placeholder="0.00" />
        </Field>
        {sale && (
          <p style={{ fontSize: '.85rem', color: 'var(--text-muted)', margin: '-4px 0 14px' }}>
            Total {money(total)} · already paid {money(paid)} · remaining {money(total - paid)}
          </p>
        )}
        <FormButtons saving={saving} label="Save Payment" onCancel={onClose} />
      </form>
    </Modal>
  );
}

function Balances() {
  const { can } = useAuth();
  const { sales, customers, sDetails, prices, payments } = useData();
  const [by, setBy] = useState('transaction');
  const custName = no => customers.find(c => c.custNo === no)?.custName || no;
  const rows = useMemo(() => sales.filter(s => !s.isDeleted).map(s => {
    const t = saleTotal(s, sDetails, prices), p = salePaid(s.transNo, payments);
    return { s, t, p, b: t - p };
  }), [sales, sDetails, prices, payments]);
  const byCustomer = useMemo(() => {
    const m = {};
    rows.forEach(r => {
      const k = r.s.custNo; m[k] = m[k] || { k, n: 0, t: 0, p: 0 };
      m[k].n++; m[k].t += r.t; m[k].p += r.p;
    });
    return Object.values(m).map(x => ({ ...x, b: x.t - x.p })).sort((a, b) => b.b - a.b);
  }, [rows]);
  const outstanding = rows.reduce((s, r) => s + Math.max(0, r.b), 0);

  return (
    <>
      <div className="module-toolbar">
        <h3>Balances</h3>
        <FilterTabs value={by} onChange={setBy} options={[{ value: 'transaction', label: 'By transaction' }, { value: 'customer', label: 'By customer' }]} />
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: '.9rem', marginBottom: 16 }}>
        Totals use each line&apos;s quantity × the unit price in effect on the sales date.
        Outstanding across open transactions: <strong style={{ color: 'var(--text)' }}>{money(outstanding)}</strong>.
        {!can('sales.detailView') && <><br />You do not have the View Sale Details right, so totals may show as $0.00.</>}
      </p>
      <div className="data-table-wrap">
        <table className="data-table">
          {by === 'transaction' ? (
            <>
              <thead><tr><th>Trans No.</th><th>Sales Date</th><th>Customer</th><th className="money">Total</th><th className="money">Paid</th><th className="money">Balance</th><th>Status</th></tr></thead>
              <tbody>
                {rows.length === 0 && <EmptyRow cols={7}>No active sales.</EmptyRow>}
                {[...rows].sort((a, b) => b.b - a.b).map(r => (
                  <tr key={r.s.transNo}>
                    <td><strong>{r.s.transNo}</strong></td><td>{r.s.salesDate}</td><td>{custName(r.s.custNo)}</td>
                    <td className="money">{money(r.t)}</td><td className="money">{money(r.p)}</td>
                    <td className="money"><strong>{money(r.b)}</strong></td><td><BalanceBadge b={r.b} /></td>
                  </tr>
                ))}
              </tbody>
            </>
          ) : (
            <>
              <thead><tr><th>Cust No.</th><th>Customer</th><th className="money">Transactions</th><th className="money">Total</th><th className="money">Paid</th><th className="money">Balance</th><th>Status</th></tr></thead>
              <tbody>
                {byCustomer.length === 0 && <EmptyRow cols={7}>No active sales.</EmptyRow>}
                {byCustomer.map(r => (
                  <tr key={r.k}>
                    <td><strong>{r.k}</strong></td><td>{custName(r.k)}</td><td className="money">{r.n}</td>
                    <td className="money">{money(r.t)}</td><td className="money">{money(r.p)}</td>
                    <td className="money"><strong>{money(r.b)}</strong></td><td><BalanceBadge b={r.b} /></td>
                  </tr>
                ))}
              </tbody>
            </>
          )}
        </table>
      </div>
    </>
  );
}
