package app.hopps.bankimport.service;

import app.hopps.bankimport.api.dto.BankCsvColumnMappingDto;
import app.hopps.bankimport.api.dto.BankCsvSchemaCreateRequest;
import app.hopps.bankimport.api.dto.BankCsvSchemaTemplateResponse;
import app.hopps.bankimport.api.dto.BankCsvSchemaUpdateRequest;
import app.hopps.bankimport.domain.AmountStrategy;
import app.hopps.bankimport.domain.BankCsvColumnMapping;
import app.hopps.bankimport.domain.BankCsvSchema;
import app.hopps.bankimport.domain.BankFieldType;
import app.hopps.bankimport.repository.BankCsvSchemaRepository;
import app.hopps.organization.domain.Organization;
import app.hopps.shared.security.OrganizationContext;
import io.quarkus.security.identity.SecurityIdentity;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.NotFoundException;

import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Business logic for bank CSV schemas: org-scoped CRUD, validation of mappings against the chosen
 * {@link AmountStrategy}, soft-delete, and cloning from system templates (Sparkasse MT940/CAMT v2/CAMT v8).
 */
@ApplicationScoped
public class BankCsvSchemaService {

    @Inject
    BankCsvSchemaRepository schemaRepository;

    @Inject
    SystemTemplateService systemTemplateService;

    @Inject
    OrganizationContext organizationContext;

    @Inject
    SecurityIdentity securityIdentity;

    public List<BankCsvSchema> list(boolean includeArchived) {
        return schemaRepository.listForCurrentOrganization(includeArchived);
    }

    public BankCsvSchema get(Long id) {
        BankCsvSchema schema = schemaRepository.findByIdScoped(id);
        if (schema == null) {
            throw new NotFoundException("Bank CSV schema not found");
        }
        return schema;
    }

    @Transactional
    public BankCsvSchema create(BankCsvSchemaCreateRequest request, String fromTemplateId) {
        Organization organization = requireOrganization();

        BankCsvSchema schema = new BankCsvSchema();
        schema.setOrganization(organization);
        schema.setCreatedBy(securityIdentity.getPrincipal().getName());

        if (fromTemplateId != null && !fromTemplateId.isBlank()) {
            applyTemplate(schema, systemTemplateService.requireById(fromTemplateId));
        }
        applyCreateRequest(schema, request);
        validate(schema);

        schemaRepository.persist(schema);
        return schema;
    }

    @Transactional
    public BankCsvSchema update(Long id, BankCsvSchemaUpdateRequest request) {
        BankCsvSchema schema = get(id);
        applyUpdateRequest(schema, request);
        validate(schema);
        return schema;
    }

    @Transactional
    public void archive(Long id) {
        BankCsvSchema schema = get(id);
        if (!schema.isArchived()) {
            schema.setArchived(true);
            schema.setArchivedAt(Instant.now());
        }
    }

    @Transactional
    public BankCsvSchema restore(Long id) {
        BankCsvSchema schema = get(id);
        if (schema.isArchived()) {
            schema.setArchived(false);
            schema.setArchivedAt(null);
        }
        return schema;
    }

    @Transactional
    public void delete(Long id) {
        BankCsvSchema schema = get(id);
        if (schemaRepository.isReferenced(schema.getId())) {
            throw new BadRequestException(
                    "Schema is referenced by a bank account or import — archive it instead of deleting");
        }
        schemaRepository.delete(schema);
    }

    public List<BankCsvSchemaTemplateResponse> listTemplates() {
        return systemTemplateService.list();
    }

    // -------------------------------------------------------------------------------------------
    // Internal: apply request → entity, template → entity, and validate the resulting state.
    // -------------------------------------------------------------------------------------------

