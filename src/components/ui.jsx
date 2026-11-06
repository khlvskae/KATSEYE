import { useEffect, useMemo, useState } from 'react';
import { passwordStrength } from '../lib/format';
import logoPhoto from '../assets/logo.jpeg';

/* ---------- Brand ---------- */
export function EyeMark() {
  return (
    <svg viewBox="0 0 26 16" aria-hidden="true" width="26" height="16">
      <path d="M1 8C6 1.5 20 1.5 25 8 20 14.5 6 14.5 1 8Z" fill="none" stroke="#f4b6d2" strokeWidth="1.6" />
      <ellipse cx="13" cy="8" rx="1.8" ry="5" fill="#b9a8f0" />
    </svg>
  );
}

export function Logo({ word = true }) {
  return (
    <span className="logo">
      <span className="logo-icon" style={{ overflow: 'hidden', padding: 0 }}>
        <img src={logoPhoto} alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      </span>
      {word && <span className="word">HOPE, INC.</span>}
    </span>
  );
}

// The chrome cat-eye artwork used on the landing and account pages
export function EyeArt({ className = 'eye-art' }) {
  return (
    <svg className={className} viewBox="0 0 520 340" aria-hidden="true">
      <defs>
        <linearGradient id="chrome" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" /><stop offset=".3" stopColor="#9d97a6" />
          <stop offset=".5" stopColor="#f6f4f7" /><stop offset=".75" stopColor="#6d6675" /><stop offset="1" stopColor="#e9e6ed" />
        </linearGradient>
        <linearGradient id="iris" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f4b6d2" /><stop offset="1" stopColor="#b9a8f0" />
        </linearGradient>
        <radialGradient id="glow" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#f4b6d2" stopOpacity=".45" /><stop offset="1" stopColor="#f4b6d2" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="260" cy="170" rx="250" ry="160" fill="url(#glow)" />
      <g fill="none" stroke="url(#chrome)">
        <path d="M20 170C110 40 410 40 500 150 410 290 110 300 20 170Z" strokeWidth="3" />
        <path d="M50 170C130 66 390 66 470 152 390 268 130 276 50 170Z" strokeWidth="1.4" opacity=".7" />
        <path d="M80 170C150 92 370 92 440 154 370 246 150 252 80 170Z" strokeWidth="1" opacity=".5" />
        <path d="M110 170C170 118 350 118 410 156 350 224 170 228 110 170Z" strokeWidth=".8" opacity=".35" />
      </g>
      <circle cx="260" cy="170" r="74" fill="none" stroke="url(#iris)" strokeWidth="1.5" opacity=".8" />
      <ellipse className="pupil" cx="260" cy="170" rx="14" ry="62" fill="url(#iris)" />
      <circle cx="252" cy="138" r="4" fill="#fff" />
    </svg>
  );
}

/* ---------- Feedback ---------- */
export function Alert({ kind = 'error', children }) {
  if (!children) return null;
  return <div className={`alert alert-${kind === 'ok' ? 'success' : kind === 'info' ? 'info' : 'error'}`} role="alert">{children}</div>;
}

export function Loading({ text = 'Loading…' }) {
  return <div className="loading-veil"><div><span />{text}</div></div>;
}

export function StatusBadge({ deleted, labels = ['Active', 'Deleted'] }) {
  return deleted
    ? <span className="badge badge-deleted">{labels[1]}</span>
    : <span className="badge badge-active">{labels[0]}</span>;
}

export function EmptyRow({ cols, children }) {
  return <tr><td colSpan={cols}><div className="empty-state">{children}</div></td></tr>;
}

/* ---------- Forms ---------- */
export function Field({ label, htmlFor, error, children }) {
  return (
    <div className="form-group">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {error && <div className="field-error">{error}</div>}
    </div>
  );
}

