// Module tabs for the landing page "Everything in one system" section.
// Based on "Feature tabs" from the BrewedOps Motion Library, adapted for Hope, Inc.
import { useEffect, useRef, useState } from 'react';
import '../styles/feature-tabs.css';

const Icon = ({ children }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

const TABS = [
  {
    id: 'customers', label: 'Customers', title: 'Customer Management',
    text: 'Accounts, addresses and payment terms, with a full edit and delete history.',
    icon: <Icon><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c2 .7 3.2 2.5 3.5 5.2" /></Icon>,
  },
  {
    id: 'products', label: 'Products', title: 'Product Management',
    text: 'Product catalog, units, and price history by effective date.',
    icon: <Icon><path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z" /><path d="M3.5 7.5 12 12l8.5-4.5M12 12v9" /></Icon>,
  },
  {
    id: 'people', label: 'People', title: 'Human Resources',
    text: "Employees, jobs, departments and each person's job history.",
    icon: <Icon><rect x="3" y="7" width="18" height="13" rx="3" /><path d="M9 7V5h6v2M3 13h18" /></Icon>,
  },
  {
    id: 'sales', label: 'Sales', title: 'Sales Management',
    text: 'Transactions, line items and payments, priced from the product history.',
    icon: <Icon><path d="M3 20h18" /><path d="M5 16l5-5 4 3 6-7" /><path d="M15 7h5v5" /></Icon>,
  },
];

const AUTO_MS = 5000;

/* Small illustrations, one per module */
function Preview({ id }) {
  if (id === 'customers') {
    return (
      <div className="ft-rows">
        {[['C0001', '30D'], ['C0002', '45D'], ['C0003', 'COD'], ['C0004', '45D']].map(([code, term], i) => (
          <div className="ft-row" key={code} style={{ '--d': `${i * 70}ms` }}>
            <span className="ft-avatar" />
            <span className="ft-lines"><b style={{ width: `${70 - i * 8}%` }} /><s /></span>
            <span className="ft-code">{code}</span>
            <span className="ft-chip">{term}</span>
          </div>
        ))}
      </div>
    );
  }
  if (id === 'products') {
    return (
      <div className="ft-chart-wrap">
        <div className="ft-chart">
          {[40, 62, 48, 84, 70, 92].map((h, i) => <u key={i} style={{ '--h': `${h}%`, '--d': `${i * 60}ms` }} />)}
        </div>
        <div className="ft-caption"><span>Price history</span><b>$499.99 → $454.54</b></div>
      </div>
    );
  }
  if (id === 'people') {
    return (
      <div className="ft-timeline">
        {[['2010-05-30', 'Analyst', 'IT'], ['2011-01-02', 'Manager', 'IT'], ['2011-03-31', 'Vice president', 'IT']].map(([d, job, dept], i) => (
          <div className="ft-step" key={d} style={{ '--d': `${i * 90}ms` }}>
            <span className="ft-dot" />
            <span className="ft-step-body"><b>{job}</b><small>{d} · {dept}</small></span>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="ft-receipt">
      <div className="ft-receipt-head"><b>TR000125</b><span className="ft-chip">Paid</span></div>
      {[['HP Pavilion DV6000', '3 × $12.00', '$36.00'], ['Logitech M500 USB', '2 × $51.73', '$103.46'], ['Apple iPad Mini', '1 × $287.00', '$287.00']].map(([p, q, a], i) => (
        <div className="ft-line" key={p} style={{ '--d': `${i * 70}ms` }}><span>{p}</span><small>{q}</small><b>{a}</b></div>
      ))}
      <div className="ft-total"><span>Total</span><b>$426.46</b></div>
    </div>
  );
}

export default function FeatureTabs() {
  const [k, setK] = useState(0);
  const [paused, setPaused] = useState(false);
  const tabRefs = useRef([]);
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Moves to the next tab every few seconds, unless the visitor is hovering, focused or prefers less motion
  useEffect(() => {
    if (paused || reduced) return undefined;
    const t = setTimeout(() => setK(x => (x + 1) % TABS.length), AUTO_MS);
    return () => clearTimeout(t);
  }, [k, paused, reduced]);

  const show = (i, focus) => {
    const n = (i + TABS.length) % TABS.length;
    setK(n);
    if (focus) tabRefs.current[n]?.focus();
  };
  const onKey = e => {
    const d = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
    if (d) { e.preventDefault(); show(k + d, true); }
  };
  const tab = TABS[k];

  return (
    <div className={'ft' + (paused || reduced ? ' ft-paused' : '')}
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}
      style={{ '--auto': `${AUTO_MS}ms` }}>
      <div className="ft-tabs" role="tablist" aria-label="Modules" aria-orientation="vertical" onKeyDown={onKey}>
        {TABS.map((t, i) => (
          <button key={t.id} ref={el => { tabRefs.current[i] = el; }} type="button" role="tab"
            id={`ft-tab-${t.id}`} aria-controls="ft-panel" aria-selected={i === k} tabIndex={i === k ? 0 : -1}
            className={'ft-tab' + (i === k ? ' on' : '')} onClick={() => show(i)}>
            <span className="ft-icon">{t.icon}</span>
            <span className="ft-tab-text">
              <small>Module 0{i + 1}</small>
              <b>{t.label}</b>
            </span>
            {i === k && <i key={k} className="ft-progress" />}
          </button>
        ))}
      </div>

      <div className="ft-panel" id="ft-panel" role="tabpanel" aria-labelledby={`ft-tab-${tab.id}`}>
        <div className="ft-preview" key={tab.id}><Preview id={tab.id} /></div>
        <div className="ft-copy" key={tab.id + '-copy'}>
          <h3>{tab.title}</h3>
          <p>{tab.text}</p>
        </div>
      </div>
    </div>
  );
}
