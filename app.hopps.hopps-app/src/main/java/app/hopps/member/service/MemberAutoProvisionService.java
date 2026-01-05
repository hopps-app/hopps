package app.hopps.member.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import app.hopps.member.domain.Member;
import app.hopps.member.repository.MemberRepository;
import app.hopps.organization.repository.OrganizationRepository;
import app.hopps.organization.domain.Organization;
import io.quarkus.oidc.IdToken;
import io.quarkus.oidc.UserInfo;
import io.quarkus.security.identity.SecurityIdentity;
import io.quarkus.vertx.http.runtime.security.QuarkusHttpUser;
import io.vertx.ext.web.RoutingContext;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import jakarta.transaction.Transactional;

/**
 * Automatically provisions Member records for authenticated users who don't
 * have one yet.
 */
@ApplicationScoped
public class MemberAutoProvisionService
{
	private static final Logger LOG = LoggerFactory.getLogger(MemberAutoProvisionService.class);

	@Inject
	MemberRepository memberRepository;

	@Inject
	OrganizationRepository organizationRepository;

	/**
	 * Observes routing context to check if authenticated users need Member
	 * records created.
	 */
	public void onRequest(@Observes RoutingContext event)
	{
		// Only process if user is authenticated
		if (event.user() instanceof QuarkusHttpUser quarkusUser)
		{
			SecurityIdentity identity = quarkusUser.getSecurityIdentity();
			if (identity != null && !identity.isAnonymous())
			{
				String keycloakUserId = identity.getPrincipal().getName();
				ensureMemberExists(keycloakUserId, identity);
			}
		}
	}

	/**
	 * Ensures a Member record exists for the given Keycloak user.
	 */
	@Transactional
	public void ensureMemberExists(String keycloakUserId, SecurityIdentity identity)
	{
		// Check if Member already exists
		Member existing = memberRepository.findByKeycloakUserId(keycloakUserId);
		if (existing != null)
		{
			return; // Already exists
		}

		// Don't auto-create for super_admin (they can manage multiple orgs)
		if (identity.hasRole("super_admin"))
		{
			LOG.debug("Skipping auto-provision for super_admin: {}", keycloakUserId);
			return;
		}

		// Extract username to determine which organization to use
		String preferredUsername = identity.getAttribute("preferred_username");

		// Determine organization - member1 and member2 get test org, others get
		// default
		Organization organization;
		if ("member1".equals(preferredUsername) || "member2".equals(preferredUsername))
		{
			organization = organizationRepository.findBySlug("musikverein-harmonie");
			if (organization == null)
			{
				LOG.warn("Cannot auto-provision member - test organization not found");
				return;
			}
		}
		else
		{
			organization = organizationRepository.findBySlug("default");
			if (organization == null)
			{
				LOG.warn("Cannot auto-provision member - default organization not found");
				return;
			}
		}

		// Extract user info from token attributes
		String email = identity.getAttribute("email");
		String firstName = identity.getAttribute("given_name");
		String lastName = identity.getAttribute("family_name");

		// Fallback to username if email not available
		if (email == null)
		{
			email = preferredUsername + "@hopps.local";
		}

		// Check if member with this email already exists (might be from demo
		// data)
		Member existingByEmail = memberRepository.findByEmail(email);
		if (existingByEmail != null)
		{
			// Link existing member to Keycloak user
			existingByEmail.setKeycloakUserId(keycloakUserId);
			memberRepository.persist(existingByEmail);
			LOG.info("Linked existing member {} to Keycloak user: {}",
				existingByEmail.getEmail(), keycloakUserId);
			return;
		}

		// Create new Member record
		Member newMember = new Member();
		newMember.setKeycloakUserId(keycloakUserId);
		newMember.setEmail(email);
		newMember.setFirstName(firstName != null ? firstName : preferredUsername);
		newMember.setLastName(lastName != null ? lastName : "User");
		newMember.setOrganization(organization);
		memberRepository.persist(newMember);

		LOG.info("Auto-provisioned new member: {} to organization {} (keycloakUserId: {})",
			newMember.getEmail(), organization.getName(), keycloakUserId);
	}
}
