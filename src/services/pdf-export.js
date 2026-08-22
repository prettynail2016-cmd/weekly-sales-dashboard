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

export function resolveBossPdfOrientation(summary, requested = 'auto') {
  if (requested === 'portrait' || requested === 'landscape') return requested;
  if (!summary) return 'landscape';
  const count = selector => summary.querySelectorAll?.(selector)?.length || 0;
  const productRows = count('.boss-product-list .boss-item-list span');
  const packageRows = count('.boss-package-list .boss-item-list span');
  const rankingRows = count('.boss-rank-row');
  const stages = count('.boss-stage');
  const wideDataWeight = productRows + packageRows + rankingRows + stages * 4;
  const hasWideTables = productRows > 0 || packageRows > 0 || rankingRows > 0;
  const sectionCount = Number(summary.dataset?.sectionCount || 0);
  return hasWideTables || wideDataWeight > 10 || sectionCount > 4 ? 'landscape' : 'portrait';
}

export function openBossPrintDialog({ start, end, orientation = 'auto', documentRef = document, windowRef = window }) {
  const filename = pdfFilename(start, end).replace('WEEKLY DASHBOARD', 'BOSS SUMMARY');
  const previousTitle = documentRef.title;
  const summary = documentRef.querySelector?.('.boss-summary');
  const resolvedOrientation = resolveBossPdfOrientation(summary, orientation);
  const orientationClass = `printing-boss-${resolvedOrientation}`;
  const pageStyle = documentRef.createElement?.('style');
  if (pageStyle) { pageStyle.id = 'boss-print-page-style'; pageStyle.textContent = `@page{size:A4 ${resolvedOrientation};margin:5mm}`; documentRef.head?.appendChild(pageStyle); }
  documentRef.title = filename.replace(/\.pdf$/i, '');
  documentRef.body.classList.add('printing-boss-summary');
  documentRef.body.classList.add(orientationClass);
  if (summary) summary.dataset.printOrientation = resolvedOrientation;
  if (summary) summary.style.setProperty('--boss-print-scale', '0.96');
  const fitForPrint = () => {
    if (!summary) return;
    summary.style.setProperty('--boss-print-scale', '1');
    const cssPixelsPerMm = 96 / 25.4;
    const printableWidth = (resolvedOrientation === 'landscape' ? 287 : 200) * cssPixelsPerMm;
    const printableHeight = (resolvedOrientation === 'landscape' ? 200 : 287) * cssPixelsPerMm;
    const widthFit = printableWidth / Math.max(summary.scrollWidth, 1);
    const heightFit = printableHeight / Math.max(summary.scrollHeight, 1);
    const printLayoutReady = summary.scrollWidth <= printableWidth * 1.08;
    const scale = printLayoutReady
      ? Math.max(0.1, Math.min(1, widthFit * 0.975, heightFit * 0.965))
      : 0.96;
    summary.style.setProperty('--boss-print-scale', scale.toFixed(4));
    summary.dataset.printFit = JSON.stringify({ widthFit, heightFit, scale, printLayoutReady, contentWidth: summary.scrollWidth, contentHeight: summary.scrollHeight });
  };
  const restore = () => {
    documentRef.title = previousTitle;
    documentRef.body.classList.remove('printing-boss-summary');
    documentRef.body.classList.remove(orientationClass);
    pageStyle?.remove();
    summary?.style.removeProperty('--boss-print-scale');
    if (summary) { delete summary.dataset.printFit; delete summary.dataset.printOrientation; }
    windowRef.removeEventListener('beforeprint', fitForPrint);
    windowRef.removeEventListener('afterprint', restore);
  };
  windowRef.addEventListener('beforeprint', fitForPrint);
  windowRef.addEventListener('afterprint', restore);
  windowRef.requestAnimationFrame(() => windowRef.print());
  return filename;
}
