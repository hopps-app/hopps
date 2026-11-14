package app.hopps.whatsapp.repository;

import app.hopps.whatsapp.domain.WhatsAppContact;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.List;
import java.util.Optional;

@ApplicationScoped
public class WhatsAppContactRepository implements PanacheRepository<WhatsAppContact> {

    public Optional<WhatsAppContact> findByPhoneNumber(String phoneNumber) {
        return find("phoneNumber", phoneNumber).firstResultOptional();
    }

    public List<WhatsAppContact> listByBommelId(Long bommelId) {
        return list("bommel.id = ?1 order by joinedAt desc", bommelId);
    }

    public long deleteByBommelId(Long bommelId) {
        return delete("bommel.id", bommelId);
    }
}
