import { Branch } from './model.js';
import { buildPackageSummary } from './package-catalog.js';
import { buildProductSummary } from './product-normalizer.js';

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

export function summarizePrettySales(records, packageCatalog = []) {
  const by = (branch, type) => records.filter(row => row.branch === branch && row.sale_type === type);
  const summarize = rows => ({ quantity: sum(rows.map(row => row.quantity)), amount: sum(rows.map(row => row.amount)), records: rows.length });
  return {
    packages: {
      sutera: { ...summarize(by(Branch.SUTERA, 'package')), items: buildPackageSummary(records, packageCatalog, Branch.SUTERA) },
      eco: { ...summarize(by(Branch.ECO, 'package')), items: buildPackageSummary(records, packageCatalog, Branch.ECO) }
    },
    products: { sutera: buildProductSummary(records, Branch.SUTERA), eco: buildProductSummary(records, Branch.ECO) }
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

const metricValue = (row, metric) => ['amount', 'amount_quantity'].includes(metric)
  ? Math.round(row.amount * 100) / 100
  : Math.round(row.quantity * 10000) / 10000;

export function denseRank(rows, metric = 'amount') {
  let rank = 0, previous;
  return [...rows].sort((a, b) => metricValue(b, metric) - metricValue(a, metric) || a.staff.localeCompare(b.staff))
    .map((item, index) => {
      const value = metricValue(item, metric), firstInRank = index === 0 || value !== previous;
      if (firstInRank) rank += 1;
      previous = value;
      return { rank, firstInRank, ...item };
    });
}

export function calculateCompetition(records, start, end, competitions = []) {
  return competitionWindows(start, end).flatMap(window => [Branch.SUTERA, Branch.ECO].flatMap(branch => ['package', 'product'].map(saleType => {
    const rows = records.filter(row => row.record_date >= window.rangeStart && row.record_date <= window.rangeEnd && row.branch === branch && row.sale_type === saleType);
    const competitionId = rows.find(row => row.competition_id)?.competition_id || saleType;
    const definition = competitions.find(item => item.id === competitionId || item.competition_id === competitionId) || {};
    const metricType = definition.metric_type || 'amount';
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
    const ranked = denseRank([...ranking.values()].map(item => ({ ...item, quantity: sum([item.quantity]), amount: sum([item.amount]) })), metricType);
    return {
      ...window, branch, saleType, competitionId, metricType, competitionName: definition.display_name || definition.name || saleType,
      result: { quantity: sum(staffRows.map(row => row.quantity)), amount: sum(staffRows.map(row => row.amount)), records: staffRows.length },
      counter: { quantity: sum(counterRows.map(row => row.quantity)), amount: sum(counterRows.map(row => row.amount)), records: counterRows.length },
      ranking: ranked
    };
  })));
}
