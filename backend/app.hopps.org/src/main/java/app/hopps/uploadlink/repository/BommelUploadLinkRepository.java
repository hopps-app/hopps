package app.hopps.uploadlink.repository;

import app.hopps.uploadlink.domain.BommelUploadLink;
import io.quarkus.hibernate.orm.panache.PanacheRepository;
import jakarta.enterprise.context.ApplicationScoped;

import java.util.Optional;

@ApplicationScoped
public class BommelUploadLinkRepository implements PanacheRepository<BommelUploadLink> {

    public Optional<BommelUploadLink> findByBommelId(Long bommelId) {
        return find("bommel.id", bommelId).firstResultOptional();
    }

    public Optional<BommelUploadLink> findByToken(String token) {
        return find("token", token).firstResultOptional();
    }
}
