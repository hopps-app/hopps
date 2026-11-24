export type CsvValue = string | number | null | undefined;

// A spreadsheet runs a cell starting with one of these as a formula, and names on receipts come from outside.
const FORMULA_START = /^[=+\-@\t\r\n]/;
const PLAIN_NUMBER = /^-?\d+([.,]\d+)?$/;

/** One cell for a semicolon-separated file: neutralizes formulas (negative amounts stay numbers) and quotes if needed. */
export function csvCell(value: CsvValue): string {
    const text = String(value ?? '');
    const safe = FORMULA_START.test(text) && !PLAIN_NUMBER.test(text) ? `'${text}` : text;
    return /[";\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** Semicolon-separated with CRLF line ends, which is what Excel opens directly in a German locale. */
export function toCsv(rows: CsvValue[][]): string {
    return rows.map((row) => row.map(csvCell).join(';')).join('\r\n');
}

export function downloadCsv(fileName: string, csv: string): void {
    // BOM so Excel reads UTF-8 (umlauts) correctly
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
}
