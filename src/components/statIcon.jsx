const base = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

export const CustomersIcon = props => (
  <svg {...base} {...props}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
    <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8" />
    <path d="M18 14.3c2.2.6 3.5 2.4 3.5 5.7" />
  </svg>
);

export const ProductsIcon = props => (
  <svg {...base} {...props}>
    <path d="M12 2.8 20.5 7v10L12 21.2 3.5 17V7z" />
    <path d="M3.5 7 12 11.2 20.5 7" />
    <path d="M12 11.2v10" />
  </svg>
);

export const SalesIcon = props => (
  <svg {...base} {...props}>
    <path d="M3 4h2.4l2.2 10.2a1.5 1.5 0 0 0 1.5 1.2h8.2a1.5 1.5 0 0 0 1.5-1.1L20.5 8H6.2" />
    <circle cx="9.5" cy="19.5" r="1.4" />
    <circle cx="17" cy="19.5" r="1.4" />
  </svg>
);

export const RevenueIcon = props => (
  <svg {...base} {...props}>
    <circle cx="12" cy="12" r="9" />
    <path d="M14.8 9.3c-.4-1-1.4-1.6-2.8-1.6-1.6 0-2.7.8-2.7 2 0 3 5.6 1.4 5.6 4.4 0 1.2-1.2 2-2.9 2-1.5 0-2.6-.7-3-1.8" />
    <path d="M12 6v1.7M12 16.3V18" />
  </svg>
);