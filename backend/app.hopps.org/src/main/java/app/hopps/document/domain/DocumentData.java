package app.hopps.document.domain;

import java.net.URL;

public record DocumentData(URL internalFinUrl, Long referenceKey, DocumentType type) {
}
