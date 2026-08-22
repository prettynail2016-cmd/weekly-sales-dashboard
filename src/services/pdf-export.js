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

export function openBossPrintDialog({ start, end, documentRef = document, windowRef = window }) {
  const filename = pdfFilename(start, end).replace('WEEKLY DASHBOARD', 'BOSS SUMMARY');
  const previousTitle = documentRef.title;
  const summary = documentRef.querySelector?.('.boss-summary');
  documentRef.title = filename.replace(/\.pdf$/i, '');
  documentRef.body.classList.add('printing-boss-summary');
  if (summary) summary.style.setProperty('--boss-print-scale', '0.96');
  const fitForPrint = () => {
    if (!summary) return;
    summary.style.setProperty('--boss-print-scale', '1');
    const cssPixelsPerMm = 96 / 25.4;
    const printableWidth = 287 * cssPixelsPerMm; // A4 landscape with 5 mm margins.
    const printableHeight = 200 * cssPixelsPerMm;
    const widthFit = printableWidth / Math.max(summary.scrollWidth, 1);
    const heightFit = printableHeight / Math.max(summary.scrollHeight, 1);
    const scale = Math.max(0.1, Math.min(1, widthFit * 0.975, heightFit * 0.965));
    summary.style.setProperty('--boss-print-scale', scale.toFixed(4));
    summary.dataset.printFit = JSON.stringify({ widthFit, heightFit, scale });
  };
  const restore = () => {
    documentRef.title = previousTitle;
    documentRef.body.classList.remove('printing-boss-summary');
    summary?.style.removeProperty('--boss-print-scale');
    if (summary) delete summary.dataset.printFit;
    windowRef.removeEventListener('beforeprint', fitForPrint);
    windowRef.removeEventListener('afterprint', restore);
  };
  windowRef.addEventListener('beforeprint', fitForPrint);
  windowRef.addEventListener('afterprint', restore);
  windowRef.requestAnimationFrame(() => windowRef.print());
  return filename;
}
