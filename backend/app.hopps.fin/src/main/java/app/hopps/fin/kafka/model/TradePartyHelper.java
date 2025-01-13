package app.hopps.fin.kafka.model;

import app.hopps.fin.jpa.entities.TradeParty;

public class TradePartyHelper {
    private TradePartyHelper() {
        // only call the static method
    }

    public static TradeParty convertToJpa(app.hopps.commons.TradeParty tradeParty) {
        TradeParty addressJpa = new TradeParty();
        addressJpa.setName(null);
        addressJpa.setCity(tradeParty.city());
        addressJpa.setCountry(tradeParty.countryOrRegion());
        addressJpa.setState(tradeParty.state());
        addressJpa.setStreet(tradeParty.street());
        addressJpa.setAdditionalAddress(null);
        addressJpa.setZipCode(tradeParty.postalCode());
        addressJpa.setTaxID(null);
        addressJpa.setVatID(null);
        addressJpa.setDescription(null);
        return addressJpa;
    }
}