    private void applyTemplate(BankCsvSchema schema, BankCsvSchemaTemplateResponse template) {
        schema.setName(template.name());
        schema.setBankIdentifier(template.bankName());
        schema.setDelimiter(singleChar(template.delimiter(), ';'));
        schema.setQuoteChar(singleChar(template.quoteChar(), '"'));
        schema.setEncoding(defaultIfBlank(template.encoding(), "UTF-8"));
        schema.setSkipLines(template.skipLines());
        schema.setHasHeader(template.hasHeader());
        schema.setDateFormat(defaultIfBlank(template.dateFormat(), "dd.MM.yyyy"));
        schema.setDecimalSeparator(singleChar(template.decimalSeparator(), ','));
        schema.setThousandSeparator(optionalChar(template.thousandSeparator()));
        schema.setAmountStrategy(template.amountStrategy());
        schema.setAmountTypePositiveValues(joinValues(template.amountTypePositiveValues()));
        replaceMappings(schema, template.columnMappings());
    }

    private void applyCreateRequest(BankCsvSchema schema, BankCsvSchemaCreateRequest request) {
        schema.setName(request.name());
        if (request.bankIdentifier() != null) {
            schema.setBankIdentifier(request.bankIdentifier());
        }
        if (request.delimiter() != null) {
            schema.setDelimiter(singleChar(request.delimiter(), ';'));
        }
        if (request.quoteChar() != null) {
            schema.setQuoteChar(singleChar(request.quoteChar(), '"'));
        }
        if (request.encoding() != null) {
            schema.setEncoding(request.encoding());
        }
        if (request.skipLines() != null) {
            schema.setSkipLines(request.skipLines());
        }
        if (request.hasHeader() != null) {
            schema.setHasHeader(request.hasHeader());
        }
        if (request.dateFormat() != null) {
            schema.setDateFormat(request.dateFormat());
        }
        if (request.decimalSeparator() != null) {
            schema.setDecimalSeparator(singleChar(request.decimalSeparator(), ','));
        }
        if (request.thousandSeparator() != null) {
            schema.setThousandSeparator(optionalChar(request.thousandSeparator()));
        }
        schema.setAmountStrategy(request.amountStrategy());
        if (request.amountTypePositiveValues() != null) {
            schema.setAmountTypePositiveValues(joinValues(request.amountTypePositiveValues()));
        }
        replaceMappings(schema, request.columnMappings());
    }

    private void applyUpdateRequest(BankCsvSchema schema, BankCsvSchemaUpdateRequest request) {
        if (request.name() != null) {
            schema.setName(request.name());
        }
        if (request.bankIdentifier() != null) {
            schema.setBankIdentifier(request.bankIdentifier());
        }
        if (request.delimiter() != null) {
            schema.setDelimiter(singleChar(request.delimiter(), ';'));
        }
        if (request.quoteChar() != null) {
            schema.setQuoteChar(singleChar(request.quoteChar(), '"'));
        }
        if (request.encoding() != null) {
            schema.setEncoding(request.encoding());
        }
        if (request.skipLines() != null) {
            schema.setSkipLines(request.skipLines());
        }
        if (request.hasHeader() != null) {
            schema.setHasHeader(request.hasHeader());
        }
        if (request.dateFormat() != null) {
            schema.setDateFormat(request.dateFormat());
        }
        if (request.decimalSeparator() != null) {
            schema.setDecimalSeparator(singleChar(request.decimalSeparator(), ','));
        }
        if (request.thousandSeparator() != null) {
            schema.setThousandSeparator(optionalChar(request.thousandSeparator()));
        }
        if (request.amountStrategy() != null) {
            schema.setAmountStrategy(request.amountStrategy());
        }
        if (request.amountTypePositiveValues() != null) {
            schema.setAmountTypePositiveValues(joinValues(request.amountTypePositiveValues()));
        }
        if (request.columnMappings() != null) {
            replaceMappings(schema, request.columnMappings());
        }
    }

