export const runtimeConfig = Object.freeze({
  google: {
    dailySalesSpreadsheetId: '1o50jtax8u65vGBDjyUBGMS40iyjZ3ze1kigjnT0L6Jw',
    activitySpreadsheetId: '1ZRq-vtOdt1jop_LRDP3KTyfObJ3Yq9mcHsyAo5yc5gw'
  },
  prettySales: {
    url: 'https://naflzjfcwuylxqajbkyh.supabase.co',
    // Browser-safe publishable key already exposed by the existing public app.
    // It grants no authority by itself; Supabase grants/RLS remain authoritative.
    publishableKey: 'sb_publishable_JDXijV2TvuT-mUpqLjVTCQ_8bEQRGUS'
  },
  dashboardApi: {
    maxDateRangeDays: 62,
    cacheMinutes: 5
  }
});
