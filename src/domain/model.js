export const Branch = Object.freeze({ SUTERA: 'Sutera', ECO: 'Eco' });
export const DataState = Object.freeze({ OK: 'ok', BLANK: 'blank', ZERO: 'zero', INVALID: 'invalid', MISSING: 'missing', DUPLICATE: 'duplicate' });

export function isoDate(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function datesBetween(start, end) {
  const first = new Date(`${start}T00:00:00Z`), last = new Date(`${end}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || Number.isNaN(+first) || Number.isNaN(+last) || first > last) throw new Error('Invalid date range');
  const values = [];
  for (let cursor = first; cursor <= last; cursor = new Date(+cursor + 86400000)) values.push(cursor.toISOString().slice(0, 10));
  return values;
}

export function money(value) {
  return `RM${new Intl.NumberFormat('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value || 0))}`;
}
