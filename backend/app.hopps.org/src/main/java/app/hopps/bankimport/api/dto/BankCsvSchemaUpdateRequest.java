package app.hopps.bankimport.api.dto;

import app.hopps.bankimport.domain.AmountStrategy;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Partial update payload for a CSV mapping schema. Null fields stay untouched. When {@code columnMappings} is non-null
 * it fully replaces the existing list.
 */
public record BankCsvSchemaUpdateRequest(
        String name,
        String bankIdentifier,
        @Size(min = 1, max = 1) String delimiter,
        @Size(min = 1, max = 1) String quoteChar,
        String encoding,
        Integer skipLines,
        Boolean hasHeader,
        String dateFormat,
        @Size(min = 1, max = 1) String decimalSeparator,
        @Size(min = 1, max = 1) String thousandSeparator,
        AmountStrategy amountStrategy,
        List<String> amountTypePositiveValues,
        @Valid List<BankCsvColumnMappingDto> columnMappings) {
}
