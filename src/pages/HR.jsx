import { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { LIMITS } from '../lib/tables';
import { money, nextCode, todayISO } from '../lib/format';
import { Alert, ConfirmModal, EmptyRow, Field, FilterTabs, FormButtons, Modal, RowActions, SearchBox, StatusBadge, useList } from '../components/ui';

export default function HR() {
  const [tab, setTab] = useState('employees');
  return (
    <>
      <div className="tab-row">
        <FilterTabs value={tab} onChange={setTab} options={[
          { value: 'employees', label: 'Employees' }, { value: 'jobs', label: 'Jobs' }, { value: 'depts', label: 'Departments' }]} />
      </div>
      {tab === 'employees' && <Employees />}
      {tab === 'jobs' && <SimpleTable kind="jobs" />}
      {tab === 'depts' && <SimpleTable kind="depts" />}
    </>
  );
}

/* ---------------- Employees ---------------- */
const EMP_SEARCH = ['empNo', 'lastName', 'firstName', r => `${r.firstName} ${r.lastName}`];

function Employees() {
  const { can } = useAuth();
  const { employees, setDeleted } = useData();
  const { list, search, setSearch, tabs } = useList(employees, EMP_SEARCH);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [historyFor, setHistoryFor] = useState(null);
  const sorted = [...list].sort((a, b) => a.empNo.localeCompare(b.empNo));

  return (
    <>
      <div className="module-toolbar">
        <h3>Employees</h3>
        <div className="toolbar-right">
          {tabs}
          <SearchBox value={search} onChange={setSearch} placeholder="Search employees…" />
          {can('hr.empAdd') && (
            <button type="button" className="btn btn-primary btn-sm" onClick={() => setEditing({
              row: { empNo: nextCode('', 5, employees.map(e => e.empNo)), lastName: '', firstName: '', gender: 'F', birthDate: '', hireDate: todayISO(), sepDate: '' },
              original: null,
            })}>+ Add Employee</button>
          )}
        </div>
      </div>
      <div className="data-table-wrap">
        <table className="data-table">
          <thead><tr><th>Emp No</th><th>Name</th><th>Gender</th><th>Birth Date</th><th>Hire Date</th><th>Separated</th><th>Status</th><th>Stamp</th><th>Actions</th></tr></thead>
          <tbody>
            {sorted.length === 0 && <EmptyRow cols={9}>{search ? 'No employees match your search.' : 'No employees here.'}</EmptyRow>}
            {sorted.map(e => (
              <tr key={e.empNo} className={e.isDeleted ? 'deleted-row' : ''}>
                <td><strong>{e.empNo}</strong></td>
                <td>{e.lastName}, {e.firstName}</td>
                <td>{e.gender}</td>
                <td>{e.birthDate || '—'}</td>
                <td>{e.hireDate || '—'}</td>
                <td>{e.sepDate || '—'}</td>
                <td><StatusBadge deleted={e.isDeleted} /></td>
                <td><div className="stamp-text">{e.stamp || '—'}</div></td>
                <td>
                  <RowActions row={e} canEdit={can('hr.empEdit')} canDelete={can('hr.empDelete')}
                    onEdit={() => setEditing({ row: { ...e }, original: e })}
                    onDelete={() => setConfirm(e)} onRestore={() => setDeleted('employees', e, false)}>
                    {can('hr.jhView') && <button key="jh" type="button" className="btn-edit" onClick={() => setHistoryFor(e)}>Job History</button>}
                  </RowActions>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing && <EmployeeForm {...editing} existing={employees} onClose={() => setEditing(null)} />}
      {historyFor && <JobHistory employee={historyFor} onClose={() => setHistoryFor(null)} />}
      {confirm && (
        <ConfirmModal title="Delete employee?" onClose={() => setConfirm(null)}
          message={`${confirm.empNo} · ${confirm.firstName} ${confirm.lastName} will move to the Deleted tab. An employee with active job history or sales cannot be deleted.`}
          onConfirm={() => setDeleted('employees', confirm, true)} />
      )}
    </>
  );
}

function EmployeeForm({ row, original, existing, onClose }) {
  const { saveRow } = useData();
  const [f, setF] = useState(row);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = k => e => setF(x => ({ ...x, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    const fe = {};
    if (!f.empNo.trim()) fe.empNo = 'Enter an employee number.';
    else if (!original && existing.some(x => x.empNo === f.empNo.trim())) fe.empNo = 'This employee number is already used.';
    if (!f.firstName.trim()) fe.firstName = 'Enter the first name.';
    if (!f.lastName.trim()) fe.lastName = 'Enter the last name.';
    if (!f.hireDate) fe.hireDate = 'Enter the hire date.';
    if (f.birthDate && f.hireDate && f.birthDate >= f.hireDate) fe.birthDate = 'Birth date must be before the hire date.';
    if (f.sepDate && f.hireDate && f.sepDate < f.hireDate) fe.sepDate = 'Separation date cannot be before the hire date.';
    setErrors(fe); setError('');
    if (Object.keys(fe).length) return;
    setSaving(true);
    const err = await saveRow('employees', { ...f, empNo: f.empNo.trim(), firstName: f.firstName.trim(), lastName: f.lastName.trim(), isDeleted: original?.isDeleted }, original);
    setSaving(false);
    if (err) setError(err); else onClose();
  }

  return (
    <Modal title={original ? 'Edit Employee' : 'Add Employee'} sub="Employee details" size="modal-lg" onClose={onClose}>
      <Alert>{error}</Alert>
      <form onSubmit={submit} noValidate>
        <div className="form-row">
          <Field label="Employee No." htmlFor="empNo" error={errors.empNo}>
            <input id="empNo" value={f.empNo} onChange={set('empNo')} maxLength={LIMITS.empNo} readOnly={!!original} />
          </Field>
          <Field label="Gender" htmlFor="empGender">
            <select id="empGender" className="select" value={f.gender} onChange={set('gender')}>
              <option value="F">Female</option><option value="M">Male</option>
            </select>
          </Field>
        </div>
        <div className="form-row">
          <Field label="First Name" htmlFor="empFirst" error={errors.firstName}>
            <input id="empFirst" value={f.firstName} onChange={set('firstName')} maxLength={LIMITS.firstName} />
          </Field>
          <Field label="Last Name" htmlFor="empLast" error={errors.lastName}>
            <input id="empLast" value={f.lastName} onChange={set('lastName')} maxLength={LIMITS.lastName} />
          </Field>
        </div>
        <div className="form-row">
          <Field label="Birth Date" htmlFor="empBirth" error={errors.birthDate}>
            <input id="empBirth" type="date" value={f.birthDate} onChange={set('birthDate')} />
          </Field>
          <Field label="Hire Date" htmlFor="empHire" error={errors.hireDate}>
            <input id="empHire" type="date" value={f.hireDate} onChange={set('hireDate')} />
          </Field>
        </div>
        <Field label="Separation Date (leave empty if still employed)" htmlFor="empSep" error={errors.sepDate}>
          <input id="empSep" type="date" value={f.sepDate} onChange={set('sepDate')} />
        </Field>
        <FormButtons saving={saving} label="Save Employee" onCancel={onClose} />
      </form>
    </Modal>
  );
}

/* ---------------- Jobs and Departments ---------------- */
const KINDS = {
  jobs: {
    title: 'Jobs', one: 'Job', code: 'jobCode', name: 'jobDesc', codeLabel: 'Job Code', nameLabel: 'Job Description',
    codeMax: LIMITS.jobCode, nameMax: LIMITS.jobDesc, add: 'hr.jobAdd', edit: 'hr.jobEdit', del: 'hr.jobDelete',
    childNote: 'A job used in active job history cannot be deleted.',
  },
  depts: {
    title: 'Departments', one: 'Department', code: 'deptCode', name: 'deptName', codeLabel: 'Department Code', nameLabel: 'Department Name',
    codeMax: LIMITS.deptCode, nameMax: LIMITS.deptName, add: 'hr.deptAdd', edit: 'hr.deptEdit', del: 'hr.deptDelete',
    childNote: 'A department used in active job history cannot be deleted.',
  },
};

function SimpleTable({ kind }) {
  const K = KINDS[kind];
  const { can } = useAuth();
  const data = useData();
  const rows = data[kind];
  const fields = useMemo(() => [K.code, K.name], [K]);
  const { list, search, setSearch, tabs } = useList(rows, fields);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const sorted = [...list].sort((a, b) => a[K.code].localeCompare(b[K.code]));

  return (
    <>
      <div className="module-toolbar">
        <h3>{K.title}</h3>
        <div className="toolbar-right">
          {tabs}
          <SearchBox value={search} onChange={setSearch} placeholder={`Search ${K.title.toLowerCase()}…`} />
          {can(K.add) && <button type="button" className="btn btn-primary btn-sm"
            onClick={() => setEditing({ row: { [K.code]: '', [K.name]: '' }, original: null })}>+ Add {K.one}</button>}
        </div>
      </div>
      <div className="data-table-wrap">
        <table className="data-table">
          <thead><tr><th>Code</th><th>{K.nameLabel}</th><th>Status</th><th>Stamp</th><th>Actions</th></tr></thead>
          <tbody>
            {sorted.length === 0 && <EmptyRow cols={5}>Nothing here.</EmptyRow>}
            {sorted.map(r => (
              <tr key={r[K.code]} className={r.isDeleted ? 'deleted-row' : ''}>
                <td><strong>{r[K.code]}</strong></td>
                <td>{r[K.name]}</td>
                <td><StatusBadge deleted={r.isDeleted} /></td>
                <td><div className="stamp-text">{r.stamp || '—'}</div></td>
                <td>
                  <RowActions row={r} canEdit={can(K.edit)} canDelete={can(K.del)}
                    onEdit={() => setEditing({ row: { ...r }, original: r })}
                    onDelete={() => setConfirm(r)} onRestore={() => data.setDeleted(kind, r, false)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing && <SimpleForm K={K} kind={kind} {...editing} existing={rows} onClose={() => setEditing(null)} />}
      {confirm && (
        <ConfirmModal title={`Delete ${K.one.toLowerCase()}?`} onClose={() => setConfirm(null)}
          message={`${confirm[K.code]} · ${confirm[K.name]} will move to the Deleted tab. ${K.childNote}`}
          onConfirm={() => data.setDeleted(kind, confirm, true)} />
      )}
    </>
  );
}

function SimpleForm({ K, kind, row, original, existing, onClose }) {
  const { saveRow } = useData();
  const [f, setF] = useState(row);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    const code = f[K.code].trim().toUpperCase();
    const fe = {};
    if (!code) fe.code = `Enter the ${K.codeLabel.toLowerCase()}.`;
    else if (!original && existing.some(x => x[K.code] === code)) fe.code = 'This code is already used.';
    if (!f[K.name].trim()) fe.name = `Enter the ${K.nameLabel.toLowerCase()}.`;
    setErrors(fe); setError('');
    if (Object.keys(fe).length) return;
    setSaving(true);
    const err = await saveRow(kind, { ...f, [K.code]: code, [K.name]: f[K.name].trim(), isDeleted: original?.isDeleted }, original);
    setSaving(false);
    if (err) setError(err); else onClose();
  }

  return (
    <Modal title={`${original ? 'Edit' : 'Add'} ${K.one}`} onClose={onClose}>
      <Alert>{error}</Alert>
      <form onSubmit={submit} noValidate>
        <Field label={K.codeLabel} htmlFor="simpleCode" error={errors.code}>
          <input id="simpleCode" value={f[K.code]} maxLength={K.codeMax} readOnly={!!original}
            onChange={e => setF(x => ({ ...x, [K.code]: e.target.value }))} />
        </Field>
        <Field label={K.nameLabel} htmlFor="simpleName" error={errors.name}>
          <input id="simpleName" value={f[K.name]} maxLength={K.nameMax}
            onChange={e => setF(x => ({ ...x, [K.name]: e.target.value }))} />
        </Field>
        <FormButtons saving={saving} label={`Save ${K.one}`} onCancel={onClose} />
      </form>
    </Modal>
  );
}

/* ---------------- Job history ---------------- */
function JobHistory({ employee, onClose }) {
  const { can } = useAuth();
  const { jobHist, jobs, depts, setDeleted } = useData();
  const [filter, setFilter] = useState('active');
  const [editing, setEditing] = useState(null);
  const jobName = c => jobs.find(j => j.jobCode === c)?.jobDesc || c;
  const deptName = c => depts.find(d => d.deptCode === c)?.deptName || c || '—';
  const rows = jobHist
    .filter(h => h.empNo === employee.empNo)
    .filter(h => filter === 'all' || (filter === 'deleted' ? h.isDeleted : !h.isDeleted))
    .sort((a, b) => b.effDate.localeCompare(a.effDate));

  if (editing) return <JobHistoryForm {...editing} employee={employee} existing={jobHist} onClose={() => setEditing(null)} />;

  return (
    <Modal title={`Job History · ${employee.firstName} ${employee.lastName}`} sub={`Employee ${employee.empNo} · newest first`} size="modal-xl" onClose={onClose}>
      <div className="module-toolbar">
        <FilterTabs value={filter} onChange={setFilter} options={[
          { value: 'active', label: 'Active' }, { value: 'deleted', label: 'Deleted' }, { value: 'all', label: 'All' }]} />
        {can('hr.jhAdd') && !employee.isDeleted && (
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setEditing({
            row: { empNo: employee.empNo, jobCode: '', deptCode: '', effDate: todayISO(), salary: '' }, original: null,
          })}>+ Add Assignment</button>
        )}
      </div>
      <div className="data-table-wrap modal-body-scroll">
        <table className="data-table">
          <thead><tr><th>Effective Date</th><th>Job</th><th>Department</th><th className="money">Salary</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {rows.length === 0 && <EmptyRow cols={6}>No job history here.</EmptyRow>}
            {rows.map(h => (
              <tr key={`${h.jobCode}|${h.effDate}`} className={h.isDeleted ? 'deleted-row' : ''}>
                <td><strong>{h.effDate}</strong></td>
                <td>{h.jobCode} · {jobName(h.jobCode)}</td>
                <td>{h.deptCode ? `${h.deptCode} · ${deptName(h.deptCode)}` : '—'}</td>
                <td className="money">{money(h.salary)}</td>
                <td><StatusBadge deleted={h.isDeleted} /></td>
                <td>
                  <RowActions row={h} canEdit={can('hr.jhEdit')} canDelete={can('hr.jhDelete')}
                    onEdit={() => setEditing({ row: { ...h, salary: String(h.salary) }, original: h })}
                    onDelete={() => setDeleted('jobHist', h, true)} onRestore={() => setDeleted('jobHist', h, false)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}

function JobHistoryForm({ row, original, employee, existing, onClose }) {
  const { saveRow, jobs, depts } = useData();
  const [f, setF] = useState(row);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = k => e => setF(x => ({ ...x, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    const fe = {};
    if (!f.jobCode) fe.jobCode = 'Choose a job.';
    if (!f.deptCode) fe.deptCode = 'Choose a department.';
    if (!f.effDate) fe.effDate = 'Choose the effective date.';
    if (!(Number(f.salary) >= 0) || f.salary === '') fe.salary = 'Enter a salary of zero or more.';
    const clash = existing.some(h => h.empNo === employee.empNo && h.jobCode === f.jobCode && h.effDate === f.effDate
      && !(original && h.jobCode === original.jobCode && h.effDate === original.effDate));
    if (clash) fe.effDate = 'This employee already has this job on that date.';
    setErrors(fe); setError('');
    if (Object.keys(fe).length) return;
    setSaving(true);
    const err = await saveRow('jobHist', { ...f, salary: Number(f.salary), isDeleted: original?.isDeleted }, original);
    setSaving(false);
    if (err) setError(err); else onClose();
  }

  return (
    <Modal title={original ? 'Edit Assignment' : 'Add Assignment'} sub={`${employee.empNo} · ${employee.firstName} ${employee.lastName}`} size="modal-lg" onClose={onClose}>
      <Alert>{error}</Alert>
      <form onSubmit={submit} noValidate>
        <div className="form-row">
          <Field label="Effective Date" htmlFor="jhDate" error={errors.effDate}>
            <input id="jhDate" type="date" value={f.effDate} onChange={set('effDate')} />
          </Field>
          <Field label="Salary" htmlFor="jhSalary" error={errors.salary}>
            <input id="jhSalary" type="number" min="0" step="0.01" value={f.salary} onChange={set('salary')} />
          </Field>
        </div>
        <div className="form-row">
          <Field label="Job" htmlFor="jhJob" error={errors.jobCode}>
            <select id="jhJob" className="select" value={f.jobCode} onChange={set('jobCode')}>
              <option value="">Choose…</option>
              {jobs.filter(j => !j.isDeleted || j.jobCode === f.jobCode).map(j => <option key={j.jobCode} value={j.jobCode}>{j.jobCode} · {j.jobDesc}</option>)}
            </select>
          </Field>
          <Field label="Department" htmlFor="jhDept" error={errors.deptCode}>
            <select id="jhDept" className="select" value={f.deptCode || ''} onChange={set('deptCode')}>
              <option value="">Choose…</option>
              {depts.filter(d => !d.isDeleted || d.deptCode === f.deptCode).map(d => <option key={d.deptCode} value={d.deptCode}>{d.deptCode} · {d.deptName}</option>)}
            </select>
          </Field>
        </div>
        <FormButtons saving={saving} label="Save Assignment" onCancel={onClose} />
      </form>
    </Modal>
  );
}
