package app.hopps.zugferd;

import app.hopps.commons.DocumentData;
import app.hopps.commons.InvoiceData;
import app.hopps.zugferd.auth.FinRestClientImpl;
import io.quarkus.oidc.client.OidcClient;
import io.quarkus.oidc.client.runtime.TokensHelper;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.reactive.messaging.Channel;
import org.eclipse.microprofile.reactive.messaging.Emitter;
import org.eclipse.microprofile.reactive.messaging.Incoming;
import org.mustangproject.Invoice;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.InputStream;
import java.net.URISyntaxException;
import java.time.Duration;

@ApplicationScoped
public class KafkaConnector {
    private static final Logger LOG = LoggerFactory.getLogger(KafkaConnector.class);

    private final ZugFerdService zugFerdService;
    private final Emitter<InvoiceData> emitter;
    private final OidcClient oidcClient;
    private final TokensHelper tokensHelper = new TokensHelper();

    @Inject
    public KafkaConnector(ZugFerdService zugFerdService, @Channel("document-data-out") Emitter<InvoiceData> emitter,
            OidcClient oidcClient) {
        this.zugFerdService = zugFerdService;
        this.emitter = emitter;
        this.oidcClient = oidcClient;
    }

    @Incoming("document-data-in")
    public void process(DocumentData documentData) throws URISyntaxException {
        LOG.info("{}: Received new document data", documentData.referenceKey());
        FinRestClientImpl restClient = new FinRestClientImpl(documentData.internalFinUrl());

        String accessToken = tokensHelper.getTokens(oidcClient).await().atMost(Duration.ofSeconds(3)).getAccessToken();
        // Process the incoming message payload and return an updated payload
        try (InputStream invoiceStream = restClient.getDocument(accessToken)) {
            LOG.info("{}: Document successful downloaded", documentData.referenceKey());
            InvoiceData invoice = zugFerdService.scanInvoice(documentData.referenceKey(), invoiceStream);
            LOG.info("{}: Invoice scanned", documentData.referenceKey());
            emitter.send(invoice);
            LOG.info("{}: Invoice sent", documentData.referenceKey());
        } catch (Exception e) {
            LOG.error("{}: Could not fetch or process document", documentData.referenceKey(), e);
        }
    }
}
