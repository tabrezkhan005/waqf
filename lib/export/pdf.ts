import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import type { Row } from '@/lib/export/tabular';

function escapeHtml(s: string) {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function buildTableHtml(rows: Row[]) {
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

  return `<table border="1" cellspacing="0" cellpadding="6">
    <thead>${thead}</thead>
    <tbody>${tbody}</tbody>
  </table>`;
}

/**
 * Generates a PDF from tabular rows using an HTML table.
 * This avoids needing a writable cache/document directory directly from expo-file-system.
 */
export async function exportRowsToPdf(opts: {
  filenameBase: string; // without extension
  title: string;
  rows: Row[];
}): Promise<{ uri: string }> {
  // Large PDFs can fail on some Android devices. Keep PDF lightweight.
  const maxRows = 300;
  const truncated = opts.rows.length > maxRows;
  const rowsForPdf = truncated ? opts.rows.slice(0, maxRows) : opts.rows;

  const tableHtml = buildTableHtml(rowsForPdf);

  // Wrap in a printable template
  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      body { font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; padding: 18px; }
      h1 { font-size: 18px; margin: 0 0 12px 0; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #D1D5DB; padding: 6px; font-size: 11px; }
      th { background: #F1F5F9; }
      .meta { color: #6B7280; font-size: 11px; margin-bottom: 12px; }
      .warn { color: #B45309; font-size: 11px; margin-bottom: 12px; }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(opts.title)}</h1>
    <div class="meta">Generated: ${escapeHtml(new Date().toLocaleString())}</div>
    ${truncated ? `<div class="warn">Showing first ${maxRows} rows (of ${opts.rows.length}). Export CSV/Excel for full data.</div>` : ''}
    ${tableHtml}
  </body>
</html>`;

  // Android: use system print dialog → user can "Save as PDF" without us writing to app storage.
  if (Platform.OS === 'android') {
    await Print.printAsync({ html });
    return { uri: 'android-print-dialog' };
  }

  // iOS: create file then share (works reliably)
  const file = await Print.printToFileAsync({ html });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/pdf',
      dialogTitle: 'Export PDF report',
    });
  }

  return { uri: file.uri };
}
