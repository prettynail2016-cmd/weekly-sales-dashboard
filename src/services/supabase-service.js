import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
import { runtimeConfig } from '../config/runtime-config.js';

export const supabase = createClient(runtimeConfig.prettySales.url, runtimeConfig.prettySales.publishableKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

export async function requireAdmin() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Admin login required.');
  const { data, error } = await supabase.from('dashboard_admins').select('user_id,email,active,role').eq('user_id', user.id).eq('active', true).maybeSingle();
  if (error || !data) throw new Error('This account is not an authorised Dashboard Admin.');
  return Object.assign(user, { dashboardRole: data.role || 'admin' });
}
