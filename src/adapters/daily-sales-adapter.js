import { Branch, DataState, datesBetween, isoDate } from '../domain/model.js';

const normalize = value => String(value ?? '').trim().toUpperCase().replace(/[.\s_-]+/g, '');
const branchOf = value => normalize(value) === 'SUTERA' ? Branch.SUTERA : normalize(value) === 'ECO' ? Branch.ECO : null;
const monthOf = value => {
  const match = String(value ?? '').trim().match(/^(1[0-2]|[1-9])(?:月|MONTH)?$/i);
  return match ? Number(match[1]) : null;
};
const isTotalSales = value => ['TSALES', 'TOTALSALES'].includes(normalize(value));

function columnName(index) {
  let value = index + 1, name = '';
  while (value) { value--; name = String.fromCharCode(65 + value % 26) + name; value = Math.floor(value / 26); }
  return name;
}

export function parseAmount(raw) {
  if (raw === '' || raw == null) return { value: null, state: DataState.BLANK };
  const cleaned = typeof raw === 'number' ? raw : Number(String(raw).replace(/RM|,/gi, '').trim());
  if (!Number.isFinite(cleaned)) return { value: null, state: DataState.INVALID };
  return { value: cleaned, state: cleaned === 0 ? DataState.ZERO : DataState.OK };
}

export function parseDailySalesGrid(values, year, sourceSheet) {
  const [branchRow = [], monthRow = [], metricRow = []] = values;
  const width = Math.max(branchRow.length, monthRow.length, metricRow.length);
  const columns = [];
  let branch = null, month = null;
  for (let column = 0; column < width; column++) {
    branch = branchOf(branchRow[column]) || branch;
    month = monthOf(monthRow[column]) || month;
    if (branch && month && isTotalSales(metricRow[column])) columns.push({ column, branch, month });
  }
  const records = [];
  for (let row = 3; row < values.length; row++) {
    const day = Number(values[row]?.[0]);
    if (!Number.isInteger(day) || day < 1 || day > 31) continue;
    for (const descriptor of columns) {
      const date = isoDate(year, descriptor.month, day);
      if (!date) continue;
      const rawValue = values[row]?.[descriptor.column] ?? '';
      const parsed = parseAmount(rawValue);
      records.push({ date, branch: descriptor.branch, metric: 'totalSales', rawValue, ...parsed, source: 'dailySales', sourceSheet, sourceCell: `${columnName(descriptor.column)}${row + 1}` });
    }
  }
  return { records, columns };
}

export class DailySalesAdapter {
  constructor(client, spreadsheetId) { this.client = client; this.spreadsheetId = spreadsheetId; }

  async read(start, end) {
    const years = [...new Set(datesBetween(start, end).map(value => value.slice(0, 4)))];
    const metadata = await this.client.metadata(this.spreadsheetId);
    const available = new Set(metadata.sheets.map(sheet => sheet.properties.title));
    const sheets = years.map(year => `${year}DETAILS`);
    const missing = sheets.filter(name => !available.has(name));
    const present = sheets.filter(name => available.has(name));
    const response = present.length ? await this.client.values(this.spreadsheetId, present.map(name => `'${name}'`)) : { valueRanges: [] };
    const records = response.valueRanges.flatMap((range, index) => parseDailySalesGrid(range.values || [], Number(present[index].slice(0, 4)), present[index]).records).filter(row => row.date >= start && row.date <= end);
    return { records, missingSheets: missing, sourceTitle: metadata.properties.title };
  }
}
