import { runtimeConfig } from '../config/runtime-config.js';
import { supabase, requireAdmin } from './supabase-service.js';

const endpoint = `${runtimeConfig.prettySales.url}/functions/v1/weekly-dashboard-data`;
export async function readPublicSettings(yearMonths) {
  const response = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json', apikey: runtimeConfig.prettySales.publishableKey, authorization: `Bearer ${runtimeConfig.prettySales.publishableKey}` }, body: JSON.stringify({ action: 'settings', yearMonths }) });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.detail || result.error || 'Unable to load Cloud Settings');
  return result;
}
export async function saveTargets(yearMonth, values) {
  const user = await requireAdmin();
  const rows = ['overall', 'sutera', 'eco'].map(scope => ({ year_month: yearMonth, scope, amount: Number(values[scope]), currency: 'MYR', updated_by: user.id }));
  if (rows.some(row => !Number.isFinite(row.amount) || row.amount < 0)) throw new Error('Targets must be zero or positive amounts.');
  const { error } = await supabase.from('dashboard_targets').upsert(rows, { onConflict: 'year_month,scope' });
  if (error) throw error;
  return values;
}
export async function saveSectionSettings(items) {
  const user = await requireAdmin();
  const rows = items.map(item => ({ section_id: item.id, enabled: item.enabled, display_title: item.title, display_order: item.order, updated_by: user.id }));
  const { error } = await supabase.from('dashboard_section_settings').upsert(rows, { onConflict: 'section_id' });
  if (error) throw error;
  return items;
}
