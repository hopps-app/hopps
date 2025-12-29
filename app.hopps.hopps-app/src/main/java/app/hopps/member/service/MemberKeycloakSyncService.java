package app.hopps.member.service;

import java.util.ArrayList;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import app.hopps.member.domain.Member;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;

@ApplicationScoped
public class MemberKeycloakSyncService
{
	private static final Logger LOG = LoggerFactory.getLogger(MemberKeycloakSyncService.class);

	@Inject
	KeycloakAdminService keycloakAdminService;

	public String syncMemberToKeycloak(Member member, List<String> additionalRoles)
	{
		String username = member.generateUsername();
		List<String> roles = new ArrayList<>(List.of("user"));
		if (additionalRoles != null)
		{
			roles.addAll(additionalRoles);
		}

		LOG.info("Syncing member to Keycloak: memberId={}, username={}, roles={}",
			member.getId(), username, roles);

		String keycloakUserId = keycloakAdminService.createUser(
			username,
			member.getEmail(),
			member.getFirstName(),
			member.getLastName(),
			roles);

		member.setKeycloakUserId(keycloakUserId);
		LOG.info("Member synced to Keycloak: memberId={}, keycloakUserId={}",
			member.getId(), keycloakUserId);
		return keycloakUserId;
	}

	public String syncMemberToKeycloak(Member member)
	{
		return syncMemberToKeycloak(member, null);
	}

	public void deleteMemberKeycloakUser(Member member)
	{
		if (member.getKeycloakUserId() != null)
		{
			LOG.info("Deleting Keycloak user for member: memberId={}, keycloakUserId={}",
				member.getId(), member.getKeycloakUserId());
			keycloakAdminService.deleteUser(member.getKeycloakUserId());
			LOG.info("Keycloak user deleted for member: memberId={}", member.getId());
		}
		else
		{
			LOG.debug("Member has no Keycloak user to delete: memberId={}", member.getId());
		}
	}

}
