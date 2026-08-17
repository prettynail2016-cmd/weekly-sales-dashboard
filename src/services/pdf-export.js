const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

export function pdfFilename(start, end) {
  const [startYear, startMonth, startDay] = start.split('-').map(Number);
  const [endYear, endMonth, endDay] = end.split('-').map(Number);
  if (startYear === endYear && startMonth === endMonth) return `${startDay}-${endDay} ${MONTHS[startMonth - 1]} WEEKLY DASHBOARD.pdf`;
  const yearPart = startYear === endYear ? '' : ` ${startYear}`;
  const endYearPart = startYear === endYear ? '' : ` ${endYear}`;
  return `${startDay} ${MONTHS[startMonth - 1]}${yearPart}-${endDay} ${MONTHS[endMonth - 1]}${endYearPart} WEEKLY DASHBOARD.pdf`;
}

export function openPrintDialog({ start, end, documentRef = document, windowRef = window }) {
  const filename = pdfFilename(start, end);
  const previousTitle = documentRef.title;
  documentRef.title = filename.replace(/\.pdf$/i, '');
  documentRef.body.classList.add('printing-dashboard');
  const restore = () => { documentRef.title = previousTitle; documentRef.body.classList.remove('printing-dashboard'); windowRef.removeEventListener('afterprint', restore); };
  windowRef.addEventListener('afterprint', restore);
  windowRef.requestAnimationFrame(() => windowRef.print());
  return filename;
}
