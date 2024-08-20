package app.hopps.vereine.jpa;

import jakarta.persistence.Embeddable;

@Embeddable
public class Address {
    private String street;
    private String number;
    private String city;
    private String plz;
    private String additionalLine;

    public Address() {
        // no args constructor
    }

    public String getAdditionalLine() {
        return additionalLine;
    }

    public void setAdditionalLine(String additionalLine) {
        this.additionalLine = additionalLine;
    }

    public String getCity() {
        return city;
    }

    public void setCity(String city) {
        this.city = city;
    }

    public String getNumber() {
        return number;
    }

    public void setNumber(String number) {
        this.number = number;
    }

    public String getPlz() {
        return plz;
    }

    public void setPlz(String plz) {
        this.plz = plz;
    }

    public String getStreet() {
        return street;
    }

    public void setStreet(String street) {
        this.street = street;
    }
}
