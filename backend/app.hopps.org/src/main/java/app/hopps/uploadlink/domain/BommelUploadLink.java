package app.hopps.uploadlink.domain;

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
 * The public upload link of a bommel. Whoever has the link can submit receipts for the bommel without an account. A
 * bommel has at most one link; regenerating replaces it, so the old token stops working.
 */
@Entity
@Table(name = "bommel_upload_link")
public class BommelUploadLink extends PanacheEntity {

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "bommel_id", nullable = false, unique = true)
    private Bommel bommel;

    @Column(nullable = false, unique = true, length = 64)
    private String token;

    // Optional; the link stops working at this instant
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

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
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
