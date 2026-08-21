const clean = value => String(value ?? '').trim().replace(/\s+/g, ' ');
export const packageNameKey = value => clean(value).toLocaleLowerCase('en');

export function findPackageCatalogEntry(catalog, branch, name) {
  const key = packageNameKey(name);
  return catalog.find(item => item.branch === branch && [item.package_name, ...(item.aliases || [])].some(value => packageNameKey(value) === key));
}

export function buildPackageSummary(records, catalog, branch) {
  const items = new Map();
  const put = (key, seed) => { if (!items.has(key)) items.set(key, { ...seed, quantity: 0, amount: 0 }); return items.get(key); };
  catalog.filter(item => item.branch === branch && item.active !== false).forEach(item => put(`catalog:${item.id || packageNameKey(item.package_name)}`, {
    id: item.id || null, name: clean(item.package_name), category: item.category, active: true, displayOrder: Number(item.display_order || 0)
  }));
  records.filter(row => row.branch === branch && row.sale_type === 'package').forEach(row => {
    const rawName = clean(row.product_name || row.package_type || 'Other Package') || 'Other Package';
    const match = findPackageCatalogEntry(catalog, branch, rawName);
    const key = match ? `catalog:${match.id || packageNameKey(match.package_name)}` : `history:${packageNameKey(rawName)}`;
    const item = put(key, { id: match?.id || null, name: clean(match?.package_name || rawName), category: match?.category || null, active: match?.active !== false, displayOrder: Number(match?.display_order || 9999) });
    item.quantity += Number(row.quantity || 0);
    item.amount += Number(row.amount || 0);
  });
  return [...items.values()].map(item => ({ ...item, quantity: Math.round(item.quantity * 10000) / 10000, amount: Math.round(item.amount * 100) / 100 }))
    .sort((a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }) || a.displayOrder - b.displayOrder);
}
