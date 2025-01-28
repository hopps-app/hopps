package app.hopps.commons.fga;

import java.util.Locale;

public enum FgaRelations {
    OWNER, MEMBER, ORGANIZATION, PARENT, BOMMELWART("bommelWart");

    private String fgaName;

    FgaRelations() {
    }

    FgaRelations(String fgaName) {
        this.fgaName = fgaName;
    }

    public String getFgaName() {
        if (fgaName == null) {
            return name().toLowerCase(Locale.ROOT);
        }
        return fgaName;
    }
}
