package app.hopps.commons.fga;

public class FgaHelper {
    private FgaHelper() {
        // use static methods
    }

    public static String sanitize(String toSanitize) {
        return toSanitize.replaceAll("[@:]", "_");
    }
}
