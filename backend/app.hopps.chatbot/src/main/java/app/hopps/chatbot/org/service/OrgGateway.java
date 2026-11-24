package app.hopps.chatbot.org.service;

import app.hopps.chatbot.org.client.OrgInternalClient;
import app.hopps.chatbot.org.client.dto.InvitationAnswer;
import app.hopps.chatbot.org.client.dto.OrgConnection;
import io.vertx.core.buffer.Buffer;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.ws.rs.WebApplicationException;
import org.eclipse.microprofile.rest.client.inject.RestClient;
import org.jboss.resteasy.reactive.client.api.ClientMultipartForm;

import java.util.Optional;

/**
 * What the chatbot needs from org, with HTTP statuses turned into outcomes. Connection problems are not caught: they
 * surface as exceptions and the caller answers with a technical-problem reply.
 */
@ApplicationScoped
public class OrgGateway {

    private final OrgInternalClient client;

    public OrgGateway(@RestClient OrgInternalClient client) {
        this.client = client;
    }

    public Optional<OrgConnection> findConnection(String phoneNumber) {
        try {
            return Optional.of(client.getConnection(phoneNumber));
        } catch (WebApplicationException e) {
            if (e.getResponse().getStatus() == 404) {
                return Optional.empty();
            }
            throw e;
        }
    }

    public AnswerOutcome accept(String token, String phoneNumber) {
        try {
            return new AnswerOutcome(AnswerStatus.DONE,
                    client.acceptInvitation(token, new InvitationAnswer(phoneNumber)));
        } catch (WebApplicationException e) {
            return new AnswerOutcome(answerStatus(e), null);
        }
    }

    public AnswerStatus decline(String token, String phoneNumber) {
        try {
            client.declineInvitation(token, new InvitationAnswer(phoneNumber));
            return AnswerStatus.DONE;
        } catch (WebApplicationException e) {
            return answerStatus(e);
        }
    }

    private static AnswerStatus answerStatus(WebApplicationException e) {
        return switch (e.getResponse().getStatus()) {
            case 404 -> AnswerStatus.UNKNOWN_INVITATION;
            case 410 -> AnswerStatus.EXPIRED;
            default -> throw e;
        };
    }

    public void disconnect(String phoneNumber) {
        client.disconnect(phoneNumber);
    }

    public UploadStatus submitReceipt(String phoneNumber, byte[] content, String fileName, String mimeType,
            String caption) {
        ClientMultipartForm form = ClientMultipartForm.create()
                .binaryFileUpload("file", fileName, Buffer.buffer(content), mimeType);
        if (caption != null && !caption.isBlank()) {
            form.attribute("caption", caption, null);
        }
        try {
            client.submitReceipt(phoneNumber, form);
            return UploadStatus.FILED;
        } catch (WebApplicationException e) {
            return switch (e.getResponse().getStatus()) {
                case 404 -> UploadStatus.NOT_CONNECTED;
                case 409 -> UploadStatus.DUPLICATE;
                case 415 -> UploadStatus.UNSUPPORTED;
                case 429 -> UploadStatus.TOO_MANY_UPLOADS;
                default -> throw e;
            };
        }
    }

    public enum AnswerStatus {
        DONE, UNKNOWN_INVITATION, EXPIRED
    }

    public record AnswerOutcome(AnswerStatus status, OrgConnection connection) {
    }

    public enum UploadStatus {
        FILED, NOT_CONNECTED, DUPLICATE, UNSUPPORTED, TOO_MANY_UPLOADS
    }
}
