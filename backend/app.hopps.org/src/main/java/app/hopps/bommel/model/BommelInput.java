package app.hopps.bommel.model;

import app.hopps.bommel.domain.Bommel;
import app.hopps.member.domain.Member;

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
