package app.hopps.auth;

import jakarta.ws.rs.GET;
import jakarta.ws.rs.HeaderParam;

import java.io.InputStream;

public interface FinRestClient {
    @GET
    InputStream getDocument(@HeaderParam("Authorization") String authorization);
}
