import { calculateActivity, calculateCompetition, calculateSales, summarizePrettySales } from '../domain/calculation-engine.js';
import { validateDailySales } from '../domain/validation.js';

const settle = async (name, operation) => {
  const startedAt = new Date().toISOString();
  try { return { name, status: 'success', startedAt, finishedAt: new Date().toISOString(), data: await operation() }; }
  catch (error) { return { name, status: 'failed', startedAt, finishedAt: new Date().toISOString(), error: error.message }; }
};

export async function syncWeeklyData({ start, end, dailySales, prettySales, activity }) {
  const [daily, pretty, cuccio, birthday] = await Promise.all([
    settle('Daily Sales', () => dailySales.read(start, end)),
    settle('Pretty Sales', () => prettySales.read(start, end)),
    settle('Cuccio', () => activity.read(start, end, 'cuccio')),
    settle('Birthday', () => activity.read(start, end, 'birthday'))
  ]);
  const dailyRecords = daily.data?.records || [], cuccioRecords = cuccio.data?.records || [], birthdayRecords = birthday.data?.records || [];
  return {
    range: { start, end }, sources: [daily, pretty, cuccio, birthday],
    totals: {
      sales: calculateSales(dailyRecords),
      cuccio: calculateActivity(cuccioRecords, 'cuccio'),
      birthday: calculateActivity(birthdayRecords, 'birthday'),
      prettySales: summarizePrettySales(pretty.data?.records || [], pretty.data?.packageCatalog || []),
      competition: calculateCompetition(pretty.data?.records || [], start, end)
    },
    validation: validateDailySales(dailyRecords, start, end),
    records: { dailySales: dailyRecords, cuccio: cuccioRecords, birthday: birthdayRecords }
  };
}
