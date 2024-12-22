package app.hopps.model;

import app.hopps.commons.DocumentType;

import java.net.URL;

public record DocumentImage(URL imageUrl, DocumentType documentType) {
}
