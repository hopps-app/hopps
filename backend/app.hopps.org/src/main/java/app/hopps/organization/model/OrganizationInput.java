package app.hopps.organization.model;

import app.hopps.organization.domain.Address;
import app.hopps.organization.domain.Organization;
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
        String phoneNumber,
        Boolean autoAnalyzeDocuments) {

    /**
     * Builds a new Organization entity from this input.
     */
    public Organization toOrganization() {
        Organization org = new Organization();
        org.setName(name);
        org.setSlug(slug);
        org.setType(type);
        org.setWebsite(website);
        org.setProfilePicture(profilePicture);
        org.setAddress(address);
        org.setFoundingDate(foundingDate);
        org.setRegistrationCourt(registrationCourt);
        org.setRegistrationNumber(registrationNumber);
        org.setCountry(country);
        org.setTaxNumber(taxNumber);
        org.setEmail(email);
        org.setPhoneNumber(phoneNumber);
        if (autoAnalyzeDocuments != null) {
            org.setAutoAnalyzeDocuments(autoAnalyzeDocuments);
        }
        return org;
    }
}
