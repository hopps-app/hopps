package app.hopps.bankimport.api.dto;

import app.hopps.bankimport.domain.AmountStrategy;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * Request payload for creating a CSV mapping schema. Single-character separators are sent as 1-char strings to keep the
 * JSON ergonomic for the frontend.
 */
public record BankCsvSchemaCreateRequest(
        @NotBlank String name,
        String bankIdentifier,
        @Size(min = 1, max = 1) String delimiter,
        @Size(min = 1, max = 1) String quoteChar,
        String encoding,
        Integer skipLines,
        Boolean hasHeader,
        String dateFormat,
        @Size(min = 1, max = 1) String decimalSeparator,
        @Size(min = 1, max = 1) String thousandSeparator,
        @NotNull AmountStrategy amountStrategy,
        List<String> amountTypePositiveValues,
        @Valid @NotNull List<BankCsvColumnMappingDto> columnMappings) {
}
