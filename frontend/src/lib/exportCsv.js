function escapeCsvCell(value) {
  const str = value == null ? '' : String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

// 엑셀에서 한글이 깨지지 않도록 UTF-8 BOM을 붙여서 다운로드
export function downloadCsv(filename, headers, rows) {
  const lines = [headers, ...rows].map((row) => row.map(escapeCsvCell).join(','));
  const csv = '﻿' + lines.join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
