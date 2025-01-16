package app.hopps.mailservice;

import app.hopps.commons.mail.Mail;
import app.hopps.commons.mail.MailTemplates;
import io.quarkus.mailer.MockMailbox;
import io.quarkus.test.common.QuarkusTestResource;
import io.quarkus.test.junit.QuarkusTest;
import io.smallrye.reactive.messaging.memory.InMemoryConnector;
import io.smallrye.reactive.messaging.memory.InMemorySource;
import jakarta.inject.Inject;
import org.eclipse.microprofile.reactive.messaging.spi.Connector;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.List;
import java.util.Map;

import static org.awaitility.Awaitility.await;
import static org.junit.jupiter.api.Assertions.assertEquals;

@QuarkusTest
@QuarkusTestResource(KafkaTestResourceLifecycleManager.class)
class MailReceiverTest {
    @Inject
    MockMailbox mockMailbox;

    @Inject
    @Connector("smallrye-in-memory")
    InMemoryConnector connector;

    @BeforeEach
    void init() {
        mockMailbox.clear();
    }

    @Test
    void shouldSendMail() {
        // given
        InMemorySource<Mail> mailSender = connector.source("mail");
        mailSender.runOnVertxContext(true);

        Mail mail = new Mail(new String[] { "info@hopps.de" }, MailTemplates.TEMP, Map.of("name", "Peter"));

        // when
        mailSender.send(mail);
        await().until(() -> mockMailbox.getTotalMessagesSent() > 0);

        // then
        List<io.quarkus.mailer.Mail> mailsSentTo = mockMailbox.getMailsSentTo("info@hopps.de");
        assertEquals(1, mailsSentTo.size());
        assertEquals(1, mockMailbox.getTotalMessagesSent());
    }

    @Test
    void shouldSendMultipleMailsParallel() {
        // given
        InMemorySource<Mail> mailSender = connector.source("mail");
        mailSender.runOnVertxContext(true);

        Mail mail = new Mail(new String[] { "info@hopps.de" }, MailTemplates.TEMP, Map.of("name", "Peter"));

        // when
        for (int i = 0; i < 500; i++) {
            mailSender.send(mail);
        }
        await().atMost(Duration.ofSeconds(1)).until(() -> mockMailbox.getTotalMessagesSent() == 500);

        // then
        List<io.quarkus.mailer.Mail> mailsSentTo = mockMailbox.getMailsSentTo("info@hopps.de");
        assertEquals(500, mailsSentTo.size());
        assertEquals(500, mockMailbox.getTotalMessagesSent());
    }
}
