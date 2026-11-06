export const money = n =>
  '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const todayISO = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);

// Next code in a series: nextCode('TR', 6, ['TR000124']) → 'TR000125'
export function nextCode(prefix, width, codes) {
  let max = 0;
  codes.forEach(c => {
    const m = String(c || '').match(new RegExp('^' + prefix + '(\\d+)$'));
    if (m) max = Math.max(max, Number(m[1]));
  });
  return prefix + String(max + 1).padStart(width, '0');
}

// Unit price in effect on a date (latest price on or before it)
export function priceOn(prices, prodCode, asOfDate) {
  let list = prices.filter(p => p.prodCode === prodCode && !p.isDeleted);
  if (asOfDate) list = list.filter(p => p.effDate <= asOfDate);
  list.sort((a, b) => b.effDate.localeCompare(a.effDate));
  return list.length ? Number(list[0].unitPrice) : 0;
}

export function saleTotal(sale, details, prices) {
  return details
    .filter(d => d.transNo === sale.transNo && !d.isDeleted)
    .reduce((sum, d) => sum + Number(d.quantity) * priceOn(prices, d.prodCode, sale.salesDate), 0);
}

export function salePaid(transNo, payments) {
  return payments.filter(p => p.transNo === transNo && !p.isDeleted).reduce((s, p) => s + Number(p.amount), 0);
}

export function passwordStrength(pw) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return pw ? Math.max(1, Math.min(4, s - 1)) : 0;
}

export const isEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

export function randomPassword() {
  const a = new Uint8Array(24);
  crypto.getRandomValues(a);
  return btoa(String.fromCharCode(...a)) + 'Aa1!';
}
