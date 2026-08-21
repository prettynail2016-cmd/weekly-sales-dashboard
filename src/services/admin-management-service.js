import { runtimeConfig } from '../config/runtime-config.js';
import { supabase } from './supabase-service.js';
const endpoint=`${runtimeConfig.prettySales.url}/functions/v1/dashboard-admin-management`;
async function call(action,payload={}){const{data:{session}}=await supabase.auth.getSession();if(!session)throw new Error('Owner login required.');const response=await fetch(endpoint,{method:'POST',headers:{'content-type':'application/json',apikey:runtimeConfig.prettySales.publishableKey,authorization:`Bearer ${session.access_token}`},body:JSON.stringify({action,...payload})});const result=await response.json().catch(()=>({}));if(!response.ok)throw new Error(result.error||'Admin operation failed.');return result;}
export const listDashboardAdmins=()=>call('list');
export const inviteDashboardAdmin=email=>call('invite',{email});
export const deactivateDashboardAdmin=targetUserId=>call('deactivate',{targetUserId});
export const transferDashboardOwner=(targetUserId,deactivateOld=false)=>call('transfer',{targetUserId,deactivateOld});
