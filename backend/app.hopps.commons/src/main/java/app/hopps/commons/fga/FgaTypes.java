package app.hopps.commons.fga;

import java.util.Locale;

public enum FgaTypes {
    USER, ORGANIZATION, BOMMEL;

    public String getFgaName() {
        return name().toLowerCase(Locale.ROOT);
    }
}
