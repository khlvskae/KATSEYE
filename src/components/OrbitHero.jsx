import '../styles/orbit-styles.css';
const Icon = ({ children }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

// Inner ring: 3 icons, outer ring: 4 icons
const INNER = [
  { a: 0, label: 'Customers', icon: <Icon><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7" /></Icon> },
  { a: 120, label: 'Products', icon: <Icon><path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z" /><path d="M3.5 7.5 12 12l8.5-4.5M12 12v9" /></Icon> },
  { a: 240, label: 'Human Resources', icon: <Icon><rect x="3" y="7" width="18" height="13" rx="3" /><path d="M9 7V5h6v2M3 13h18" /></Icon> },
];
const OUTER = [
  { a: 45, label: 'Sales', icon: <Icon><path d="M3 20h18" /><path d="M5 16l5-5 4 3 6-7" /><path d="M15 7h5v5" /></Icon> },
  { a: 135, label: 'Payments', icon: <Icon><rect x="3" y="6" width="18" height="13" rx="2.5" /><path d="M3 10h18M7 15h4" /></Icon> },
  { a: 225, label: 'Reports', icon: <Icon><path d="M5 20V11M12 20V5M19 20v-7" /></Icon> },
  { a: 315, label: 'Audit log', icon: <Icon><path d="M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6z" /><path d="M12 8v5l3 2" /></Icon> },
];

function Ring({ className, items }) {
  return (
    <div className={`orbit-ring ${className}`}>
      {items.map(it => (
        <div key={it.label} className="orbit-item" style={{ '--a': `${it.a}deg`, '--na': `-${it.a}deg` }}>
          <i title={it.label}>{it.icon}</i>
        </div>
      ))}
    </div>
  );
}

export default function OrbitHero() {
  return (
    <div className="orbit-frame" aria-hidden="true">
      <div className="orbit-win">
        <div className="orbit-bar"><i /><i /><i /><span className="orbit-url" /></div>
        <div className="orbit-page">
          <div className="orbit-nav"><b /><span /><span /><span /></div>
          <div className="orbit-stage">
            <Ring className="r1" items={INNER} />
            <Ring className="r2" items={OUTER} />
            <div className="orbit-center">
              <svg viewBox="0 0 26 16" fill="none">
                <path d="M1 8C6 1.5 20 1.5 25 8 20 14.5 6 14.5 1 8Z" stroke="#fff" strokeWidth="1.8" />
                <ellipse cx="13" cy="8" rx="2" ry="5.4" fill="#fff" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
