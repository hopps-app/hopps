package app.hopps.fin.client;

import app.hopps.commons.InvoiceData;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.rest.client.annotation.RegisterClientHeaders;
import org.eclipse.microprofile.rest.client.inject.RegisterRestClient;
import org.jboss.resteasy.reactive.PartType;
import org.jboss.resteasy.reactive.RestForm;

@RegisterClientHeaders
@RegisterRestClient(configKey = "zugferd-service")
public interface ZugFerdClient {
    @POST
    InvoiceData uploadDocument(
            @RestForm("file") byte[] file,
            @RestForm @PartType(MediaType.TEXT_PLAIN) Long referenceId);
}
