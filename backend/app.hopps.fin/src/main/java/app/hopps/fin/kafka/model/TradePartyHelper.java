package app.hopps.fin.kafka.model;

import app.hopps.fin.jpa.entities.TradeParty;

public class TradePartyHelper {
    private TradePartyHelper() {
        // only call the static method
    }

    public static TradeParty convertToJpa(app.hopps.commons.Address address) {
        TradeParty addressJpa = new TradeParty();
        addressJpa.setName(null);
        addressJpa.setCity(address.city());
        addressJpa.setCountry(address.countryOrRegion());
        addressJpa.setState(address.state());
        addressJpa.setStreet(address.street());
        addressJpa.setAdditionalAddress(null);
        addressJpa.setZipCode(address.postalCode());
        addressJpa.setTaxID(null);
        addressJpa.setVatID(null);
        addressJpa.setDescription(null);
        return addressJpa;
    }
}
