package app.hopps.organization.service;

import app.hopps.organization.domain.Organization;
import io.quarkus.mailer.Mail;
import io.quarkus.mailer.reactive.ReactiveMailer;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;

/**
 * Tells the people running the installation about every new organization, e.g. the hosted SaaS team at info@hopps.app.
 * Off unless {@code hopps.registration.notification-recipients} is set, so a self-hosted installation sends nothing
 * anywhere.
 * <p>
 * The mail goes out in the background after the organization is stored: a mail server that is down or slow neither
 * delays nor fails the registration, it is only logged.
 */
@ApplicationScoped
public class RegistrationNotifier {

    private static final Logger LOG = LoggerFactory.getLogger(RegistrationNotifier.class);
    private static final ZoneId ZONE = ZoneId.of("Europe/Berlin");
    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm 'Uhr'");

    @Inject
    ReactiveMailer mailer;

    @ConfigProperty(name = "hopps.registration.notification-recipients")
    Optional<List<String>> recipients;

    /** The person who registered the organization and is its first administrator. */
    public record ContactPerson(String firstName, String lastName, String email) {
    }

    /**
     * Sends the notification for a newly registered organization, if anyone is to receive it.
     *
     * @param organization
     *            the organization as stored
     * @param contact
     *            who registered it
     */
    public void organizationRegistered(Organization organization, ContactPerson contact) {
        List<String> to = recipients.orElse(List.of())
                .stream()
                .map(String::strip)
                .filter(address -> !address.isEmpty())
                .toList();
        if (to.isEmpty()) {
            return;
        }

        Mail mail = new Mail()
                .setTo(to)
                .setSubject(subject(organization))
                .setText(text(organization, contact, ZonedDateTime.now(ZONE)));
        if (contact.email() != null && !contact.email().isBlank()) {
            // Replying goes straight to the new association.
            mail.setReplyTo(contact.email());
        }

        mailer.send(mail)
                .subscribe()
                .with(
                        ignored -> LOG.info("Sent registration notification for {}", organization.getSlug()),
                        failure -> LOG.warn("Could not send registration notification for {}: {}",
                                organization.getSlug(), failure.getMessage()));
    }

    static String subject(Organization organization) {
        return "Neue Registrierung: " + organization.getName();
    }

    static String text(Organization organization, ContactPerson contact, ZonedDateTime registeredAt) {
        return """
                Eine neue Organisation hat sich bei hopps registriert.

                Verein:           %s
                Rechtsform:       %s
                Land:             %s
                E-Mail (Verein):  %s

                Ansprechperson:   %s
                E-Mail:           %s

                Kennung (Slug):   %s
                Registriert am:   %s
                """.formatted(
                orDash(organization.getName()),
                organization.getType() == null ? "—" : organization.getType().name(),
                orDash(organization.getCountry()),
                orDash(organization.getEmail()),
                orDash(String.join(" ", nonBlank(contact.firstName()), nonBlank(contact.lastName())).strip()),
                orDash(contact.email()),
                orDash(organization.getSlug()),
                TIME.format(registeredAt));
    }

    private static String nonBlank(String value) {
        return value == null ? "" : value.strip();
    }

    private static String orDash(String value) {
        return value == null || value.isBlank() ? "—" : value;
    }
}
