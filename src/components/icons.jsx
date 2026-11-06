const Svg = ({ children }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);

export const ICONS = {
  dashboard: <Svg><path d="M4 11l8-7 8 7v9H4z" /><path d="M10 20v-5h4v5" /></Svg>,
  customers: <Svg><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c2 .7 3.2 2.5 3.5 5.2" /></Svg>,
  products: <Svg><path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z" /><path d="M3.5 7.5 12 12l8.5-4.5M12 12v9" /></Svg>,
  hr: <Svg><rect x="3" y="7" width="18" height="13" rx="3" /><path d="M9 7V5h6v2M3 13h18" /></Svg>,
  sales: <Svg><path d="M3 20h18" /><path d="M5 16l5-5 4 3 6-7" /><path d="M15 7h5v5" /></Svg>,
  payments: <Svg><rect x="3" y="6" width="18" height="13" rx="2.5" /><path d="M3 10h18M7 15h4" /></Svg>,
  reports: <Svg><path d="M5 20V11M12 20V5M19 20v-7" /></Svg>,
  users: <Svg><rect x="5" y="10.5" width="14" height="10" rx="2.5" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></Svg>,
  audit: <Svg><path d="M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6z" /><path d="M12 8v5l3 2" /></Svg>,
  menu: <Svg><path d="M3 6h18M3 12h18M3 18h18" /></Svg>,
};
