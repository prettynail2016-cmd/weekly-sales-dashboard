export class GoogleSheetsClient {
  constructor(accessToken, fetchImpl = globalThis.fetch.bind(globalThis)) { this.accessToken = accessToken; this.fetch = fetchImpl; }

  async request(path) {
    if (!this.accessToken) throw new Error('Google OAuth access token is required');
    const response = await this.fetch(`https://sheets.googleapis.com/v4/spreadsheets/${path}`, {
      headers: { Authorization: `Bearer ${this.accessToken}` }
    });
    if (!response.ok) {
      const detail = await response.json().catch(() => ({}));
      throw new Error(detail.error?.message || `Google Sheets API ${response.status}`);
    }
    return response.json();
  }

  metadata(spreadsheetId) {
    return this.request(`${spreadsheetId}?fields=spreadsheetId,properties.title,sheets.properties`);
  }

  values(spreadsheetId, ranges) {
    const query = ranges.map(range => `ranges=${encodeURIComponent(range)}`).join('&');
    return this.request(`${spreadsheetId}/values:batchGet?majorDimension=ROWS&valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING&${query}`);
  }

  inspectRanges(spreadsheetId, ranges) {
    const query = ranges.map(range => `ranges=${encodeURIComponent(range)}`).join('&');
    const fields = 'properties.title,sheets(properties(sheetId,title,gridProperties,hidden),merges,data(startRow,startColumn,rowData(values(effectiveValue,formattedValue,userEnteredValue,note)),rowMetadata(hiddenByUser,hiddenByFilter),columnMetadata(hiddenByUser)))';
    return this.request(`${spreadsheetId}?includeGridData=true&${query}&fields=${encodeURIComponent(fields)}`);
  }

  async identity() {
    if (!this.accessToken) throw new Error('Google OAuth access token is required');
    const response = await this.fetch('https://www.googleapis.com/oauth2/v2/userinfo', { headers: { Authorization: `Bearer ${this.accessToken}` } });
    if (!response.ok) throw new Error('Email identity scope was not granted');
    const data = await response.json();
    return { email: data.email, verifiedEmail: data.verified_email === true };
  }
}
