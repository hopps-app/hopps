package app.hopps.zugferd.model;

import app.hopps.commons.Address;
import org.mustangproject.Invoice;

public class AddressHelper {
    private AddressHelper() {
    }

    public static Address fromZugferd(Invoice invoice) {
        return new Address(invoice.getOwnCountry(), invoice.getOwnZIP(), null, invoice.getOwnLocation(), invoice.getOwnStreet(), null);
    }
}
