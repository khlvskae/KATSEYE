import { Link } from 'react-router-dom';
import { Logo } from '../components/ui';
import OrbitHero from '../components/OrbitHero';
import FeatureTabs from '../components/FeatureTabs';

const MODULES = [
  { cls: 'fc-1', n: '01', name: 'Customers', title: 'Customer Management', text: 'Accounts, addresses and payment terms, with a full edit and delete history.' },
  { cls: 'fc-2', n: '02', name: 'Products', title: 'Product Management', text: 'Product catalog, units, and price history by effective date.' },
  { cls: 'fc-3', n: '03', name: 'People', title: 'Human Resources', text: "Employees, jobs, departments and each person's job history." },
  { cls: 'fc-4', n: '04', name: 'Sales', title: 'Sales Management', text: 'Transactions, line items and payments, priced from the product history.' },
];

export default function Landing() {
  return (
    <div>
      <nav className="navbar">
        <Link to="/" style={{ textDecoration: 'none' }}><Logo /></Link>
        <div className="nav-actions">
          <Link className="btn btn-ghost" to="/login">Sign In</Link>
          <Link className="btn btn-primary" to="/register">Register</Link>
        </div>
      </nav>

      <div className="hero-band">
        <section className="hero">
          <div className="hero-content">
            <span className="eyebrow">Enterprise Resource Planning · 2026</span>
            <h1>Eyes on every <span>Sale</span></h1>
            <p>Customers, products, people and sales, choreographed in one platform. Hope, Inc. ERP keeps every team in step.</p>
            <div className="hero-cta">
              <Link className="btn btn-primary" to="/login">Sign In to Dashboard</Link>
              <Link className="btn btn-outline" to="/register">Create Account</Link>
            </div>
          </div>
          <div className="hero-visual" aria-hidden="true">
                 <OrbitHero />
            <div className="hero-chips">
              <div className="hero-chip c1"><i /><div><b>4</b> core modules</div></div>
              <div className="hero-chip c2"><i /><div><b>3</b> user roles</div></div>
            </div>
          </div>
        </section>
      </div>
      
          <section className="features">
        <div className="section-title">
          <h2>Everything in <span>one</span> system</h2>
          <p>Four core modules. Three user roles. One unified platform for every team at Hope, Inc.</p>
        </div>
        <FeatureTabs />
      </section>

      <footer>© 2026 Hope, Inc. ERP System · Visual theme inspired by KATSEYE · All rights reserved</footer>
    </div>
  );
}
