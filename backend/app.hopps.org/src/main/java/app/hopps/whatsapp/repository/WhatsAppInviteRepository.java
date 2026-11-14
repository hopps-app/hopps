package app.hopps.whatsapp.repository;

import app.hopps.whatsapp.domain.WhatsAppInvite;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.Optional;

@ApplicationScoped
public class WhatsAppInviteRepository implements PanacheRepository<WhatsAppInvite> {

    public Optional<WhatsAppInvite> findByBommelId(Long bommelId) {
        return find("bommel.id", bommelId).firstResultOptional();
    }

    public Optional<WhatsAppInvite> findByCode(String code) {
        return find("code", code).firstResultOptional();
    }
}
