package app.hopps.whatsapp.repository;

import app.hopps.whatsapp.domain.WhatsAppContact;
import app.hopps.whatsapp.domain.WhatsAppContactStatus;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.Optional;

@ApplicationScoped
public class WhatsAppContactRepository implements PanacheRepository<WhatsAppContact> {

    /** The bommel the number is connected to, if any. */
    public Optional<WhatsAppContact> findActiveByPhoneNumber(String phoneNumber) {
        return find("phoneNumber = ?1 and status = ?2", phoneNumber, WhatsAppContactStatus.ACTIVE)
                .firstResultOptional();
    }

    public Optional<WhatsAppContact> findByBommelAndPhoneNumber(Long bommelId, String phoneNumber) {
        return find("bommel.id = ?1 and phoneNumber = ?2", bommelId, phoneNumber).firstResultOptional();
    }

    public Optional<WhatsAppContact> findByInvitationToken(String token) {
        return find("invitationToken", token).firstResultOptional();
    }

    public List<WhatsAppContact> listByBommelId(Long bommelId) {
        return list("bommel.id = ?1 order by invitedAt desc", bommelId);
    }
}
