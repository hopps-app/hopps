package app.hopps.document.client;

import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.faulttolerance.Retry;
import org.eclipse.microprofile.faulttolerance.Timeout;
import org.eclipse.microprofile.rest.client.inject.RegisterRestClient;
import org.jboss.resteasy.reactive.RestForm;

import java.io.InputStream;
import java.net.ConnectException;
import java.time.temporal.ChronoUnit;

@Path("/api/zugferd/document/scan")
@RegisterRestClient(configKey = "zugferd")
public interface ZugFerdClient {
    @POST
    @Consumes(MediaType.MULTIPART_FORM_DATA)
    @Produces(MediaType.APPLICATION_JSON)
    @Timeout(value = 30, unit = ChronoUnit.SECONDS)
    @Retry(maxRetries = 3, delay = 1, delayUnit = ChronoUnit.SECONDS, maxDuration = 20, durationUnit = ChronoUnit.SECONDS, jitter = 500, jitterDelayUnit = ChronoUnit.MILLIS, retryOn = {
            ConnectException.class,
            java.net.SocketTimeoutException.class, jakarta.ws.rs.ProcessingException.class })
    DocumentData scanDocument(@RestForm("document") InputStream document,
            @RestForm("transactionRecordId") Long transactionRecordId);
}
