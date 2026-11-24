package app.hopps.whatsapp.domain;

import app.hopps.bommel.domain.Bommel;
import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.Duration;
import java.time.Instant;

/**
 * A person a member invited to send receipts for a bommel via WhatsApp. Hopps sends the invitation; the number is
 * connected only once the person accepts it. A number is ACTIVE in at most one bommel.
 */
@Entity
@Table(name = "whatsapp_contact")
public class WhatsAppContact extends PanacheEntity {

    /** How long the buttons of an invitation can be used. */
    public static final Duration INVITATION_VALIDITY = Duration.ofDays(30);

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "bommel_id", nullable = false)
    private Bommel bommel;

    // Digits only, international format without '+', e.g. 4917612345678
    @Column(name = "phone_number", nullable = false, length = 20)
    private String phoneNumber;

    // The name the inviting member typed
    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private WhatsAppContactStatus status;

    @Column(name = "invitation_token", nullable = false, unique = true, length = 64)
    private String invitationToken;

    @Column(name = "invited_by")
    private String invitedBy;

    @Column(name = "invited_at", nullable = false)
    private Instant invitedAt;

    @Column(name = "joined_at")
    private Instant joinedAt;

    public boolean isInvitationExpired(Instant now) {
        return !now.isBefore(invitedAt.plus(INVITATION_VALIDITY));
    }

    /**
     * The number with all but the last four digits hidden, for showing it to members.
     */
    public String getMaskedPhoneNumber() {
        String digits = phoneNumber == null ? "" : phoneNumber;
        return digits.length() <= 4 ? "••••" : "••• " + digits.substring(digits.length() - 4);
    }

    public Bommel getBommel() {
        return bommel;
    }

    public void setBommel(Bommel bommel) {
        this.bommel = bommel;
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public WhatsAppContactStatus getStatus() {
        return status;
    }

    public void setStatus(WhatsAppContactStatus status) {
        this.status = status;
    }

    public String getInvitationToken() {
        return invitationToken;
    }

    public void setInvitationToken(String invitationToken) {
        this.invitationToken = invitationToken;
    }

    public String getInvitedBy() {
        return invitedBy;
    }

    public void setInvitedBy(String invitedBy) {
        this.invitedBy = invitedBy;
    }

    public Instant getInvitedAt() {
        return invitedAt;
    }

    public void setInvitedAt(Instant invitedAt) {
        this.invitedAt = invitedAt;
    }

    public Instant getJoinedAt() {
        return joinedAt;
    }

    public void setJoinedAt(Instant joinedAt) {
        this.joinedAt = joinedAt;
    }
}
