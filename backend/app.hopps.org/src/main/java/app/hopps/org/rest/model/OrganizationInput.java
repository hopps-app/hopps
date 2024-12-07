package app.hopps.org.rest.model;

import app.hopps.org.jpa.Address;
import app.hopps.org.jpa.Organization.TYPE;

import java.net.URL;

public record OrganizationInput(String name,
        String slug,
        TYPE type,
        URL website,
        URL profilePicture,
        Address address) {
}
