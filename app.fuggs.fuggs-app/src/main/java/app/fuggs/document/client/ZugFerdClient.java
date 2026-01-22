package app.fuggs.document.client;

import java.io.InputStream;

import org.eclipse.microprofile.rest.client.inject.RegisterRestClient;
import org.jboss.resteasy.reactive.RestForm;

import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;

@Path("/api/zugferd/document/scan")
@RegisterRestClient(configKey = "zugferd")
public interface ZugFerdClient
{
	@POST
	@Consumes(MediaType.MULTIPART_FORM_DATA)
	@Produces(MediaType.APPLICATION_JSON)
	DocumentData scanDocument(@RestForm("document") InputStream document,
		@RestForm("transactionRecordId") Long transactionRecordId);
}
