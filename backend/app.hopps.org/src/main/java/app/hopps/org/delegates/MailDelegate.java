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
        Map<String, String> params = Map.of(
                "email", email,
                "register", !memberDoesExist + "",
                "slug", slug,
                "pid", kogitoProcessContext.getProcessInstance().getId()
        );
        StringBuilder acceptInviteURL = new StringBuilder("https://hopps.cloud/organization/join?");

        for (Map.Entry<String, String> entry : params.entrySet()) {
            acceptInviteURL.append(URLEncoder.encode(entry.getKey(), StandardCharsets.UTF_8));
            acceptInviteURL.append("=");
            acceptInviteURL.append(URLEncoder.encode(entry.getValue(), StandardCharsets.UTF_8));
            acceptInviteURL.append("&");
        }

        Organization org = organizationRepository.findBySlug(slug);

        Mail mail = new Mail(
                new String[]{email},
                MailTemplates.INVITE_MEMBER,
                Map.of(
                        "orgName", org.getName(),
                        "acceptInviteURL", acceptInviteURL.toString()
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
