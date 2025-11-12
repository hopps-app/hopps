package app.hopps.document.client;

import app.hopps.document.domain.InvoiceData;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.rest.client.annotation.RegisterClientHeaders;
import org.eclipse.microprofile.rest.client.inject.RegisterRestClient;
import org.jboss.resteasy.reactive.PartType;
import org.jboss.resteasy.reactive.RestForm;

@RegisterClientHeaders
@RegisterRestClient(configKey = "zugferd-service")
public interface ZugFerdClient {

    /**
     * This status code is returned when the upload was correct, but the pdf either doesn't contain a zugferd invoice or
     * the zugferd was incorrect.
     */
    int STATUS_CODE_UNSUCCESSFUL_PARSE = 422;

    @POST
    InvoiceData uploadDocument(
            @RestForm("file") byte[] file,
            @RestForm @PartType(MediaType.TEXT_PLAIN) Long referenceId);
}
