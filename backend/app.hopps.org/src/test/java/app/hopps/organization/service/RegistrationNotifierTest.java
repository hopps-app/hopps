package app.hopps.organization.service;

import app.hopps.organization.domain.Organization;
import app.hopps.organization.domain.OrganizationType;
import app.hopps.organization.service.RegistrationNotifier.ContactPerson;
import io.quarkus.mailer.Mail;
import io.quarkus.mailer.reactive.ReactiveMailer;
import io.smallrye.mutiny.Uni;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class RegistrationNotifierTest {

    private static final ContactPerson CONTACT = new ContactPerson("Maria", "Muster", "kassier@tv-zug.ch");

    private ReactiveMailer mailer;
    private RegistrationNotifier notifier;

    @BeforeEach
    void setUp() {
        mailer = mock(ReactiveMailer.class);
        when(mailer.send(any(Mail[].class))).thenReturn(Uni.createFrom().voidItem());
        notifier = new RegistrationNotifier();
        notifier.mailer = mailer;
    }

    private static Organization organization() {
        Organization organization = new Organization();
        organization.setName("Turnverein Zug");
        organization.setSlug("turnverein-zug");
        organization.setType(OrganizationType.VEREIN);
        organization.setCountry("CH");
        return organization;
    }

    @Test
    @DisplayName("sends nothing while no recipient is configured")
    void silentWithoutRecipients() {
        notifier.recipients = Optional.empty();

        notifier.organizationRegistered(organization(), CONTACT);

        verify(mailer, never()).send(any(Mail[].class));
    }

    @Test
    @DisplayName("mails the configured recipients, with replies going to the contact person")
    void mailsRecipients() {
        notifier.recipients = Optional.of(List.of("info@hopps.test", " team@hopps.test "));

        notifier.organizationRegistered(organization(), CONTACT);

        ArgumentCaptor<Mail> mail = ArgumentCaptor.forClass(Mail.class);
        verify(mailer).send(mail.capture());
        assertEquals(List.of("info@hopps.test", "team@hopps.test"), mail.getValue().getTo());
        assertEquals("Neue Registrierung: Turnverein Zug", mail.getValue().getSubject());
        assertEquals("kassier@tv-zug.ch", mail.getValue().getReplyTo());
        assertTrue(mail.getValue().getText().contains("Maria Muster"));
    }

    @Test
    @DisplayName("names the association, the contact person and when it happened")
    void text() {
        String text = RegistrationNotifier.text(organization(), CONTACT,
                ZonedDateTime.of(2026, 11, 10, 14, 5, 0, 0, ZoneId.of("Europe/Berlin")));

        assertTrue(text.contains("Verein:           Turnverein Zug"), text);
        assertTrue(text.contains("Rechtsform:       VEREIN"), text);
        assertTrue(text.contains("Land:             CH"), text);
        assertTrue(text.contains("E-Mail (Verein):  —"), text);
        assertTrue(text.contains("Ansprechperson:   Maria Muster"), text);
        assertTrue(text.contains("E-Mail:           kassier@tv-zug.ch"), text);
        assertTrue(text.contains("Registriert am:   10.11.2026 14:05 Uhr"), text);
    }
}
