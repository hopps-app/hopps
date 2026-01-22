package app.fuggs.member.service;

import app.fuggs.member.domain.Member;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.ArrayList;
import java.util.List;

@ApplicationScoped
public class MemberKeycloakSyncService
{
	private static final Logger LOG = LoggerFactory.getLogger(MemberKeycloakSyncService.class);

	@Inject
	KeycloakAdminService keycloakAdminService;

	public String syncMemberToKeycloak(Member member, List<String> additionalRoles)
	{
		String username = member.getUserName();
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
		LOG.info("Deleting Keycloak user for member: memberId={}, username={}", member.getId(), member.getUserName());
		keycloakAdminService.deleteUser(member.getUserName());
		LOG.info("Keycloak user deleted for member: memberId={}", member.getId());
	}
}
