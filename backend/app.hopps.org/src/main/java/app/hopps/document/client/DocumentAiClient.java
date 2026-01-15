package app.hopps.document.client;

import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.rest.client.inject.RegisterRestClient;
import org.jboss.resteasy.reactive.RestForm;

import java.io.InputStream;

@Path("/api/az-document-ai/document/scan")
@RegisterRestClient(configKey = "document-ai")
public interface DocumentAiClient {
    @POST
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    @Produces(MediaType.APPLICATION_JSON)
    DocumentData scanDocument(@RestForm("document") InputStream document,
            @RestForm("transactionRecordId") Long transactionRecordId);
}
