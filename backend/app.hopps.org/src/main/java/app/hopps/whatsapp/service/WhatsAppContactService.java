package app.hopps.whatsapp.service;

import app.hopps.bommel.domain.Bommel;
import app.hopps.bommel.repository.BommelRepository;
import app.hopps.organization.domain.Organization;
import app.hopps.uploadlink.service.UploadRateLimiter;
import app.hopps.whatsapp.client.ChatbotClient;
import app.hopps.whatsapp.client.ChatbotInvitation;
import app.hopps.whatsapp.domain.WhatsAppContact;
import app.hopps.whatsapp.domain.WhatsAppContactStatus;
import app.hopps.whatsapp.repository.WhatsAppContactRepository;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.ClientErrorException;
import jakarta.ws.rs.NotFoundException;
import jakarta.ws.rs.ServiceUnavailableException;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.rest.client.inject.RestClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Optional;

/**
 * WhatsApp contacts of bommels: inviting a number (Hopps sends the invitation through the chatbot), the person's
 * answer, and the lookups the chatbot needs to file receipts.
 */
@ApplicationScoped
public class WhatsAppContactService {
    private static final Logger LOG = LoggerFactory.getLogger(WhatsAppContactService.class);
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final int MAX_NAME_LENGTH = 255;

    @Inject
    WhatsAppContactRepository contactRepository;

    @Inject
    BommelRepository bommelRepository;

    @Inject
    UploadRateLimiter rateLimiter;

    @Inject
    @RestClient
    ChatbotClient chatbotClient;

    public List<WhatsAppContact> contacts(Bommel bommel) {
        return contactRepository.listByBommelId(bommel.id);
    }

    /**
     * Invites the number to the bommel and sends the invitation. Inviting a number that declined or has an open
     * invitation sends a fresh one; the old buttons stop working.
     *
     * @throws ClientErrorException
     *             409 if the number is already connected to this bommel, 429 if the organization sent too many
     * @throws ServiceUnavailableException
     *             if the chatbot could not send it; the caller's transaction then rolls back, nothing is stored
     */
    public WhatsAppContact invite(Bommel bommel, String name, String phoneNumber, String inviterName,
            String invitedBy) {
        String phone = normalizePhoneNumber(phoneNumber);
        String cleanName = cleanName(name);
        WhatsAppContact contact = contactRepository.findByBommelAndPhoneNumber(bommel.id, phone)
                .orElseGet(WhatsAppContact::new);
        if (contact.getStatus() == WhatsAppContactStatus.ACTIVE) {
            throw new ClientErrorException("This number is already connected to the bommel",
                    Response.Status.CONFLICT);
        }
        Organization organization = bommelRepository.getOrganization(bommel);
        rateLimiter.acquire("whatsapp-invite:" + organization.getId());

        contact.setBommel(bommel);
        contact.setPhoneNumber(phone);
        contact.setName(cleanName);
        contact.setStatus(WhatsAppContactStatus.INVITED);
        contact.setInvitationToken(newToken());
        contact.setInvitedBy(invitedBy);
        contact.setInvitedAt(Instant.now());
        contact.setJoinedAt(null);
        contactRepository.persistAndFlush(contact);
        send(contact, organization, inviterName);
        return contact;
    }

    /** Sends the invitation of a contact that has not accepted again, with a fresh token. */
    public WhatsAppContact resend(WhatsAppContact contact, String inviterName, String invitedBy) {
        if (contact.getStatus() == WhatsAppContactStatus.ACTIVE) {
            throw new ClientErrorException("This number is already connected", Response.Status.CONFLICT);
        }
        return invite(contact.getBommel(), contact.getName(), contact.getPhoneNumber(), inviterName, invitedBy);
    }

