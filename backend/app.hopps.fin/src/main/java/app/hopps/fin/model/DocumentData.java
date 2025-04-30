package app.hopps.fin.model;

import java.net.URL;

public record DocumentData(URL internalFinUrl, Long referenceKey, DocumentType type) {
}
