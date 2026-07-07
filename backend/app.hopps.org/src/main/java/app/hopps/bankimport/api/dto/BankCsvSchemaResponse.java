package app.hopps.bankimport.api.dto;

import app.hopps.bankimport.domain.AmountStrategy;
import app.hopps.bankimport.domain.BankCsvSchema;

import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

public record BankCsvSchemaResponse(
        Long id,
        Long organizationId,
        String name,
        String bankIdentifier,
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
        List<BankCsvColumnMappingDto> columnMappings,
        boolean archived,
        Instant archivedAt,
        String createdBy,
        Instant createdAt,
        Instant updatedAt) {

    public static BankCsvSchemaResponse from(BankCsvSchema schema) {
        List<String> positiveValues = parsePositiveValues(schema.getAmountTypePositiveValues());
        List<BankCsvColumnMappingDto> mappings = schema.getColumnMappings()
                .stream()
                .map(BankCsvColumnMappingDto::from)
                .toList();

        return new BankCsvSchemaResponse(
                schema.getId(),
                schema.getOrganization() != null ? schema.getOrganization().id : null,
                schema.getName(),
                schema.getBankIdentifier(),
                String.valueOf(schema.getDelimiter()),
                String.valueOf(schema.getQuoteChar()),
                schema.getEncoding(),
                schema.getSkipLines(),
                schema.isHasHeader(),
                schema.getDateFormat(),
                String.valueOf(schema.getDecimalSeparator()),
                schema.getThousandSeparator() != null ? String.valueOf(schema.getThousandSeparator()) : null,
                schema.getAmountStrategy(),
                positiveValues,
                mappings,
                schema.isArchived(),
                schema.getArchivedAt(),
                schema.getCreatedBy(),
                schema.getCreatedAt(),
                schema.getUpdatedAt());
    }

    private static List<String> parsePositiveValues(String csv) {
        if (csv == null || csv.isBlank()) {
            return List.of();
        }
        return Arrays.stream(csv.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toList());
    }
}
