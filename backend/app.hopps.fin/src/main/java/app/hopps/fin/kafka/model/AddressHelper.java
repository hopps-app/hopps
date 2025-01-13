package app.hopps.fin.kafka.model;

import app.hopps.fin.jpa.entities.Address;
import org.mustangproject.TradeParty;

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

    public static Address convertToJpa(TradeParty tradeParty) {
        Address addressJpa = new Address();
        addressJpa.setCountry(tradeParty.getCountry());
        addressJpa.setZipCode(tradeParty.getZIP());
        addressJpa.setState(null);
        addressJpa.setCity(tradeParty.getLocation());
        addressJpa.setStreet(tradeParty.getStreet());
        addressJpa.setStreetNumber(null);
        return addressJpa;
    }
}
