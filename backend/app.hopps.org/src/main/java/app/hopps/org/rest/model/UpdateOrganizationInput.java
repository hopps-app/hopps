package app.hopps.org.rest.model;

import app.hopps.org.jpa.Address;
import java.sql.Date;

public record UpdateOrganizationInput(
        String organizationName,
        Address address,
        Date foundationDate,
        String registerCourt,
        String registerNumber,
        String taxId
    ) {

    }

