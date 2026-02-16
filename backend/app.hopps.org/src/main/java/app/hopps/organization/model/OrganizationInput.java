package app.hopps.organization.model;

import app.hopps.organization.domain.Address;
import app.hopps.organization.domain.Organization.TYPE;

import java.net.URL;
import java.time.LocalDate;

public record OrganizationInput(String name,
        String slug,
        TYPE type,
        URL website,
        URL profilePicture,
        Address address,
        LocalDate foundingDate,
        String registrationCourt,
        String registrationNumber,
        String country,
        String taxNumber,
        String email,
        String phoneNumber) {
}
