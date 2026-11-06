import { useCallback, useEffect, useState } from 'react';
import { supabase, friendlyError } from '../lib/supabase';
import { Alert, EmptyRow } from '../components/ui';

const TABLES = ['customer', 'product', 'pricehist', 'employee', 'job', 'department', 'jobhistory',
  'sales', 'salesdetail', 'payment', 'app_user', 'user_permission'];
const ACTIONS = ['ADD', 'EDIT', 'DELETE', 'RESTORE'];
const EMPTY = { table: '', action: '', user: '', from: '', to: '' };

function Changes({ r }) {
  if (r.action === 'ADD') return 'Added';
  if (r.action === 'DELETE') return 'Soft-deleted';
  if (r.action === 'RESTORE') return 'Restored';
  const o = r.old_values || {}, n = r.new_values || {};
  const diffs = Object.keys(n).filter(k => k !== 'stamp' && JSON.stringify(o[k]) !== JSON.stringify(n[k]));
  if (!diffs.length) return '—';
  return diffs.map(k => <div key={k}><b>{k}</b>: {String(o[k] ?? '∅')} → {String(n[k] ?? '∅')}</div>);
}

export default function AuditLog() {
  const [filters, setFilters] = useState(EMPTY);
  const [applied, setApplied] = useState(EMPTY);
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const set = k => e => setFilters(f => ({ ...f, [k]: e.target.value }));

  const load = useCallback(async f => {
    setRows(null); setError('');
    let q = supabase.from('audit_log').select('*').order('audit_id', { ascending: false }).limit(300);
    if (f.table) q = q.eq('table_name', f.table);
    if (f.action) q = q.eq('action', f.action);
    if (f.user) q = q.ilike('action_by', `%${f.user}%`);
    if (f.from) q = q.gte('action_at', `${f.from}T00:00:00`);
    if (f.to) q = q.lte('action_at', `${f.to}T23:59:59`);
    const { data, error: err } = await q;
    if (err) { setError(friendlyError(err)); setRows([]); } else setRows(data);
  }, []);
  useEffect(() => { load(applied); }, [applied, load]);

  const fmt = t => new Date(t).toLocaleString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

  return (
    <>
      <div className="module-toolbar">
        <h3>Audit Log</h3>
        <span style={{ color: 'var(--text-muted)', fontSize: '.85rem' }}>Newest first · up to 300 entries</span>
      </div>
      <form className="audit-filters" onSubmit={e => { e.preventDefault(); setApplied(filters); }}>
        <div><label htmlFor="afTable">Table</label>
          <select id="afTable" value={filters.table} onChange={set('table')}><option value="">All tables</option>{TABLES.map(t => <option key={t}>{t}</option>)}</select></div>
        <div><label htmlFor="afAction">Action</label>
          <select id="afAction" value={filters.action} onChange={set('action')}><option value="">All actions</option>{ACTIONS.map(a => <option key={a}>{a}</option>)}</select></div>
        <div><label htmlFor="afUser">User</label><input id="afUser" value={filters.user} onChange={set('user')} placeholder="e.g. jdelacruz" /></div>
        <div><label htmlFor="afFrom">From</label><input id="afFrom" type="date" value={filters.from} onChange={set('from')} /></div>
        <div><label htmlFor="afTo">To</label><input id="afTo" type="date" value={filters.to} onChange={set('to')} /></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary btn-sm" type="submit">Apply</button>
          <button className="btn btn-secondary btn-sm" type="button" onClick={() => { setFilters(EMPTY); setApplied(EMPTY); }}>Clear</button>
        </div>
      </form>
      <Alert>{error}</Alert>
      <div className="data-table-wrap">
        <table className="data-table">
          <thead><tr><th>When</th><th>Table</th><th>Action</th><th>Record</th><th>By</th><th>Changes</th></tr></thead>
          <tbody>
            {rows === null && <EmptyRow cols={6}>Loading audit log…</EmptyRow>}
            {rows && rows.length === 0 && <EmptyRow cols={6}>No audit entries match these filters.</EmptyRow>}
            {rows && rows.map(r => (
              <tr key={r.audit_id}>
                <td style={{ whiteSpace: 'nowrap' }}>{fmt(r.action_at)}</td>
                <td>{r.table_name}</td>
                <td><span className={`badge act-${r.action}`}>{r.action}</span></td>
                <td><strong>{r.record_key}</strong></td>
                <td>{r.action_by}</td>
                <td><div className="audit-change"><Changes r={r} /></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
