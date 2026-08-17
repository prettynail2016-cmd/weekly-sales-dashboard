const STORAGE_KEY = 'pretty-weekly-dashboard-sections-v1';

export class SectionSettingsRepository {
  constructor(registry, storage = globalThis.localStorage) { this.registry = registry; this.storage = storage; }
  load() {
    let saved = {};
    try { saved = JSON.parse(this.storage?.getItem(STORAGE_KEY) || '{}'); } catch { saved = {}; }
    return this.registry.all().map(item => ({ id: item.id, title: saved[item.id]?.title || item.title, enabled: saved[item.id]?.enabled ?? item.enabled, order: saved[item.id]?.order ?? item.order }));
  }
  save(items) {
    const normalized = [...items].sort((a, b) => a.order - b.order).map((item, index) => ({ id: item.id, title: String(item.title || '').trim() || this.registry.get(item.id).title, enabled: Boolean(item.enabled), order: (index + 1) * 10 }));
    this.storage?.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(normalized.map(item => [item.id, item]))));
    return normalized;
  }
}
