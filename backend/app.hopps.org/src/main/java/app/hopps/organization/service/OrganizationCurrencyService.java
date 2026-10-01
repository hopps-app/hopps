package app.hopps.organization.service;

import app.hopps.organization.domain.Currency;
import app.hopps.organization.domain.Organization;
import app.hopps.transaction.repository.TransactionRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

/**
 * Guards the organization's currency: it is free to change until the first transaction exists, because every stored
 * amount is interpreted in that currency and re-labelling existing bookings would falsify them.
 */
@ApplicationScoped
public class OrganizationCurrencyService {

    @Inject
    TransactionRepository transactionRepository;

    /**
     * True once the organization has at least one transaction, i.e. the currency may no longer be changed.
     */
    public boolean isCurrencyLocked(Organization organization) {
        return transactionRepository.existsForOrganization(organization.getId());
    }

    /**
     * Applies a new currency, or throws {@link CurrencyLockedException} if transactions already exist. Re-submitting
     * the current currency is always allowed, so a full-form save never fails on an unchanged value.
     */
    public void changeCurrency(Organization organization, Currency currency) {
        if (currency == null || currency == organization.getCurrency()) {
            return;
        }
        if (isCurrencyLocked(organization)) {
            throw new CurrencyLockedException();
        }
        organization.setCurrency(currency);
    }

    /**
     * Fills the transient {@code currencyLocked} flag the settings UI uses to disable the currency select.
     */
    public Organization withCurrencyLock(Organization organization) {
        organization.setCurrencyLocked(isCurrencyLocked(organization));
        return organization;
    }
}
