import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { SUPABASE_READY } from './lib/supabase';
import Layout from './components/Layout';
import { Loading } from './components/ui';
import Landing from './pages/Landing';
import { Login, Register, ForgotPassword, SetPassword } from './pages/AuthPages';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Products from './pages/Products';
import HR from './pages/HR';
import Sales from './pages/Sales';
import Payments from './pages/Payments';
import Reports from './pages/Reports';
import Users from './pages/Users';
import AuditLog from './pages/AuditLog';
import SetupNotice from './pages/SetupNotice';


function Protected({ right, admin, superOnly, children }) {
  const auth = useAuth();
  if (auth.status === 'loading') return <Loading text="Checking your session…" />;
  if (auth.status === 'setPassword') return <Navigate to="/set-password" replace />;
  if (auth.status !== 'signedIn') return <Navigate to="/login" replace />;
  const allowed = (!right || auth.can(right)) && (!admin || auth.isAdmin) && (!superOnly || auth.isSuper);
  if (!allowed) return <div className="empty-state">You do not have access to this page. Ask an administrator for the right.</div>;
  return children;
}


function PublicOnly({ children }) {
  const { status } = useAuth();
  if (status === 'loading') return <Loading text="Checking your session…" />;
  if (status === 'signedIn') return <Navigate to="/dashboard" replace />;
  if (status === 'setPassword') return <Navigate to="/set-password" replace />;
  return children;
}

export default function App() {
  if (!SUPABASE_READY) return <SetupNotice />;
  return (
    <Routes>
      <Route path="/" element={<PublicOnly><Landing /></PublicOnly>} />
      <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
      <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />
      <Route path="/forgot-password" element={<PublicOnly><ForgotPassword /></PublicOnly>} />
      <Route path="/set-password" element={<SetPassword />} />
      <Route path="/reset-password" element={<SetPassword />} />

      <Route element={<Protected><Layout /></Protected>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/customers" element={<Protected right="customers.view"><Customers /></Protected>} />
        <Route path="/products" element={<Protected right="products.view"><Products /></Protected>} />
        <Route path="/hr" element={<Protected right="hr.view"><HR /></Protected>} />
        <Route path="/sales" element={<Protected right="sales.view"><Sales /></Protected>} />
        <Route path="/payments" element={<Protected right="sales.view"><Payments /></Protected>} />
        <Route path="/reports" element={<Protected right="reports.view"><Reports /></Protected>} />
        <Route path="/users" element={<Protected admin><Users /></Protected>} />
        <Route path="/audit" element={<Protected superOnly><AuditLog /></Protected>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
