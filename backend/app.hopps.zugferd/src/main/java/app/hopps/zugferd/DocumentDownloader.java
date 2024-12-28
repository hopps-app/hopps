package app.hopps.zugferd;

import jakarta.enterprise.context.ApplicationScoped;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.URISyntaxException;

@ApplicationScoped
public class DocumentDownloader {

    public InputStream downloadDocument(String documentUriString) throws IOException, URISyntaxException {
        return new URI(documentUriString).toURL().openStream();
    }
}
