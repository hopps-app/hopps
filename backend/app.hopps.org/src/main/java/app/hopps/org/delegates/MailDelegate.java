package app.hopps.org.delegates;

import app.hopps.commons.mail.Mail;
import app.hopps.commons.mail.MailTemplates;
import app.hopps.org.jpa.Organization;
import app.hopps.org.jpa.OrganizationRepository;
import app.hopps.org.rest.OrganizationResource;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.reactive.messaging.Channel;
import org.eclipse.microprofile.reactive.messaging.Emitter;
import org.kie.kogito.internal.process.runtime.KogitoProcessContext;

import java.net.URLEncoder;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

@ApplicationScoped
public class MailDelegate {
    @Inject
    @Channel("mail")
    Emitter<Mail> mailEmitter;

    @Inject
    OrganizationRepository organizationRepository;

    public void inviteMember(KogitoProcessContext kogitoProcessContext) {
        Map<String, Object> data = kogitoProcessContext.getContextData();
        String invitedEmail = (String) data.get("email");
        Boolean memberDoesExist = (Boolean) data.get("memberDoesExist");
        String orgSlug = (String) data.get("slug");

        String acceptInviteURL = memberDoesExist
                ? String.format(
                    "https://hopps.cloud/acceptInvite?pid=%s&email=%s",
                    URLEncoder.encode(kogitoProcessContext.getProcessInstance().getId(), StandardCharsets.UTF_8),
                    URLEncoder.encode(invitedEmail, StandardCharsets.UTF_8)
                )
                : String.format(
                    "https://hopps.cloud/registerAndAcceptInvite?pid=%s&email=%s",
                    URLEncoder.encode(kogitoProcessContext.getProcessInstance().getId(), StandardCharsets.UTF_8),
                    URLEncoder.encode(invitedEmail, StandardCharsets.UTF_8)
                 );


        Organization org = organizationRepository.findBySlug(orgSlug);

        Mail mail = new Mail(
            new String[] { invitedEmail },
            MailTemplates.INVITE_MEMBER,
            Map.of(
                    "orgName", org.getName(),
                    "acceptInviteURL", acceptInviteURL
            )
        );

        mailEmitter.send(mail);
    }
}
