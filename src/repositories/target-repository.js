const STORAGE_KEY = 'pretty-weekly-dashboard-targets-v1';

export class TargetRepository {
  constructor(storage = globalThis.localStorage) { this.storage = storage; }
  all() { try { return JSON.parse(this.storage?.getItem(STORAGE_KEY) || '{}'); } catch { return {}; } }
  get(yearMonth) { return this.all()[yearMonth] || { overall: 0, sutera: 0, eco: 0 }; }
  save(yearMonth, values) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(yearMonth)) throw new Error('A valid month is required.');
    const target = Object.fromEntries(['overall', 'sutera', 'eco'].map(scope => [scope, Number(values[scope])]));
    if (Object.values(target).some(value => !Number.isFinite(value) || value < 0)) throw new Error('Targets must be zero or positive amounts.');
    const all = this.all(); all[yearMonth] = target;
    this.storage?.setItem(STORAGE_KEY, JSON.stringify(all));
    return target;
  }
}
