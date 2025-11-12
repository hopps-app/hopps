package app.hopps.organization.domain;

import jakarta.persistence.Embeddable;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

@Embeddable
@Schema(name = "Address", description = "An example of a valid address")
public class Address {

    @Schema(examples = "Raketenstraße")
    private String street;

    @Schema(examples = "42a")
    private String number;

    @Schema(examples = "Raketenstadt")
    private String city;

    @Schema(examples = "4242")
    private String plz;

    @Schema(examples = "Hinterhaus")
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
