export class EdgeGoogleSheetsClient {
  constructor(config, fetchImpl = globalThis.fetch.bind(globalThis)) {
    this.endpoint = `${config.url}/functions/v1/weekly-dashboard-data`;
    this.key = config.publishableKey;
    this.fetch = fetchImpl;
    this.range = null;
    this.sourceById = new Map([
      [config.dailySalesSpreadsheetId, 'daily_sales'],
      [config.activitySpreadsheetId, 'activities']
    ]);
  }
  setRange(start, end) { this.range = { start, end }; }
  async call(body) {
    const response = await this.fetch(this.endpoint, { method: 'POST', headers: { 'content-type': 'application/json', apikey: this.key, authorization: `Bearer ${this.key}` }, body: JSON.stringify({ ...body, ...this.range }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const messages = { RATE_LIMITED: 'Too many refresh requests. Please wait five minutes.', GOOGLE_PERMISSION_DENIED: 'Google data source permission denied', UNABLE_TO_SYNC_GOOGLE_SHEETS: 'Unable to sync Google Sheets' };
      throw new Error(messages[result.error] || result.detail || result.error || `Dashboard data API ${response.status}`);
    }
    return result;
  }
  source(spreadsheetId) { const source = this.sourceById.get(spreadsheetId); if (!source) throw new Error('Unapproved Google data source'); return source; }
  metadata(spreadsheetId) { return this.call({ action: 'metadata', source: this.source(spreadsheetId) }); }
  values(spreadsheetId, ranges) { return this.call({ action: 'values', source: this.source(spreadsheetId), ranges }); }
  identity() { return Promise.resolve({ email: 'Server-side Google Service Account', verifiedEmail: true }); }
}
