package app.hopps.commons;

public record TradeParty(
        String name,
        String countryOrRegion,
        String postalCode,
        String state,
        String city,
        String street,
        String additionalAddress,
        String taxID,
        String vatID,
        String description) {
}
