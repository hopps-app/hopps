package app.hopps.model;

import com.azure.ai.documentintelligence.models.AddressValue;

public record Address(
    String region,
    String postalCode,
    String state,
    String city,
    String road,
    String houseNumber,
    String streetAddress,
    String floor
) {
    public static Address fromAzure(AddressValue value) {
        return new Address(
                value.getCountryRegion(),
                value.getPostalCode(),
                value.getState(),
                value.getCity(),
                value.getRoad(),
                value.getHouseNumber(),
                value.getStreetAddress(),
                value.getLevel()
        );
    }
}
