import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { ICONS } from './icons';
import { Logo, Loading, Alert } from './ui';

// Sidebar items. "right" hides an item from Users without that right.
export const NAV = [
  { to: '/dashboard', id: 'dashboard', label: 'Dashboard', title: 'Dashboard' },
  { section: 'Modules' },
  { to: '/customers', id: 'customers', label: 'Customer', title: 'Customer Management', right: 'customers.view' },
  { to: '/products', id: 'products', label: 'Products', title: 'Product Management', right: 'products.view' },
  { to: '/hr', id: 'hr', label: 'Human Resources', title: 'Human Resources', right: 'hr.view' },
  { to: '/sales', id: 'sales', label: 'Sales', title: 'Sales Management', right: 'sales.view' },
  { to: '/payments', id: 'payments', label: 'Payments', title: 'Payments & Balances', right: 'sales.view' },
  { to: '/reports', id: 'reports', label: 'Reports', title: 'Reports', right: 'reports.view' },
  { section: 'Administration' },
  { to: '/users', id: 'users', label: 'User Management', title: 'User Management', admin: true },
  { to: '/audit', id: 'audit', label: 'Audit Log', title: 'Audit Log', superOnly: true },
];

export function visibleNav(auth) {
  const items = NAV.filter(i => i.section
    || ((!i.right || auth.can(i.right)) && (!i.admin || auth.isAdmin) && (!i.superOnly || auth.isSuper)));
  // drop section titles that have no items under them
  return items.filter((i, k) => !i.section || (items[k + 1] && !items[k + 1].section));
}

export default function Layout() {
  const auth = useAuth();
  const { loading, loadError, loadAll } = useData();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const current = NAV.find(n => n.to === pathname);
  const u = auth.user;
  if (!u) return null;

  return (
    <div className="dash-layout">
      <aside className={'sidebar' + (menuOpen ? ' open' : '')}>
        <div className="sidebar-header"><Logo /></div>
        <nav className="sidebar-nav" aria-label="Main" onClick={() => setMenuOpen(false)}>
          {visibleNav(auth).map((item, k) => item.section
            ? <div key={'s' + k} className="nav-section-title">{item.section}</div>
            : (
              <NavLink key={item.id} to={item.to} className={({ isActive }) => 'nav-item' + (isActive ? ' active' : '')}>
                <span className="icon">{ICONS[item.id]}</span> {item.label}
              </NavLink>
            ))}
        </nav>
        <div className="sidebar-footer">
          <button type="button" className="user-info" onClick={auth.signOut} title="Sign out"
            style={{ width: '100%', background: 'none', border: 0, color: 'inherit', font: 'inherit', textAlign: 'left' }}>
            <div className="user-avatar">{(u.firstName || u.email)[0].toUpperCase()}</div>
            <div className="user-details">
              <div className="name">{u.name}</div>
              <div className="role">{u.role}</div>
            </div>
            <span style={{ opacity: 0.6, fontSize: '0.8rem' }}>Sign out</span>
          </button>
        </div>
      </aside>

      <div className="main-content">
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button type="button" className="btn btn-secondary btn-sm mobile-menu" onClick={() => setMenuOpen(o => !o)}
              aria-label="Open menu" aria-expanded={menuOpen}>{ICONS.menu}</button>
            <div className="topbar-title">{current ? current.title : 'Hope, Inc. ERP'}</div>
          </div>
          <div className="topbar-actions">
            <span className={`role-badge role-${u.role}`}>{u.role}</span>
          </div>
        </header>
        <main className="content-area">
          {loadError && (
            <Alert>
              Could not load data: {loadError}{' '}
              <button type="button" className="btn btn-secondary btn-sm" onClick={loadAll} style={{ marginLeft: 8 }}>Try again</button>
            </Alert>
          )}
          {loading ? <Loading text="Loading Hope, Inc. data…" /> : <Outlet />}
        </main>
      </div>
    </div>
  );
}