    private void replaceMappings(BankCsvSchema schema, List<BankCsvColumnMappingDto> mappings) {
        // orphanRemoval=true on the OneToMany handles deletion of removed rows.
        schema.getColumnMappings().clear();
        if (mappings == null) {
            return;
        }
        for (BankCsvColumnMappingDto dto : mappings) {
            BankCsvColumnMapping entity = new BankCsvColumnMapping();
            entity.setSchema(schema);
            entity.setTargetField(dto.targetField());
            entity.setSourceColumnIndex(dto.sourceColumnIndex());
            entity.setSourceColumnName(dto.sourceColumnName());
            entity.setTransform(dto.transform());
            schema.getColumnMappings().add(entity);
        }
    }

    private void validate(BankCsvSchema schema) {
        if (schema.getName() == null || schema.getName().isBlank()) {
            throw new BadRequestException("Schema name is required");
        }
        Set<BankFieldType> mapped = schema.getColumnMappings()
                .stream()
                .map(BankCsvColumnMapping::getTargetField)
                .collect(Collectors.toSet());

        // BOOKING_DATE is required for any meaningful import.
        if (!mapped.contains(BankFieldType.BOOKING_DATE)) {
            throw new BadRequestException("Mapping for BOOKING_DATE is required");
        }

        AmountStrategy strategy = schema.getAmountStrategy();
        switch (strategy) {
            case SIGNED_SINGLE_COLUMN -> {
                if (!mapped.contains(BankFieldType.AMOUNT)) {
                    throw new BadRequestException("SIGNED_SINGLE_COLUMN requires a mapping for AMOUNT");
                }
            }
            case DEBIT_CREDIT_COLUMNS -> {
                if (!mapped.contains(BankFieldType.DEBIT_AMOUNT) || !mapped.contains(BankFieldType.CREDIT_AMOUNT)) {
                    throw new BadRequestException(
                            "DEBIT_CREDIT_COLUMNS requires mappings for DEBIT_AMOUNT and CREDIT_AMOUNT");
                }
            }
            case AMOUNT_PLUS_TYPE_COLUMN -> {
                if (!mapped.contains(BankFieldType.AMOUNT) || !mapped.contains(BankFieldType.AMOUNT_TYPE_INDICATOR)) {
                    throw new BadRequestException(
                            "AMOUNT_PLUS_TYPE_COLUMN requires mappings for AMOUNT and AMOUNT_TYPE_INDICATOR");
                }
                if (schema.getAmountTypePositiveValues() == null
                        || schema.getAmountTypePositiveValues().isBlank()) {
                    throw new BadRequestException(
                            "AMOUNT_PLUS_TYPE_COLUMN requires non-empty amountTypePositiveValues");
                }
            }
        }

        for (BankCsvColumnMapping mapping : schema.getColumnMappings()) {
            boolean hasIndex = mapping.getSourceColumnIndex() != null;
            boolean hasName = mapping.getSourceColumnName() != null && !mapping.getSourceColumnName().isBlank();
            if (!hasIndex && !hasName) {
                throw new BadRequestException(
                        "Column mapping for " + mapping.getTargetField()
                                + " must specify sourceColumnIndex or sourceColumnName");
            }
            if (hasIndex && mapping.getSourceColumnIndex() < 0) {
                throw new BadRequestException("sourceColumnIndex must be >= 0");
            }
        }
    }

    private Organization requireOrganization() {
        Organization organization = organizationContext.getCurrentOrganization();
        if (organization == null) {
            throw new BadRequestException("User is not part of an organization");
        }
        return organization;
    }

    private static char singleChar(String value, char fallback) {
        if (value == null || value.isEmpty()) {
            return fallback;
        }
        return value.charAt(0);
    }

    private static Character optionalChar(String value) {
        if (value == null || value.isEmpty()) {
            return null;
        }
        return value.charAt(0);
    }

    private static String defaultIfBlank(String value, String fallback) {
        return (value == null || value.isBlank()) ? fallback : value;
    }

    private static String joinValues(List<String> values) {
        if (values == null || values.isEmpty()) {
            return null;
        }
        return String.join(",", values);
    }
}
