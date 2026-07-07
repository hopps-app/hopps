package app.hopps.bankimport.api.dto;

import app.hopps.bankimport.domain.AmountStrategy;

import java.util.List;

/**
 * Read-only system template for a CSV mapping schema (e.g. Sparkasse MT940). Templates are not stored per-org; they are
 * cloned into a {@link app.hopps.bankimport.domain.BankCsvSchema} on selection.
 */
public record BankCsvSchemaTemplateResponse(
        String templateId,
        String name,
        String bankName,
        String description,
        String delimiter,
        String quoteChar,
        String encoding,
        int skipLines,
        boolean hasHeader,
        String dateFormat,
        String decimalSeparator,
        String thousandSeparator,
        AmountStrategy amountStrategy,
        List<String> amountTypePositiveValues,
        List<BankCsvColumnMappingDto> columnMappings) {
}
