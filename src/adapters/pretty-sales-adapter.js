export class PrettySalesAdapter {
  constructor({ url, publishableKey }, fetchImpl = globalThis.fetch.bind(globalThis)) { this.url = url; this.key = publishableKey; this.fetch = fetchImpl; }

  async table(name, query = 'select=*') {
    if (!this.key) throw new Error('Pretty Sales publishable key is not configured');
    const response = await this.fetch(`${this.url}/rest/v1/${name}?${query}`, { headers: { apikey: this.key, Authorization: `Bearer ${this.key}` } });
    if (!response.ok) throw new Error(`Pretty Sales ${name}: ${response.status} ${await response.text()}`);
    return response.json();
  }

  async read(start, end) {
    const range = `select=*&record_date=gte.${encodeURIComponent(start)}&record_date=lte.${encodeURIComponent(end)}&order=record_date.asc`;
    const [records, staff, targets, competitions] = await Promise.all([this.table('sales_records', range), this.table('staff'), this.table('targets'), this.table('competitions')]);
    let packageCatalog = [], packageCatalogError = null;
    try { packageCatalog = await this.table('package_catalog', 'select=*&order=branch.asc,display_order.asc,package_name.asc'); }
    catch (error) { packageCatalogError = error.message; }
    return { records, staff, targets, competitions, packageCatalog, packageCatalogError };
  }
}
