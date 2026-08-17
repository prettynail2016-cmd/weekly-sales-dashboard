import { Branch, DataState, datesBetween } from './model.js';

export function validateDailySales(records, start, end) {
  const issues = [], expected = datesBetween(start, end);
  for (const date of expected) for (const branch of [Branch.SUTERA, Branch.ECO]) {
    const matches = records.filter(row => row.date === date && row.branch === branch && row.metric === 'totalSales');
    if (!matches.length) issues.push({ severity: 'error', code: 'MISSING_DAY', date, branch, message: `${branch} ${date}: TSALES missing` });
    else if (matches.length > 1) issues.push({ severity: 'error', code: 'DUPLICATE_DAY', date, branch, message: `${branch} ${date}: multiple TSALES values` });
    else if ([DataState.BLANK, DataState.INVALID].includes(matches[0].state)) issues.push({ severity: 'warning', code: matches[0].state.toUpperCase(), date, branch, message: `${branch} ${date}: ${matches[0].state}` });
  }
  return { ok: !issues.some(issue => issue.severity === 'error'), issues, expectedDays: expected.length, validValues: records.filter(row => Number.isFinite(row.value)).length };
}
