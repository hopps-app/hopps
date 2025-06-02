package app.hopps.org.rest;

import jakarta.inject.Singleton;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerRequestFilter;
import jakarta.ws.rs.ext.Provider;

@Provider
@Singleton
public class RequestLoggingFilter implements ContainerRequestFilter {
    @Override
    public void filter(ContainerRequestContext context) {
        System.out.println("Request URL (" + context.getMethod() + "): " + context.getUriInfo().getRequestUri());
    }
}
