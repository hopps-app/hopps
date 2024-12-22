package app.hopps.commons;

public record Address(
        String countryOrRegion,
        String postalCode,
        String state,
        String city,
        String road,
        String houseNumber) {
}
