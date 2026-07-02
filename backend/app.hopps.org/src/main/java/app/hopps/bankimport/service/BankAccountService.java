package app.hopps.bankimport.service;

import app.hopps.bankimport.api.dto.BankAccountCreateRequest;
import app.hopps.bankimport.api.dto.BankAccountUpdateRequest;
import app.hopps.bankimport.domain.BankAccount;
import app.hopps.bankimport.domain.BankCsvSchema;
import app.hopps.bankimport.repository.BankAccountRepository;
Saimport app.hopps.bankimport.repository.BankTransactionRepository;
import app.hopps.bommel.domain.Bommel;
import app.hopps.bommel.repository.BommelRepository;
import app.hopps.organization.domain.Organization;
import app.hopps.shared.security.OrganizationContext;
import io.quarkus.security.identity.SecurityIdentity;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.NotFoundException;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.regex.Pattern;

/**
 * Business logic for bank accounts: org-scoping, default-bommel resolution, IBAN validation, and soft-delete.
 */
@ApplicationScoped
public class BankAccountService {

    /** Coarse IBAN format check: country prefix (2 letters) + 2 check digits + 11–30 alphanumerics. */
    private static final Pattern IBAN_FORMAT = Pattern.compile("^[A-Z]{2}\\d{2}[A-Z0-9]{11,30}$");

    @Inject
    BankAccountRepository bankAccountRepository;

    @Inject
    BankTransactionRepository bankTransactionRepository;

    @Inject
    BommelRepository bommelRepository;

    @Inject
    OrganizationContext organizationContext;

    @Inject
    SecurityIdentity securityIdentity;

    public List<BankAccount> list(boolean includeArchived) {
        return bankAccountRepository.listForCurrentOrganization(includeArchived);
    }

    public BankAccount get(Long id) {
        BankAccount account = bankAccountRepository.findByIdScoped(id);
        if (account == null) {
            throw new NotFoundException("Bank account not found");
        }
        return account;
    }

    /**
     * Current balance of the account: the opening balance plus all transaction amounts booked after the opening balance
     * date. After a gap-free import this matches the balance reported by the bank.
     */
    public BigDecimal computeBalance(BankAccount account) {
        return bankTransactionRepository.computeBalance(
                account.getId(), account.getOpeningBalance(), account.getOpeningBalanceDate());
    }

    @Transactional
    public BankAccount create(BankAccountCreateRequest request) {
        Organization organization = requireOrganization();
        String normalizedIban = normalizeIban(request.iban());
        validateIban(normalizedIban);
        if (bankAccountRepository.existsByIban(normalizedIban, null)) {
            throw new BadRequestException("A bank account with this IBAN already exists in this organization");
        }
        Bommel bommel = resolveBommel(request.bommelId(), organization);
        BankCsvSchema defaultSchema = resolveDefaultSchema(request.defaultSchemaId());

        BankAccount account = new BankAccount();
        account.setOrganization(organization);
        account.setBommel(bommel);
        account.setName(request.name());
        account.setIban(normalizedIban);
        account.setBic(request.bic());
        account.setBankName(request.bankName());
        account.setAccountHolder(request.accountHolder());
        if (request.currency() != null) {
            account.setCurrency(request.currency());
        }
        account.setOpeningBalance(request.openingBalance());
        account.setOpeningBalanceDate(request.openingBalanceDate());
        validateOpeningBalancePair(account.getOpeningBalance(), account.getOpeningBalanceDate());
        account.setDescription(request.description());
        account.setColor(request.color());
        account.setDefaultSchema(defaultSchema);
        account.setCreatedBy(securityIdentity.getPrincipal().getName());

        bankAccountRepository.persist(account);
        return account;
    }

    @Transactional
    public BankAccount update(Long id, BankAccountUpdateRequest request) {
        BankAccount account = get(id);

        if (request.iban() != null) {
            String normalizedIban = normalizeIban(request.iban());
            validateIban(normalizedIban);
            if (!normalizedIban.equals(account.getIban())
                    && bankAccountRepository.existsByIban(normalizedIban, id)) {
                throw new BadRequestException("A bank account with this IBAN already exists in this organization");
            }
            account.setIban(normalizedIban);
        }
        if (request.name() != null) {
            account.setName(request.name());
        }
        if (request.bic() != null) {
            account.setBic(request.bic());
        }
        if (request.bankName() != null) {
            account.setBankName(request.bankName());
        }
        if (request.accountHolder() != null) {
            account.setAccountHolder(request.accountHolder());
        }
        if (request.currency() != null) {
            account.setCurrency(request.currency());
        }
        if (request.openingBalance() != null) {
            account.setOpeningBalance(request.openingBalance());
        }
        if (request.openingBalanceDate() != null) {
            account.setOpeningBalanceDate(request.openingBalanceDate());
        }
        validateOpeningBalancePair(account.getOpeningBalance(), account.getOpeningBalanceDate());
        if (request.description() != null) {
            account.setDescription(request.description());
        }
        if (request.color() != null) {
            account.setColor(request.color());
        }
        if (request.defaultSchemaId() != null) {
            account.setDefaultSchema(resolveDefaultSchema(request.defaultSchemaId()));
        }
        return account;
    }

    @Transactional
    public void archive(Long id) {
        BankAccount account = get(id);
        if (!account.isArchived()) {
            account.setArchived(true);
            account.setArchivedAt(Instant.now());
        }
    }

    @Transactional
    public BankAccount restore(Long id) {
        BankAccount account = get(id);
        if (account.isArchived()) {
            account.setArchived(false);
            account.setArchivedAt(null);
        }
        return account;
    }

    private Organization requireOrganization() {
        Organization organization = organizationContext.getCurrentOrganization();
        if (organization == null) {
            throw new BadRequestException("User is not part of an organization");
        }
        return organization;
    }

    private Bommel resolveBommel(Long bommelId, Organization organization) {
        if (bommelId == null) {
            return bommelRepository.getRootBommel(organization.id)
                    .orElseThrow(() -> new BadRequestException("Organization has no root bommel"));
        }
        Bommel bommel = bommelRepository.findById(bommelId);
        if (bommel == null) {
            throw new NotFoundException("Bommel not found");
        }
        Organization bommelOrg = bommelRepository.getOrganization(bommel);
        if (bommelOrg == null || !bommelOrg.id.equals(organization.id)) {
            throw new BadRequestException("Bommel does not belong to current organization");
        }
        return bommel;
    }

    private BankCsvSchema resolveDefaultSchema(Long schemaId) {
        if (schemaId == null) {
            return null;
        }
        BankCsvSchema schema = BankCsvSchema.findById(schemaId);
        if (schema == null) {
            throw new NotFoundException("CSV schema not found");
        }
        Long orgId = organizationContext.getCurrentOrganizationId();
        if (schema.getOrganization() == null || !orgId.equals(schema.getOrganization().id)) {
            throw new BadRequestException("CSV schema does not belong to current organization");
        }
        return schema;
    }

    private void validateIban(String iban) {
        if (!IBAN_FORMAT.matcher(iban).matches()) {
            throw new BadRequestException("Invalid IBAN format");
        }
    }

    private String normalizeIban(String iban) {
        return iban.replaceAll("\\s+", "").toUpperCase();
    }

    private void validateOpeningBalancePair(Object balance, Object date) {
        boolean balanceSet = balance != null;
        boolean dateSet = date != null;
        if (balanceSet != dateSet) {
            throw new BadRequestException("openingBalance and openingBalanceDate must be set together");
        }
    }
}
