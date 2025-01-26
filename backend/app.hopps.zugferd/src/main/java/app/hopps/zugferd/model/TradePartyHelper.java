package app.hopps.zugferd.model;

import app.hopps.commons.TradeParty;
import org.mustangproject.Invoice;

public class TradePartyHelper {
    private TradePartyHelper() {
    }

    public static TradeParty fromZugferd(Invoice invoice) {
        return new TradeParty(invoice.getOwnOrganisationName(), invoice.getOwnCountry(), invoice.getOwnZIP(), null, invoice.getOwnLocation(),
                invoice.getOwnStreet(), null, invoice.getOwnTaxID(), invoice.getOwnVATID(), invoice.getPaymentTermDescription());
    }

    public static TradeParty fromTradeParty(org.mustangproject.TradeParty tradeparty) {
        return new TradeParty(tradeparty.getName(), tradeparty.getCountry(), tradeparty.getZIP(), null, tradeparty.getLocation(),
                tradeparty.getStreet(), tradeparty.getAdditionalAddress(), tradeparty.getTaxID(), tradeparty.getVatID(), tradeparty.getDescription());
    }
}
