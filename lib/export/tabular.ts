type Primitive = string | number | boolean | null | undefined;

export type Row = Record<string, Primitive>;

function escapeCsvValue(v: Primitive): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  // Escape if contains special chars
  if (/[",\r\n]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
  return s;
}

export function toCsv(rows: Row[], opts?: { bom?: boolean }): string {
  const bom = opts?.bom ?? true; // Excel-friendly UTF-8 BOM by default
  if (!rows || rows.length === 0) return bom ? '\uFEFF' : '';

  const headers = Array.from(
    rows.reduce((set, r) => {
      Object.keys(r || {}).forEach((k) => set.add(k));
      return set;
    }, new Set<string>())
  );

  const lines: string[] = [];
  lines.push(headers.map((h) => escapeCsvValue(h)).join(','));
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCsvValue((row || {})[h])).join(','));
  }

  const csv = lines.join('\r\n');
  return bom ? `\uFEFF${csv}` : csv;
}

function escapeHtml(s: string) {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/**
 * Generates an Excel-compatible `.xls` file using HTML table markup.
 * Excel opens this reliably on Windows/Android and it avoids heavy xlsx deps.
 */
export function toExcelHtml(rows: Row[], sheetName = 'Sheet1'): string {
  const safeSheet = sheetName || 'Sheet1';
  const headers = Array.from(
    rows.reduce((set, r) => {
      Object.keys(r || {}).forEach((k) => set.add(k));
      return set;
    }, new Set<string>())
  );

  const thead = `<tr>${headers
    .map((h) => `<th style="font-weight:700;background:#F1F5F9">${escapeHtml(h)}</th>`)
    .join('')}</tr>`;

  const tbody = rows
    .map((r) => {
      return `<tr>${headers
        .map((h) => `<td>${escapeHtml(String((r || {})[h] ?? ''))}</td>`)
        .join('')}</tr>`;
    })
    .join('');

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    <title>${escapeHtml(safeSheet)}</title>
  </head>
  <body>
    <table border="1" cellspacing="0" cellpadding="6">
      <thead>${thead}</thead>
      <tbody>${tbody}</tbody>
    </table>
  </body>
</html>`;
}
