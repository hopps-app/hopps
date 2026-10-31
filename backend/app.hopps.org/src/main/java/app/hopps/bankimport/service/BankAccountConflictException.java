package app.hopps.bankimport.service;

import app.hopps.bankimport.domain.BankAccount;
import jakarta.ws.rs.ClientErrorException;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * An IBAN can belong to only one account of an organization, archived accounts included: a second account for the same
 * IBAN would hold the same bank movements twice. Answered as 409 Conflict with a stable code in the same {@code {code,
 * message}} shape as the other coded errors.
 */
public class BankAccountConflictException extends ClientErrorException {

    public static final String IBAN_IN_USE = "IBAN_IN_USE";
    public static final String IBAN_ARCHIVED = "IBAN_ARCHIVED";
    public static final String ACCOUNT_HAS_LINKS = "ACCOUNT_HAS_LINKS";

    private BankAccountConflictException(String message, Map<String, Object> body) {
        super(message, Response.status(Response.Status.CONFLICT)
                .type(MediaType.APPLICATION_JSON)
                .entity(body)
                .build());
    }

    /** Movements of the account are linked to transactions: bookkeeping rests on them, so it stays visible. */
    public static BankAccountConflictException hasLinks() {
        String message = "A bank account with linked movements cannot be archived";
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("code", ACCOUNT_HAS_LINKS);
        body.put("message", message);
        return new BankAccountConflictException(message, body);
    }

    /** Another active account of the organization has this IBAN. */
    public static BankAccountConflictException ibanInUse() {
        String message = "A bank account with this IBAN already exists in this organization";
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("code", IBAN_IN_USE);
        body.put("message", message);
        return new BankAccountConflictException(message, body);
    }

    /** An archived account has this IBAN; it is to be restored, so the client gets its id. */
    public static BankAccountConflictException ibanArchived(BankAccount archived) {
        String message = "An archived bank account has this IBAN";
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("code", IBAN_ARCHIVED);
        body.put("message", message);
        body.put("archivedAccountId", archived.getId());
        body.put("archivedAccountName", archived.getName());
        return new BankAccountConflictException(message, body);
    }
}
