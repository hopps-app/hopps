package app.hopps.chatbot.invitation.service;

import app.hopps.chatbot.chat.service.ChatCommands;
import app.hopps.chatbot.chat.service.ChatReplies;
import app.hopps.chatbot.invitation.api.InvitationRequest;
import app.hopps.chatbot.whatsapp.service.WhatsAppMessenger;
import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Instant;
import java.util.List;

/**
 * Sends an invitation either as WhatsApp template message or, in dev, into the debug chat's outbox.
 */
@ApplicationScoped
public class InvitationSender {
    private static final Logger LOG = LoggerFactory.getLogger(InvitationSender.class);

    private final WhatsAppMessenger messenger;
    private final DebugOutbox debugOutbox;
    private final String channel;

    public InvitationSender(WhatsAppMessenger messenger, DebugOutbox debugOutbox,
            @ConfigProperty(name = "hopps.chatbot.invitations.channel") String channel) {
        this.messenger = messenger;
        this.debugOutbox = debugOutbox;
        this.channel = channel;
    }

    public void send(InvitationRequest invitation) {
        String accept = ChatCommands.ACCEPT_PREFIX + invitation.token();
        String decline = ChatCommands.DECLINE_PREFIX + invitation.token();
        if ("debug".equals(channel)) {
            debugOutbox.add(invitation.phoneNumber(), new DebugOutbox.Message(
                    ChatReplies.invitation(invitation.inviterName(), invitation.bommelLabel(),
                            invitation.organizationName()),
                    List.of(new DebugOutbox.Button(ChatReplies.ACCEPT_BUTTON, accept),
                            new DebugOutbox.Button(ChatReplies.DECLINE_BUTTON, decline)),
                    Instant.now()));
            LOG.info("Invitation put into the debug outbox");
            return;
        }
        messenger.sendInvitationTemplate(invitation.phoneNumber(),
                List.of(invitation.inviterName(), invitation.bommelLabel(), invitation.organizationName()),
                List.of(accept, decline));
        LOG.info("Invitation template sent via WhatsApp");
    }
}