    /**
     * The person accepted the invitation: connects the number to its bommel. A number connected to another bommel
     * moves.
     *
     * @return the contact, and the bommel the number was connected to before (if a different one)
     *
     * @throws NotFoundException
     *             if the token is unknown (replaced by a newer invitation, or the contact was removed) or belongs to
     *             another number
     * @throws ClientErrorException
     *             (410 Gone) if the invitation has expired
     */
    public AcceptResult accept(String token, String phoneNumber) {
        WhatsAppContact contact = answerableInvitation(token, phoneNumber);
        Bommel previous = null;
        Optional<WhatsAppContact> active = contactRepository.findActiveByPhoneNumber(contact.getPhoneNumber());
        if (active.isPresent() && !active.get().id.equals(contact.id)) {
            previous = active.get().getBommel();
            contactRepository.delete(active.get());
            // The partial unique index on active numbers would otherwise reject the update below.
            contactRepository.flush();
        }
        if (contact.getStatus() != WhatsAppContactStatus.ACTIVE) {
            contact.setStatus(WhatsAppContactStatus.ACTIVE);
            contact.setJoinedAt(Instant.now());
        }
        return new AcceptResult(contact, previous);
    }

    /** The person declined the invitation. An already accepted invitation stays accepted. */
    public WhatsAppContact decline(String token, String phoneNumber) {
        WhatsAppContact contact = answerableInvitation(token, phoneNumber);
        if (contact.getStatus() == WhatsAppContactStatus.INVITED) {
            contact.setStatus(WhatsAppContactStatus.DECLINED);
        }
        return contact;
    }

    public Optional<WhatsAppContact> findActive(String phoneNumber) {
        return contactRepository.findActiveByPhoneNumber(normalizePhoneNumber(phoneNumber));
    }

    /** @return whether the number was connected */
    public boolean disconnect(String phoneNumber) {
        return findActive(phoneNumber).map(contact -> {
            contactRepository.delete(contact);
            return true;
        }).orElse(false);
    }

    private WhatsAppContact answerableInvitation(String token, String phoneNumber) {
        String phone = normalizePhoneNumber(phoneNumber);
        WhatsAppContact contact = contactRepository.findByInvitationToken(token)
                .filter(c -> c.getPhoneNumber().equals(phone))
                .orElseThrow(() -> new NotFoundException("Invitation not found"));
        if (contact.getStatus() != WhatsAppContactStatus.ACTIVE && contact.isInvitationExpired(Instant.now())) {
            throw new ClientErrorException("Invitation has expired", Response.Status.GONE);
        }
        return contact;
    }

    private void send(WhatsAppContact contact, Organization organization, String inviterName) {
        Bommel bommel = contact.getBommel();
        String bommelLabel = bommel.getEmoji() == null || bommel.getEmoji().isBlank() ? bommel.getName()
                : bommel.getEmoji() + " " + bommel.getName();
        try {
            chatbotClient.sendInvitation(new ChatbotInvitation(contact.getPhoneNumber(), contact.getName(),
                    inviterName, bommelLabel, organization.getName(), contact.getInvitationToken()));
        } catch (RuntimeException e) {
            LOG.warn("Sending the WhatsApp invitation failed: contactId={}: {}", contact.id, e.getMessage());
            throw new ServiceUnavailableException("The WhatsApp invitation could not be sent");
        }
        LOG.info("WhatsApp invitation sent: contactId={}, bommelId={}", contact.id, bommel.id);
    }

    /**
     * Digits only, international format. Accepts "+49 176 …", "0049176…" and "49176…"; a national number with a single
     * leading 0 is rejected because the country is unknown.
     */
    public static String normalizePhoneNumber(String phoneNumber) {
        String raw = phoneNumber == null ? "" : phoneNumber.strip();
        String digits = raw.replaceAll("\\D", "");
        if (digits.startsWith("00")) {
            digits = digits.substring(2);
        } else if (!raw.startsWith("+") && digits.startsWith("0")) {
            throw new BadRequestException("Phone number needs a country code, e.g. +49");
        }
        if (digits.length() < 8 || digits.length() > 15) {
            throw new BadRequestException("Invalid phone number");
        }
        return digits;
    }

    private static String cleanName(String name) {
        String clean = name == null ? "" : name.strip();
        if (clean.isEmpty()) {
            throw new BadRequestException("Name is required");
        }
        if (clean.length() > MAX_NAME_LENGTH) {
            throw new BadRequestException("Name is too long");
        }
        return clean;
    }

    private static String newToken() {
        byte[] bytes = new byte[24];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    public record AcceptResult(WhatsAppContact contact, Bommel previousBommel) {
    }
}
