package app.hopps.bankimport.api.dto;

import app.hopps.bankimport.domain.BankCsvColumnMapping;
import app.hopps.bankimport.domain.BankFieldType;
import jakarta.validation.constraints.NotNull;

/**
 * DTO for a single column mapping inside a {@link app.hopps.bankimport.domain.BankCsvSchema}. Either
 * {@code sourceColumnIndex} or {@code sourceColumnName} must be set; if both are set, index wins.
 */
public record BankCsvColumnMappingDto(
        @NotNull BankFieldType targetField,
        Integer sourceColumnIndex,
        String sourceColumnName,
        String transform) {

    public static BankCsvColumnMappingDto from(BankCsvColumnMapping mapping) {
        return new BankCsvColumnMappingDto(
                mapping.getTargetField(),
                mapping.getSourceColumnIndex(),
                mapping.getSourceColumnName(),
                mapping.getTransform());
    }
}
