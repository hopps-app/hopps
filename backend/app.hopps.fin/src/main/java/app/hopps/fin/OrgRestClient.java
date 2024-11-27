package app.hopps.fin;

import org.eclipse.microprofile.rest.client.inject.RegisterRestClient;

@RegisterRestClient(configKey = "org-service")
public interface OrgRestClient {
    // TODO: What should I add here?
    // No organization or bommel is sent from the az-document-ai or ZugPferD service
}
