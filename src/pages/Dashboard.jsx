import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { visibleNav } from '../components/Layout';
import { ICONS } from '../components/icons';
import { CustomersIcon, ProductsIcon, SalesIcon, RevenueIcon } from '../components/statIcons';
import { saleTotal, salePaid } from '../lib/format';

const compact = n =>
  n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M`
  : n >= 1e3 ? `$${(n / 1e3).toFixed(1)}k`
  : `$${n.toFixed(2)}`;

const ROLE_TEXT = {
  superadmin: 'You have full system access. You can manage all modules and assign roles to any user.',
  admin: 'You can manage every module, and manage User accounts and their rights.',
  user: 'You can use the modules assigned to you. Ask an administrator if you need more access.',
};

export default function Dashboard() {
  const auth = useAuth();
  const d = useData();
  const active = list => list.filter(r => !r.isDeleted);

  const activeSales = active(d.sales);
  const revenue = activeSales.reduce((sum, s) => sum + saleTotal(s, d.sDetails, d.prices), 0);
  const collected = activeSales.reduce((sum, s) => sum + salePaid(s.transNo, d.payments), 0);

  const stats = [
    {
      label: 'Customers',
      icon: <CustomersIcon />,
      show: auth.can('customers.view'),
      value: active(d.customers).length,
      note: `${d.customers.filter(c => c.isDeleted).length} deleted`,
    },
    {
      label: 'Products',
      icon: <ProductsIcon />,
      show: auth.can('products.view'),
      value: active(d.products).length,
      note: `${active(d.prices).length} price records`,
    },
    {
      label: 'Sales',
      icon: <SalesIcon />,
      show: auth.can('sales.view'),
      value: activeSales.length,
      note: `${active(d.sDetails).length} line items`,
    },
    {
      label: 'Total Revenue',
      icon: <RevenueIcon />,
      show: auth.can('sales.view'),
      value: compact(revenue),
      note: `${compact(collected)} collected · ${compact(Math.max(0, revenue - collected))} outstanding`,
    },
  ].filter(s => s.show);

  const shortcuts = visibleNav(auth).filter(i => !i.section && i.id !== 'dashboard');

  return (
    <>
      <div className="welcome-msg">
        <h2>
          Welcome Back,{' '}
          <span className="serif" style={{ color: 'var(--pink)' }}>
            {auth.user.firstName || auth.user.name}.
          </span>
        </h2>
        <p>{ROLE_TEXT[auth.user.role]}</p>
      </div>

      {stats.length > 0 && (
        <div className="stats-grid">
          {stats.map(s => (
            <div className="stat-card" key={s.label}>
              <div className="stat-head">
                <div className="label">{s.label}</div>
                <span className="stat-icon">{s.icon}</span>
              </div>
              <div className="value">
                {typeof s.value === 'number' ? s.value.toLocaleString() : s.value}
              </div>
              <div className="change" style={{ color: 'var(--text-muted)' }}>{s.note}</div>
            </div>
          ))}
        </div>
      )}

      <div className="panel">
        <h3>Quick Actions</h3>
        {shortcuts.length ? (
          <div className="quick-actions">
            {shortcuts.map(s => (
              <Link key={s.id} to={s.to} className="quick-btn" style={{ textDecoration: 'none' }}>
                <span style={{ color: 'var(--pink-deep)', display: 'grid' }}>{ICONS[s.id]}</span>
                {s.label}
              </Link>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)' }}>
            No modules are assigned to your account yet. Ask an administrator to give you rights.
          </p>
        )}
      </div>
    </>
  );
}
