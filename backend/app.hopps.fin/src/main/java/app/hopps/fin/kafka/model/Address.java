package app.hopps.fin.kafka.model;

public record Address(
        String countryOrRegion,
        String postalCode,
        String state,
        String city,
        String road,
        String houseNumber) {
    public app.hopps.fin.jpa.entities.Address convertToJpa() {
        app.hopps.fin.jpa.entities.Address address = new app.hopps.fin.jpa.entities.Address();
        address.setCountry(countryOrRegion());
        address.setZipCode(postalCode());
        address.setState(state());
        address.setCity(city());
        address.setStreet(road());
        address.setStreetNumber(houseNumber());
        return address;
    }
}
