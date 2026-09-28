package app.hopps.organization.service.authentik;

/** Request body for {@code POST /core/users/{id}/set_password/}. */
public record AuthentikPasswordRequest(String password) {

    /** The password must never end up in a log through an accidental {@code toString()}. */
    @Override
    public String toString() {
        return "AuthentikPasswordRequest[password=***]";
    }
}
