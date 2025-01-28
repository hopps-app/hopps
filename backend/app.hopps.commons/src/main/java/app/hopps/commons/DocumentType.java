package app.hopps.commons;

import java.util.Arrays;

public enum DocumentType {
    RECEIPT,
    INVOICE,
    ;

    public static DocumentType getTypeByStringIgnoreCase(String name) {
        return Arrays.stream(DocumentType.values())
                .filter(x -> name.equalsIgnoreCase(x.name()))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("'" + name + "' was not found"));
    }
}
