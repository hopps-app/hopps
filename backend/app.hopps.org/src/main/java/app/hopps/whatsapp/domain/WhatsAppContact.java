package app.hopps.whatsapp.domain;

import app.hopps.bommel.domain.Bommel;
import io.quarkus.hibernate.orm.panache.PanacheEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.Instant;

/**
 * A phone number that joined a bommel through its WhatsApp invite. A number belongs to exactly one bommel.
 */
@Entity
@Table(name = "whatsapp_contact")
public class WhatsAppContact extends PanacheEntity {

    // Digits only, international format without '+', e.g. 4917612345678
    @Column(name = "phone_number", nullable = false, unique = true, length = 20)
    private String phoneNumber;

    // WhatsApp profile name at the time of joining; may be null
    @Column(name = "display_name")
    private String displayName;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "bommel_id", nullable = false)
    private Bommel bommel;

    @Column(name = "joined_at", nullable = false)
    private Instant joinedAt;

    /**
     * The number with all but the last four digits hidden, for showing it to other members.
     */
    public String getMaskedPhoneNumber() {
        String digits = phoneNumber == null ? "" : phoneNumber;
        return digits.length() <= 4 ? "••••" : "••• " + digits.substring(digits.length() - 4);
    }

    /** The name to show for this contact: the profile name, or the masked number without one. */
    public String getLabel() {
        return displayName != null && !displayName.isBlank() ? displayName : getMaskedPhoneNumber();
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }

    public void setPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
    }

    public String getDisplayName() {
        return displayName;
    }

    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }

    public Bommel getBommel() {
        return bommel;
    }

    public void setBommel(Bommel bommel) {
        this.bommel = bommel;
    }

    public Instant getJoinedAt() {
        return joinedAt;
    }

    public void setJoinedAt(Instant joinedAt) {
        this.joinedAt = joinedAt;
    }
}
