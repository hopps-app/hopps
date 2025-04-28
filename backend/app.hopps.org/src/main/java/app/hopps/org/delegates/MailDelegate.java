package app.hopps.org.delegates;

import app.hopps.commons.mail.Mail;
import app.hopps.commons.mail.MailTemplates;
import app.hopps.org.jpa.Organization;
import app.hopps.org.jpa.OrganizationRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.reactive.messaging.Channel;
import org.eclipse.microprofile.reactive.messaging.Emitter;
import org.kie.kogito.internal.process.runtime.KogitoProcessContext;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Map;

@ApplicationScoped
public class MailDelegate {
    @Inject
    @Channel("mail")
    Emitter<Mail> mailEmitter;

    @Inject
    OrganizationRepository organizationRepository;

    public void inviteMember(boolean memberDoesExist, String email, String slug, KogitoProcessContext kogitoProcessContext) {
        String acceptInviteURL = memberDoesExist
                ? String.format(
                "https://hopps.cloud/acceptInvite?pid=%s&email=%s",
                URLEncoder.encode(kogitoProcessContext.getProcessInstance().getId(), StandardCharsets.UTF_8),
                URLEncoder.encode(email, StandardCharsets.UTF_8)
        )
                : String.format(
                "https://hopps.cloud/registerAndAcceptInvite?pid=%s&email=%s",
                URLEncoder.encode(kogitoProcessContext.getProcessInstance().getId(), StandardCharsets.UTF_8),
                URLEncoder.encode(email, StandardCharsets.UTF_8)
        );


        Organization org = organizationRepository.findBySlug(slug);

        Mail mail = new Mail(
                new String[]{email},
                MailTemplates.INVITE_MEMBER,
                Map.of(
                        "orgName", org.getName(),
                        "acceptInviteURL", acceptInviteURL
                )
        );

        mailEmitter.send(mail);
    }

    public void confirmOrgJoining(String slug, String email, KogitoProcessContext kogitoProcessContext) {

        Organization org = organizationRepository.findBySlug(slug);

        Mail mail = new Mail(
                new String[]{email},
                MailTemplates.CONFIRM_ORG_JOINING,
                Map.of("orgName", org.getName())
        );

        mailEmitter.send(mail);
    }
}
