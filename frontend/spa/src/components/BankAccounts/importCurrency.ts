import type { BankCsvColumnMappingDto, CsvPreviewResponse } from '@hopps/api-client';

/** The parts of a CSV schema (organization schema or template) needed to read the currency column of the preview. */
type SchemaLike = { skipLines?: number; hasHeader?: boolean; columnMappings?: BankCsvColumnMappingDto[] };

const CURRENCY_CODE = /^[A-Z]{3}$/;

/**
 * The currencies in the preview's sample rows: the CSV column the schema maps to CURRENCY, or the currency column of an
 * MT940 preview. Only covers the sample (the first lines of the file); the backend checks the whole file on import.
 * Returns an empty list when the currency cannot be told yet (no schema chosen, no currency column).
 */
export function previewCurrencies(preview: CsvPreviewResponse | null, schema: SchemaLike | undefined): string[] {
    if (!preview?.sampleRows) return [];

    let column: number | undefined;
    let dataRows: string[][];
    if (preview.fileType === 'MT940') {
        column = preview.headerColumns?.indexOf('currency');
        dataRows = preview.sampleRows;
    } else {
        column = schema?.columnMappings?.find((m) => m.targetField === 'CURRENCY')?.sourceColumnIndex;
        // The sample starts at the first line of the file: skip the schema's banner lines and its header line.
        dataRows = preview.sampleRows.slice((schema?.skipLines ?? 0) + (schema?.hasHeader === false ? 0 : 1));
    }
    if (column == null || column < 0) return [];

    const currencies = new Set<string>();
    for (const row of dataRows) {
        const value = row[column]?.trim().toUpperCase();
        if (value && CURRENCY_CODE.test(value)) currencies.add(value);
    }
    return [...currencies].sort();
}

/** True when the file's amounts cannot be booked in the account: another currency, or several. */
export function isCurrencyMismatch(fileCurrencies: string[], accountCurrency: string | undefined): boolean {
    if (!accountCurrency) return false;
    return fileCurrencies.length > 1 || (fileCurrencies.length === 1 && fileCurrencies[0] !== accountCurrency.toUpperCase());
}
