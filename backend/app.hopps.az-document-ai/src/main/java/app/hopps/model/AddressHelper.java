package app.hopps.model;

import app.hopps.commons.Address;
import com.azure.ai.documentintelligence.models.AddressValue;

public class AddressHelper {
    private AddressHelper() {
        // only call the static method
    }

    public static Address fromAzure(AddressValue value) {
        return new Address(
                value.getCountryRegion(),
                value.getPostalCode(),
                value.getState(),
                value.getCity(),
                value.getRoad(),
                value.getHouseNumber());
    }
}
