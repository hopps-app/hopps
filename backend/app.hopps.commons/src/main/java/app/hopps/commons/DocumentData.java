package app.hopps.commons;

import java.net.URL;

public record DocumentData(URL internalFinUrl, Long referenceKey, DocumentType type) {
}
