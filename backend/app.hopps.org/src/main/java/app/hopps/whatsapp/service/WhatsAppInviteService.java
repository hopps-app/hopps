package app.hopps.whatsapp.service;

import app.hopps.bommel.domain.Bommel;
import app.hopps.whatsapp.domain.WhatsAppContact;
import app.hopps.whatsapp.domain.WhatsAppInvite;
import app.hopps.whatsapp.repository.WhatsAppContactRepository;
import app.hopps.whatsapp.repository.WhatsAppInviteRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.ClientErrorException;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

/**
 * WhatsApp invites of bommels and the phone numbers that joined them.
 */
@ApplicationScoped
public class WhatsAppInviteService {
    /** Prefix of the message the join link pre-fills; the chatbot only looks for the code itself. */
    public static final String JOIN_MESSAGE_PREFIX = "Hopps-Code: ";
    private static final int MAX_DISPLAY_NAME_LENGTH = 255;

    @Inject
    WhatsAppInviteRepository inviteRepository;

    @Inject
    WhatsAppContactRepository contactRepository;

    // Digits only, e.g. 4989123456. Without it there is no wa.me link.
    @ConfigProperty(name = "hopps.whatsapp.business-number")
    Optional<String> businessNumber;

    // Dev fallback without a business number: the chatbot's debug chat, which accepts ?text= like wa.me does.
    @ConfigProperty(name = "hopps.whatsapp.debug-chat-url")
    Optional<String> debugChatUrl;

    public Optional<WhatsAppInvite> find(Bommel bommel) {
        return inviteRepository.findByBommelId(bommel.id);
    }

    /**
     * Creates a new invite for the bommel. An existing invite is replaced, so its code stops working; numbers that
     * already joined stay connected.
     */
    public WhatsAppInvite regenerate(Bommel bommel, Instant expiresAt, String createdBy) {
        find(bommel).ifPresent(invite -> {
            inviteRepository.delete(invite);
            // The unique bommel_id would otherwise clash with the invite inserted below.
            inviteRepository.flush();
        });

        WhatsAppInvite invite = new WhatsAppInvite();
        invite.setBommel(bommel);
        invite.setCode(InviteCodes.generate());
        invite.setExpiresAt(expiresAt);
        invite.setCreatedBy(createdBy);
        inviteRepository.persistAndFlush(invite);
        return invite;
    }

    /**
     * Turns WhatsApp off for the bommel: deletes its invite and disconnects every number that joined it.
     */
    public void revoke(Bommel bommel) {
        find(bommel).ifPresent(inviteRepository::delete);
        contactRepository.deleteByBommelId(bommel.id);
    }

    public List<WhatsAppContact> contacts(Bommel bommel) {
        return contactRepository.listByBommelId(bommel.id);
    }

    /**
     * Connects the phone number to the bommel of the invite. A number that was connected to another bommel moves.
     *
     * @return the contact, and the bommel it was connected to before (if a different one)
     *
     * @throws NotFoundException
     *             if no invite has this code (never existed, revoked or replaced)
     * @throws ClientErrorException
     *             (410 Gone) if the invite has expired
     */
    public JoinResult join(String code, String phoneNumber, String displayName) {
        String normalizedCode = InviteCodes.normalize(code)
                .orElseThrow(() -> new NotFoundException("Invite not found"));
        String phone = normalizePhoneNumber(phoneNumber);
        WhatsAppInvite invite = inviteRepository.findByCode(normalizedCode)
                .orElseThrow(() -> new NotFoundException("Invite not found"));
        if (invite.isExpired(Instant.now())) {
            throw new ClientErrorException("Invite has expired", Response.Status.GONE);
        }

        WhatsAppContact contact = contactRepository.findByPhoneNumber(phone).orElseGet(WhatsAppContact::new);
        Bommel previous = contact.isPersistent() && !contact.getBommel().id.equals(invite.getBommel().id)
                ? contact.getBommel()
                : null;
        contact.setPhoneNumber(phone);
        contact.setDisplayName(cleanDisplayName(displayName));
        contact.setBommel(invite.getBommel());
        contact.setJoinedAt(Instant.now());
        contactRepository.persist(contact);
        return new JoinResult(contact, previous);
    }

    public Optional<WhatsAppContact> findContact(String phoneNumber) {
        return contactRepository.findByPhoneNumber(normalizePhoneNumber(phoneNumber));
    }

    /** @return whether the number was connected */
    public boolean disconnect(String phoneNumber) {
        return findContact(phoneNumber).map(contact -> {
            contactRepository.delete(contact);
            return true;
        }).orElse(false);
    }

    /**
     * The link that opens a chat with the Hopps number and the code pre-filled, or null when neither a business number
     * nor a debug chat is configured.
     */
    public String joinUrl(WhatsAppInvite invite) {
        String text = URLEncoder.encode(JOIN_MESSAGE_PREFIX + InviteCodes.format(invite.getCode()),
                StandardCharsets.UTF_8).replace("+", "%20");
        if (businessNumber.isPresent() && !businessNumber.get().isBlank()) {
            return "https://wa.me/" + businessNumber.get().replaceAll("\\D", "") + "?text=" + text;
        }
        return debugChatUrl.map(url -> url + "?text=" + text).orElse(null);
    }

    static String normalizePhoneNumber(String phoneNumber) {
        String digits = phoneNumber == null ? "" : phoneNumber.replaceAll("\\D", "");
        if (digits.length() < 6 || digits.length() > 20) {
            throw new BadRequestException("Invalid phone number");
        }
        return digits;
    }

    private static String cleanDisplayName(String displayName) {
        if (displayName == null || displayName.isBlank()) {
            return null;
        }
        String name = displayName.strip();
        return name.length() > MAX_DISPLAY_NAME_LENGTH ? name.substring(0, MAX_DISPLAY_NAME_LENGTH) : name;
    }

    public record JoinResult(WhatsAppContact contact, Bommel previousBommel) {
    }
}
