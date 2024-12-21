package app.hopps;

import jakarta.enterprise.context.ApplicationScoped;

import java.io.IOException;
import java.io.InputStream;
import java.net.URL;

@ApplicationScoped
public class DocumentDownloader {

    public InputStream downloadDocument(String documentUrlString) throws IOException {
        return new URL(documentUrlString).openStream();
    }
}
