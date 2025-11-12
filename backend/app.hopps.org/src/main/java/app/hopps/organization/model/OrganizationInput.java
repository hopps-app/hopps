package app.hopps.organization.model;

import app.hopps.organization.domain.Address;
import app.hopps.organization.domain.Organization.TYPE;

import java.net.URL;

public record OrganizationInput(String name,
        String slug,
        TYPE type,
        URL website,
        URL profilePicture,
        Address address) {
}
