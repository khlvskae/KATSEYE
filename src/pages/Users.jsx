import { useCallback, useEffect, useState } from 'react';
import { mapUser, useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { supabase, friendlyError } from '../lib/supabase';
import { ALL_PERMS, PERM_GROUPS } from '../lib/rights';
import { isEmail } from '../lib/format';
import { Alert, EmptyRow, Field, FormButtons, Loading, Modal } from '../components/ui';

const STATUS_BADGE = {
  active: <span className="badge badge-active">Active</span>,
  pending: <span className="badge" style={{ background: '#fff4dc', color: '#8a5a00' }}>Pending</span>,
  blocked: <span className="badge badge-deleted">Blocked</span>,
  disapproved: <span className="badge badge-deleted">Disapproved</span>,
};

export default function Users() {
  const auth = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [rightsFor, setRightsFor] = useState(null);

  // The database only returns the accounts this person may see (admins never see superadmins)
  const load = useCallback(async () => {
    const [a, b] = await Promise.all([
      supabase.from('app_user').select('*').eq('is_deleted', false).order('last_name'),
      supabase.from('user_permission').select('user_id,right_code').eq('is_deleted', false),
    ]);
    if (a.error || b.error) { setError(friendlyError(a.error || b.error)); return; }
    setUsers(a.data.map(u => mapUser(u, b.data)));
  }, []);
  useEffect(() => { load(); }, [load]);

  async function saveUser(u, changes) {
    const { error: err } = await supabase.rpc('admin_save_user', {
      p_id: u.id, p_first: changes.firstName ?? u.firstName, p_last: changes.lastName ?? u.lastName,
      p_role: changes.role ?? u.role, p_status: changes.status ?? u.status,
    });
    if (err) return friendlyError(err);
    await load();
    return null;
  }

  // Approving a pending user emails them a link to set their password
  async function changeStatus(u, status) {
    const err = await saveUser(u, { status });
    if (err) return toast(err, true);
    if (u.status === 'pending' && status === 'active') {
      const mailErr = await auth.sendPasswordLink(u.email);
      toast(mailErr ? `Approved, but the set-password email failed: ${mailErr}` : `Approved. A set-password link was emailed to ${u.email}.`, !!mailErr);
    } else {
      toast({ blocked: 'User blocked.', active: 'User unblocked.', disapproved: 'Registration disapproved.' }[status] || 'Saved');
    }
  }

  if (!users) return error ? <Alert>{error}</Alert> : <Loading text="Loading accounts…" />;

  return (
    <>
      <div className="module-toolbar">
        <h3>User Management</h3>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => setEditing({ user: null })}>+ Add User</button>
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: '.9rem', marginBottom: 16 }}>
        {auth.isSuper
          ? 'Superadmin: manage every account, approve registrations, designate admins and set rights for Users.'
          : 'Admin: manage User accounts and their rights. Superadmin accounts are hidden.'}
      </p>
      <div className="data-table-wrap">
        <table className="data-table">
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Rights</th><th>Actions</th></tr></thead>
          <tbody>
            {users.length === 0 && <EmptyRow cols={6}>No accounts yet.</EmptyRow>}
            {users.map(u => {
              const self = u.id === auth.user.id;
              const manageable = auth.isSuper || u.role === 'user';
              return (
                <tr key={u.id}>
                  <td><strong>{u.name}</strong>{self && <span style={{ color: 'var(--text-muted)' }}> (you)</span>}</td>
                  <td>{u.email}</td>
                  <td><span className={`role-badge role-${u.role}`} style={{ fontSize: '.7rem' }}>{u.role}</span></td>
                  <td>{STATUS_BADGE[u.status]}</td>
                  <td>{u.role === 'user' ? `${Object.keys(u.perms).length} of ${Object.keys(ALL_PERMS).length}` : 'All'}</td>
                  <td>
                    <div className="action-btns">
                      {manageable && u.status === 'pending' && <>
                        <button type="button" className="btn-restore" onClick={() => changeStatus(u, 'active')}>Approve</button>
                        <button type="button" className="btn-del" onClick={() => changeStatus(u, 'disapproved')}>Disapprove</button>
                      </>}
                      {manageable && !self && u.status === 'active' && <button type="button" className="btn-del" onClick={() => changeStatus(u, 'blocked')}>Block</button>}
                      {manageable && !self && u.status === 'blocked' && <button type="button" className="btn-restore" onClick={() => changeStatus(u, 'active')}>Unblock</button>}
                      {manageable && u.role === 'user' && <button type="button" className="btn-edit" onClick={() => setRightsFor(u)}>Rights</button>}
                      {manageable && <button type="button" className="btn-edit" onClick={() => setEditing({ user: u })}>Edit</button>}
                      {!manageable && '—'}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {editing && <UserForm user={editing.user} existing={users} saveUser={saveUser} reload={load} onClose={() => setEditing(null)} />}
      {rightsFor && <RightsDialog user={rightsFor} reload={load} onClose={() => setRightsFor(null)} />}
    </>
  );
}

function UserForm({ user, existing, saveUser, reload, onClose }) {
  const auth = useAuth();
  const toast = useToast();
  const self = user && user.id === auth.user.id;
  const [f, setF] = useState({
    firstName: user?.firstName || '', lastName: user?.lastName || '', email: user?.email || '',
    role: user?.role || 'user', status: user?.status || 'active',
  });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = k => e => setF(x => ({ ...x, [k]: e.target.value }));
  const roles = auth.isSuper ? ['user', 'admin', 'superadmin'] : ['user'];

  async function submit(e) {
    e.preventDefault();
    const fe = {};
    if (!f.firstName.trim()) fe.firstName = 'Enter the first name.';
    if (!f.lastName.trim()) fe.lastName = 'Enter the last name.';
    const email = f.email.trim().toLowerCase();
    if (!user) {
      if (!isEmail(email)) fe.email = 'Enter a valid email, like name@example.com.';
      else if (existing.some(u => u.email === email)) fe.email = 'An account with this email already exists.';
    }
    setErrors(fe); setError('');
    if (Object.keys(fe).length) return;
    setSaving(true);
    let err = null, note = 'User saved.';
    if (user) {
      err = await saveUser(user, { firstName: f.firstName.trim(), lastName: f.lastName.trim(), role: f.role, status: f.status });
      if (!err && user.status === 'pending' && f.status === 'active') {
        const mailErr = await auth.sendPasswordLink(user.email);
        note = mailErr ? `Approved, but the set-password email failed: ${mailErr}` : 'Approved. A set-password link was emailed.';
      }
    } else {
      const res = await auth.register({ firstName: f.firstName.trim(), lastName: f.lastName.trim(), email });
      if (res.error) err = res.error;
      else {
        err = await saveUser({ id: res.id }, { firstName: f.firstName.trim(), lastName: f.lastName.trim(), role: f.role, status: f.status });
        if (!err && f.status === 'active') {
          const mailErr = await auth.sendPasswordLink(email);
          note = mailErr ? `User added, but the set-password email failed: ${mailErr}` : `User added. A set-password link was emailed to ${email}.`;
        } else if (!err) note = 'User added.';
        await reload();
      }
    }
    setSaving(false);
    if (err) setError(err);
    else { toast(note); onClose(); }
  }

  return (
    <Modal title={user ? 'Edit User' : 'Add User'} sub={user ? user.email : 'They will get an email to set their password'} size="modal-lg" onClose={onClose}>
      <Alert>{error}</Alert>
      <form onSubmit={submit} noValidate>
        <div className="form-row">
          <Field label="First Name" htmlFor="umFirst" error={errors.firstName}><input id="umFirst" value={f.firstName} onChange={set('firstName')} maxLength={30} /></Field>
          <Field label="Last Name" htmlFor="umLast" error={errors.lastName}><input id="umLast" value={f.lastName} onChange={set('lastName')} maxLength={30} /></Field>
        </div>
        <Field label="Email" htmlFor="umEmail" error={errors.email}>
          <input id="umEmail" type="email" value={f.email} onChange={set('email')} readOnly={!!user} />
        </Field>
        <div className="form-row">
          <Field label="Role" htmlFor="umRole">
            <select id="umRole" className="select" value={f.role} onChange={set('role')} disabled={self}>
              {roles.map(r => <option key={r} value={r}>{r[0].toUpperCase() + r.slice(1)}</option>)}
            </select>
          </Field>
          <Field label="Status" htmlFor="umStatus">
            <select id="umStatus" className="select" value={f.status} onChange={set('status')} disabled={self}>
              <option value="active">Active</option><option value="pending">Pending</option>
              <option value="blocked">Blocked</option><option value="disapproved">Disapproved</option>
            </select>
          </Field>
        </div>
        {self && <p style={{ fontSize: '.85rem', color: 'var(--text-muted)', marginTop: -6, marginBottom: 14 }}>You cannot change your own role or status.</p>}
        <FormButtons saving={saving} label="Save User" onCancel={onClose} />
      </form>
    </Modal>
  );
}

function RightsDialog({ user, reload, onClose }) {
  const toast = useToast();
  const [draft, setDraft] = useState({ ...user.perms });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const toggleGroup = (g, on) => setDraft(d => {
    const n = { ...d, [g.view]: on };
    g.items.forEach(k => { n[k] = on; });
    return n;
  });

  async function save() {
    setSaving(true); setError('');
    const rights = Object.keys(draft).filter(k => draft[k]);
    const { error: err } = await supabase.rpc('admin_set_rights', { p_id: user.id, p_rights: rights });
    setSaving(false);
    if (err) return setError(friendlyError(err));
    await reload();
    toast(`Rights saved for ${user.firstName || user.email} (${rights.length} granted). The change is in the audit log.`);
    onClose();
  }

  return (
    <Modal title={`Rights · ${user.name}`} sub="Tick a module to open it, then choose what this user may do in it" size="modal-xl" onClose={onClose}>
      <Alert>{error}</Alert>
      <div className="modal-body-scroll">
        {PERM_GROUPS.map(g => {
          const viewOn = !!draft[g.view];
          return (
            <section className="rights-group" key={g.key}>
              <header>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input type="checkbox" checked={viewOn} onChange={e => setDraft(d => {
                    const n = { ...d, [g.view]: e.target.checked };
                    if (!e.target.checked) g.items.forEach(k => { n[k] = false; });
                    return n;
                  })} />
                  {g.label}
                </label>
                <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => toggleGroup(g, true)}>All</button>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => toggleGroup(g, false)}>None</button>
                </span>
              </header>
              <div className="rights-items" style={{ opacity: viewOn ? 1 : 0.45 }}>
                {g.items.map(k => (
                  <label key={k}>
                    <input type="checkbox" disabled={!viewOn} checked={!!draft[k]} onChange={e => setDraft(d => ({ ...d, [k]: e.target.checked }))} />
                    {ALL_PERMS[k]}
                  </label>
                ))}
              </div>
            </section>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        <button type="button" className="btn btn-primary btn-full" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Rights'}</button>
        <button type="button" className="btn btn-secondary" onClick={onClose} style={{ minWidth: 100 }}>Cancel</button>
      </div>
    </Modal>
  );
}
