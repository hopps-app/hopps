package app.hopps.zugferd.model;

import app.hopps.commons.Address;
import org.mustangproject.Invoice;
import org.mustangproject.TradeParty;

public class AddressHelper {
    private AddressHelper() {
    }

    public static Address fromZugferd(Invoice invoice) {
        return new Address(invoice.getOwnCountry(), invoice.getOwnZIP(), null, invoice.getOwnLocation(),
                invoice.getOwnStreet());
    }

    public static Address fromTradeParty(TradeParty tradeparty) {
        return new Address(tradeparty.getCountry(), tradeparty.getZIP(), null, tradeparty.getLocation(),
                tradeparty.getStreet());
    }
}
