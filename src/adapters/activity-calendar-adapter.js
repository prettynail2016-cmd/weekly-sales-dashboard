import { Branch, DataState, datesBetween, isoDate } from '../domain/model.js';
import { parseAmount } from './daily-sales-adapter.js';

const monthCodes = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
export const activitySheetName = (branch, date, category) => `${branch === Branch.SUTERA ? 'SUTERA' : 'ECO'} ${monthCodes[Number(date.slice(5, 7)) - 1]} ${date.slice(0, 4)} ${category.toUpperCase()}`;
const weekdays = ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'];
const cellName = (row, column) => `${String.fromCharCode(65 + column)}${row + 1}`;
export const normalizeSheetTitle = title => String(title ?? '').trim().replace(/\s+/g, ' ').toUpperCase();

export function resolveSheetTitles(requestedTitles, actualTitles) {
  const actualByNormalized = new Map(actualTitles.map(title => [normalizeSheetTitle(title), title]));
  return requestedTitles.map(requestedTitle => ({
    requestedTitle,
    actualTitle: actualByNormalized.get(normalizeSheetTitle(requestedTitle)) || null
  }));
}

export function detectCalendarLayout(values, year, month) {
  const headerRow = values.findIndex(row => weekdays.every((day, index) => String(row?.[index + 1] ?? '').trim().toUpperCase() === day));
  const totalRow = values.findIndex(row => row?.some(value => String(value ?? '').trim().toUpperCase() === 'MONTHLY TOTAL'));
  if (headerRow < 0 || totalRow < 0 || totalRow <= headerRow + 2) return { valid: false, warning: 'Calendar weekday header or MONTHLY TOTAL not found', pairs: [] };
  const pairs = [], seen = [];
  for (let dateRow = headerRow + 1; dateRow + 1 < totalRow; dateRow += 2) {
    for (let column = 1; column <= 7; column++) {
      const day = Number(values[dateRow]?.[column]);
      if (!Number.isInteger(day) || !isoDate(year, month, day)) continue;
      pairs.push({ dateRow, dateColumn: column, valueRow: dateRow + 1, valueColumn: column });
      seen.push(day);
    }
  }
  const expectedDays = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const expected = Array.from({ length: expectedDays }, (_, index) => index + 1);
  const valid = seen.length === expected.length && seen.every((day, index) => day === expected[index]);
  return { valid, warning: valid ? null : `Calendar dates are not exactly 1–${expectedDays}`, pairs, headerRow, totalRow };
}

// Calendar layouts vary. Phase 2A requires detected cell pairs or an explicit map,
// never a guessed positional total.
export function parseCalendarCells(values, { year, month, branch, category, sourceSheet, pairs }) {
  return pairs.flatMap(({ dateRow, dateColumn, valueRow, valueColumn }) => {
    const day = Number(values[dateRow]?.[dateColumn]);
    const date = isoDate(year, month, day);
    if (!date) return [];
    const rawValue = values[valueRow]?.[valueColumn] ?? '';
    const parsed = parseAmount(rawValue);
    return [{ date, branch, metric: category, rawValue, ...parsed, source: 'activitySheet', sourceSheet, sourceCell: cellName(valueRow, valueColumn) }];
  });
}

export class ActivityCalendarAdapter {
  constructor(client, spreadsheetId, layoutRegistry = {}) { this.client = client; this.spreadsheetId = spreadsheetId; this.layouts = layoutRegistry; }
  async read(start, end, category) {
    const dates = datesBetween(start, end), months = [...new Set(dates.map(date => date.slice(0, 7)))];
    const names = months.flatMap(month => [Branch.SUTERA, Branch.ECO].map(branch => activitySheetName(branch, `${month}-01`, category)));
    const metadata = await this.client.metadata(this.spreadsheetId);
    const availableSheets = metadata.sheets.map(sheet => sheet.properties);
    const resolved = resolveSheetTitles(names, availableSheets.map(sheet => sheet.title));
    const missingSheets = resolved.filter(item => !item.actualTitle).map(item => item.requestedTitle);
    const readableSheets = resolved.filter(item => item.actualTitle);
    if (!readableSheets.length) return { records: [], missingSheets, unreadableLayouts: [], availableSheets, sourceTitle: metadata.properties.title };
    const response = await this.client.values(this.spreadsheetId, readableSheets.map(item => `'${item.actualTitle.replaceAll("'", "''")}'`));
    const unreadableLayouts = [], layoutDetails = [];
    const records = (response.valueRanges || []).flatMap((range, index) => {
      const { requestedTitle, actualTitle: name } = readableSheets[index];
      const match = normalizeSheetTitle(requestedTitle).match(/^(SUTERA|ECO) ([A-Z]{3}) (\d{4}) /), branch = match?.[1] === 'SUTERA' ? Branch.SUTERA : Branch.ECO;
      const year = Number(match?.[3]), month = monthCodes.indexOf(match?.[2]) + 1;
      const detected = this.layouts[name] || this.layouts[requestedTitle] || detectCalendarLayout(range.values || [], year, month);
      layoutDetails.push({ requestedName: requestedTitle, name, valid: detected.valid !== false, warning: detected.warning, headerRow: detected.headerRow == null ? null : detected.headerRow + 1, totalRow: detected.totalRow == null ? null : detected.totalRow + 1, pairs: detected.pairs?.length || 0 });
      if (detected.valid === false) { unreadableLayouts.push(name); return []; }
      return parseCalendarCells(range.values || [], { year, month, branch, category, sourceSheet: name, pairs: detected.pairs });
    }).filter(row => row.date >= start && row.date <= end);
    return { records, missingSheets, unreadableLayouts, availableSheets, layoutDetails, sourceTitle: metadata.properties.title };
  }
}
