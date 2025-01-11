package app.hopps.mailservice;

import io.quarkus.mailer.MailTemplate;
import io.smallrye.mutiny.Uni;
import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.reactive.messaging.Incoming;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Map;
import java.util.function.Function;

@ApplicationScoped
public class MailReceiver {
    private static final Logger LOG = LoggerFactory.getLogger(MailReceiver.class);

    @Incoming("mail")
    Uni<Void> handleRequest(Mail mail) {
        LOG.info("Sending mail requested");

        return getTemplateByType(mail.templateId())
                .apply(mail.variables())
                .to(mail.mailReceivers())
                .send()
                .invoke(() -> LOG.info("Mail was sent"))
                .onFailure()
                .invoke(throwable -> LOG.info("Mail could not be sent", throwable));
    }

    private Function<Map<String, String>, MailTemplate.MailTemplateInstance> getTemplateByType(
            MailTemplates mailTemplates) {
        return switch (mailTemplates) {
            case TEMP -> Templates::temp;
        };
    }
}
