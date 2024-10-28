package app.hopps;
import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@ApplicationScoped
public class ZugFerdService {

    private final Logger LOGGER = LoggerFactory.getLogger(ZugFerdService.class);

    @ConfigProperty(name = "app.hopps.zugferd-service.eInvoiceId")
    String eInvoiceId;

}
