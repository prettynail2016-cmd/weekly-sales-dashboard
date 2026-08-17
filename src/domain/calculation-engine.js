import { Branch } from './model.js';

const sum = values => Math.round(values.reduce((total, value) => total + Number(value || 0), 0) * 100) / 100;

export function calculateSales(records) {
  const usable = records.filter(row => row.metric === 'totalSales' && Number.isFinite(row.value));
  const sutera = sum(usable.filter(row => row.branch === Branch.SUTERA).map(row => row.value));
  const eco = sum(usable.filter(row => row.branch === Branch.ECO).map(row => row.value));
  return { sutera, eco, total: sum([sutera, eco]) };
}

export function calculateActivity(records, metric) {
  const usable = records.filter(row => row.metric === metric && Number.isFinite(row.value));
  const sutera = sum(usable.filter(row => row.branch === Branch.SUTERA).map(row => row.value));
  const eco = sum(usable.filter(row => row.branch === Branch.ECO).map(row => row.value));
  return { sutera, eco, total: sum([sutera, eco]) };
}

export function summarizePrettySales(records) {
  const by = (branch, type) => records.filter(row => row.branch === branch && row.sale_type === type);
  const summarize = rows => ({ quantity: sum(rows.map(row => row.quantity)), amount: sum(rows.map(row => row.amount)), records: rows.length });
  return {
    packages: { sutera: summarize(by(Branch.SUTERA, 'package')), eco: summarize(by(Branch.ECO, 'package')) },
    products: { sutera: summarize(by(Branch.SUTERA, 'product')), eco: summarize(by(Branch.ECO, 'product')) }
  };
}

function monthEnd(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function competitionWindows(start, end) {
  const windows = [];
  let cursor = new Date(`${start.slice(0, 7)}-01T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  while (cursor <= last) {
    const year = cursor.getUTCFullYear(), month = cursor.getUTCMonth() + 1;
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    const candidates = [
      { month: prefix, stage: 'first', stageStart: `${prefix}-01`, stageEnd: `${prefix}-15` },
      { month: prefix, stage: 'second', stageStart: `${prefix}-16`, stageEnd: `${prefix}-${monthEnd(year, month)}` }
    ];
    for (const item of candidates) {
      const rangeStart = item.stageStart > start ? item.stageStart : start;
      const rangeEnd = item.stageEnd < end ? item.stageEnd : end;
      if (rangeStart <= rangeEnd) windows.push({ ...item, rangeStart, rangeEnd });
    }
    const fullStart = `${prefix}-01`, fullEnd = `${prefix}-${monthEnd(year, month)}`;
    if (start <= fullStart && end >= fullEnd) windows.push({ month: prefix, stage: 'month', stageStart: fullStart, stageEnd: fullEnd, rangeStart: fullStart, rangeEnd: fullEnd });
    cursor = new Date(Date.UTC(year, month, 1));
  }
  return windows;
}

export function calculateCompetition(records, start, end) {
  return competitionWindows(start, end).flatMap(window => [Branch.SUTERA, Branch.ECO].flatMap(branch => ['package', 'product'].map(saleType => {
    const rows = records.filter(row => row.record_date >= window.rangeStart && row.record_date <= window.rangeEnd && row.branch === branch && row.sale_type === saleType);
    const staffRows = rows.filter(row => !row.company_sale), counterRows = rows.filter(row => row.company_sale);
    const ranking = new Map();
    for (const row of staffRows) {
      const codes = row.staff_codes || [], divisor = Math.max(1, codes.length);
      for (const code of codes) {
        const current = ranking.get(code) || { staff: code, quantity: 0, amount: 0 };
        current.quantity += Number(row.quantity || 0) / divisor;
        current.amount += Number(row.amount || 0) / divisor;
        ranking.set(code, current);
      }
    }
    const ranked = [...ranking.values()].map(item => ({ ...item, quantity: sum([item.quantity]), amount: sum([item.amount]) })).sort((a, b) => b.amount - a.amount || a.staff.localeCompare(b.staff)).map((item, index) => ({ rank: index + 1, ...item }));
    return {
      ...window, branch, saleType,
      result: { quantity: sum(staffRows.map(row => row.quantity)), amount: sum(staffRows.map(row => row.amount)), records: staffRows.length },
      counter: { quantity: sum(counterRows.map(row => row.quantity)), amount: sum(counterRows.map(row => row.amount)), records: counterRows.length },
      ranking: ranked
    };
  })));
}
