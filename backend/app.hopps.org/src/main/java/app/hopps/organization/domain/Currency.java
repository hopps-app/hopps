package app.hopps.organization.domain;

/**
 * Currencies an organization can keep its books in. Deliberately a short list: every amount in hopps is displayed in
 * the organization's currency, so adding one here is a product decision, not a data-entry option.
 */
public enum Currency {
    EUR,
    CHF
}
