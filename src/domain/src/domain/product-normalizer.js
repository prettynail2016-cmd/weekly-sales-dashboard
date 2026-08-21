const clean = value => String(value ?? '').trim().replace(/\s+/g, ' ');
export const productNameKey = value => clean(value).toLocaleLowerCase('en');

export function splitProductRecord(record) {
  const raw = clean(record.product_name);
  const quantity = Number(record.quantity || 0), amount = Number(record.amount || 0);
  if (!/^bogo\s*:/i.test(raw)) return raw ? [{ name: raw, quantity, amount }] : [];
  const names = raw.replace(/^bogo\s*:/i, '').split('|').map(clean).filter(Boolean);
  if (names.length < 2) return raw ? [{ name: raw, quantity, amount }] : [];
  return names.map(name => ({ name, quantity: quantity / names.length, amount: amount / names.length }));
}

export function buildProductSummary(records, branch) {
  const source = records.filter(row => row.branch === branch && row.sale_type === 'product');
  const items = new Map();
  for (const record of source) {
    for (const part of splitProductRecord(record)) {
      const key = productNameKey(part.name);
      if (!key) continue;
      const item = items.get(key) || { name: clean(part.name), quantity: 0, amount: 0 };
      item.quantity += part.quantity;
      item.amount += part.amount;
      items.set(key, item);
    }
  }
  const normalized = [...items.values()].map(item => ({ ...item,
    quantity: Math.round(item.quantity * 10000) / 10000,
    amount: Math.round(item.amount * 100) / 100
  })).filter(item => item.quantity > 0)
    .sort((a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }));
  return {
    quantity: Math.round(source.reduce((sum, item) => sum + Number(item.quantity || 0), 0) * 10000) / 10000,
    amount: Math.round(source.reduce((sum, item) => sum + Number(item.amount || 0), 0) * 100) / 100,
    records: source.length,
    items: normalized
  };
}
