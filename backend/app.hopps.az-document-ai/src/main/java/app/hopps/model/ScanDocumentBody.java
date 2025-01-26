package app.hopps.model;

import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;

import java.net.MalformedURLException;
import java.net.URI;
import java.net.URISyntaxException;
import java.net.URL;

public record ScanDocumentBody(String documentUrl) {
    public URL parseDocumentUrl() throws WebApplicationException {
        try {
            return new URI(documentUrl).toURL();
        } catch (MalformedURLException | URISyntaxException e) {
            throw new WebApplicationException("Invalid document URL", e, Response.Status.BAD_REQUEST);
        }
    }
}
