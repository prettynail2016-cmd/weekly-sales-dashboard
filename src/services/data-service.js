import { runtimeConfig } from '../config/runtime-config.js';
import { EdgeGoogleSheetsClient } from '../adapters/edge-google-sheets-client.js';
import { DailySalesAdapter } from '../adapters/daily-sales-adapter.js';
import { ActivityCalendarAdapter } from '../adapters/activity-calendar-adapter.js';
import { PrettySalesAdapter } from '../adapters/pretty-sales-adapter.js';
import { syncWeeklyData } from './sync-service.js';

export class DashboardDataService {
  constructor() {
    this.google = new EdgeGoogleSheetsClient({ ...runtimeConfig.prettySales, ...runtimeConfig.google });
    this.dailySales = new DailySalesAdapter(this.google, runtimeConfig.google.dailySalesSpreadsheetId);
    this.activity = new ActivityCalendarAdapter(this.google, runtimeConfig.google.activitySpreadsheetId);
    this.prettySales = new PrettySalesAdapter(runtimeConfig.prettySales);
  }
  readSales(start, end) { this.google.setRange(start, end); return this.dailySales.read(start, end); }
  syncWeekly(start, end) { this.google.setRange(start, end); return syncWeeklyData({ start, end, dailySales: this.dailySales, activity: this.activity, prettySales: this.prettySales }); }
  identity() { return this.google.identity(); }
}
