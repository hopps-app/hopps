package app.hopps.fin.kafka.model;

import app.hopps.fin.jpa.entities.Address;

public class AddressHelper {
    private AddressHelper() {
        // only call the static method
    }

    public static Address convertToJpa(app.hopps.commons.Address address) {
        Address addressJpa = new Address();
        addressJpa.setCountry(address.countryOrRegion());
        addressJpa.setZipCode(address.postalCode());
        addressJpa.setState(address.state());
        addressJpa.setCity(address.city());
        addressJpa.setStreet(address.road());
        addressJpa.setStreetNumber(address.houseNumber());
        return addressJpa;
    }
}
