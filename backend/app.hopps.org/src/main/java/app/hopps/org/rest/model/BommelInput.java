package app.hopps.org.rest.model;

import app.hopps.org.jpa.Bommel;
import app.hopps.org.jpa.Member;

import java.util.Optional;

public record BommelInput(Long organizationId, String name, String emoji, Optional<Long> parentId,
        Optional<Member> member) {
    public Bommel toBommel() {
        Bommel bommel = new Bommel();

        bommel.setName(name());
        bommel.setEmoji(emoji());
        member().ifPresent(bommel::setResponsibleMember);

        return bommel;
    }
}
