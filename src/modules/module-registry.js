export class DashboardModuleRegistry {
  constructor(definitions = []) { this.definitions = new Map(definitions.map(item => [item.id, Object.freeze({ enabled: true, order: 0, ...item })])); }
  enabled(context = {}) { return [...this.definitions.values()].filter(item => item.enabled && (!item.visibleWhen || item.visibleWhen(context))).sort((a, b) => a.order - b.order); }
  configured(settings = [], context = {}) {
    const overrides = new Map(settings.map(item => [item.id, item]));
    return [...this.definitions.values()].map(item => ({ ...item, ...(overrides.get(item.id) || {}), visibleWhen: item.visibleWhen }))
      .filter(item => item.enabled && (!item.visibleWhen || item.visibleWhen(context))).sort((a, b) => a.order - b.order);
  }
  all() { return [...this.definitions.values()].sort((a, b) => a.order - b.order); }
  get(id) { return this.definitions.get(id); }
}

export const dashboardModules = new DashboardModuleRegistry([
  { id: 'totalSales', title: 'Total Sales', order: 10 },
  { id: 'branchSales', title: 'Branch Sales', order: 20 },
  { id: 'targetCompletion', title: 'Target Completion', order: 25 },
  { id: 'competition', title: 'Competition', order: 30 },
  { id: 'products', title: 'Products', order: 40 },
  { id: 'packages', title: 'Packages', order: 50 },
  { id: 'cuccio', title: 'Cuccio', order: 60 },
  { id: 'birthday', title: 'Birthday', order: 70 },
  { id: 'dataStatus', title: 'Data Status', order: 100 }
]);