export function PasswordInput({ id, value, onChange, autoComplete = 'current-password', invalid, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div className="password-wrapper">
      <input id={id} type={show ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)}
        autoComplete={autoComplete} aria-invalid={invalid ? 'true' : undefined} placeholder={placeholder} />
      <button type="button" className="toggle-password" onClick={() => setShow(s => !s)}
        aria-label={show ? 'Hide password' : 'Show password'}
        style={{ fontSize: '.72rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }}>
        {show ? 'Hide' : 'Show'}
      </button>
    </div>
  );
}

export function StrengthMeter({ password }) {
  const s = passwordStrength(password);
  const colors = ['', 'var(--danger)', 'var(--warning)', 'var(--accent)', 'var(--success)'];
  const names = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  return (
    <>
      <div className="pw-meter" aria-hidden="true">
        {[0, 1, 2, 3].map(i => <i key={i} style={{ background: i < s ? colors[s] : undefined }} />)}
      </div>
      <div className="pw-meter-label">
        {password ? `Strength: ${names[s]}. ` : ''}Use 8 or more characters with letters, numbers and a symbol.
      </div>
    </>
  );
}

/* ---------- Modal ---------- */
export function Modal({ title, sub, onClose, size = '', children }) {
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape' && onClose) onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose]);
  return (
    <div className="modal-overlay active" onMouseDown={e => { if (e.target === e.currentTarget && onClose) onClose(); }}>
      <div className={`modal ${size}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-header">
          <div><h2>{title}</h2>{sub && <p>{sub}</p>}</div>
          {onClose && <button type="button" className="modal-close" onClick={onClose} aria-label="Close">&times;</button>}
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function FormButtons({ saving, label = 'Save', onCancel }) {
  return (
    <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
      <button type="submit" className="btn btn-primary btn-full" disabled={saving}>{saving ? 'Saving…' : label}</button>
      <button type="button" className="btn btn-secondary" onClick={onCancel} style={{ minWidth: 100 }}>Cancel</button>
    </div>
  );
}

/* ---------- Lists ---------- */
export function FilterTabs({ value, onChange, options }) {
  return (
    <div className="filter-tabs" role="tablist">
      {options.map(o => (
        <button key={o.value} type="button" role="tab" aria-selected={value === o.value}
          className={'filter-tab' + (value === o.value ? ' active' : '')} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

// Active / Deleted / All filter + text search over the given fields
export function useList(rows, searchFields) {
  const [filter, setFilter] = useState('active');
  const [search, setSearch] = useState('');
  const counts = useMemo(() => ({
    active: rows.filter(r => !r.isDeleted).length,
    deleted: rows.filter(r => r.isDeleted).length,
    all: rows.length,
  }), [rows]);
  const list = useMemo(() => {
    let l = rows;
    if (filter === 'active') l = l.filter(r => !r.isDeleted);
    if (filter === 'deleted') l = l.filter(r => r.isDeleted);
    const q = search.trim().toLowerCase();
    if (q) l = l.filter(r => searchFields.some(f => String(typeof f === 'function' ? f(r) : r[f] ?? '').toLowerCase().includes(q)));
    return l;
  }, [rows, filter, search, searchFields]);
  const tabs = (
    <FilterTabs value={filter} onChange={setFilter} options={[
      { value: 'active', label: `Active (${counts.active})` },
      { value: 'deleted', label: `Deleted (${counts.deleted})` },
      { value: 'all', label: `All (${counts.all})` },
    ]} />
  );
  return { list, filter, search, setSearch, tabs };
}

export function SearchBox({ value, onChange, placeholder }) {
  return <input className="search-input" type="search" value={value} placeholder={placeholder}
    aria-label={placeholder} onChange={e => onChange(e.target.value)} />;
}

// Edit / Delete / Restore buttons, shown according to rights
export function RowActions({ row, canEdit, canDelete, onEdit, onDelete, onRestore, children }) {
  const buttons = [];
  if (children) buttons.push(children);
  if (!row.isDeleted && canEdit) buttons.push(<button key="e" type="button" className="btn-edit" onClick={onEdit}>Edit</button>);
  if (!row.isDeleted && canDelete) buttons.push(<button key="d" type="button" className="btn-del" onClick={onDelete}>Delete</button>);
  if (row.isDeleted && canDelete) buttons.push(<button key="r" type="button" className="btn-restore" onClick={onRestore}>Restore</button>);
  return <div className="action-btns">{buttons.length ? buttons : '—'}</div>;
}

// Confirmation step built into the page (browsers' confirm() is not used)
export function ConfirmModal({ title, message, confirmLabel = 'Delete', onConfirm, onClose }) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal title={title} onClose={onClose}>
      <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>{message}</p>
      <div style={{ display: 'flex', gap: 10 }}>
        <button type="button" className="btn btn-primary btn-full" disabled={busy}
          onClick={async () => { setBusy(true); await onConfirm(); setBusy(false); onClose(); }}>
          {busy ? 'Working…' : confirmLabel}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onClose} style={{ minWidth: 100 }}>Cancel</button>
      </div>
    </Modal>
  );
}
