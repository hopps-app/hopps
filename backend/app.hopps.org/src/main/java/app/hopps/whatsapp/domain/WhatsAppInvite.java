package app.hopps.whatsapp.domain;

import app.hopps.bommel.domain.Bommel;
import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

/**
 * The WhatsApp invite of a bommel. Sending its code to the Hopps chatbot connects the phone number to the bommel; from
 * then on receipts from that number are filed there. A bommel has at most one invite; regenerating replaces it, so the
 * old code stops working.
 */
@Entity
@Table(name = "whatsapp_invite")
public class WhatsAppInvite extends PanacheEntity {

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "bommel_id", nullable = false, unique = true)
    private Bommel bommel;

    // Normalized form without separator, e.g. ABCDEFGHJK; see InviteCodes
    @Column(nullable = false, unique = true, length = 16)
    private String code;

    // Optional; the code can no longer be redeemed from this instant
    @Column(name = "expires_at")
    private Instant expiresAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "created_by")
    private String createdBy;

    public boolean isExpired(Instant now) {
        return expiresAt != null && !now.isBefore(expiresAt);
    }

    public Bommel getBommel() {
        return bommel;
    }

    public void setBommel(Bommel bommel) {
        this.bommel = bommel;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(Instant expiresAt) {
        this.expiresAt = expiresAt;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public String getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(String createdBy) {
        this.createdBy = createdBy;
    }
}
