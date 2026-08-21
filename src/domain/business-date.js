export const BUSINESS_TIME_ZONE = 'Asia/Kuala_Lumpur';

const localParts = value => Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
  timeZone: BUSINESS_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit'
}).formatToParts(value).filter(part => part.type !== 'literal').map(part => [part.type, part.value]));

export function malaysiaCalendarDate(value = new Date(), dayOffset = 0) {
  const parts = localParts(value);
  const calendar = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day) + dayOffset, 12));
  return calendar.toISOString().slice(0, 10);
}

export const latestCompletedDay = (value = new Date()) => malaysiaCalendarDate(value, -1);
