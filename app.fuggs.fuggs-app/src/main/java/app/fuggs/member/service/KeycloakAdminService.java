package app.fuggs.member.service;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.keycloak.admin.client.Keycloak;
import org.keycloak.representations.idm.CredentialRepresentation;
import org.keycloak.representations.idm.RoleRepresentation;
import org.keycloak.representations.idm.UserRepresentation;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.core.Response;

@ApplicationScoped
public class KeycloakAdminService
{
	private static final Logger LOG = LoggerFactory.getLogger(KeycloakAdminService.class);

	@Inject
	Keycloak keycloak;

	@ConfigProperty(name = "quarkus.keycloak.admin-client.realm")
	String realm;

	public String createUser(String username, String email, String firstName,
		String lastName, List<String> roles)
	{
		CredentialRepresentation credential = new CredentialRepresentation();
		credential.setType(CredentialRepresentation.PASSWORD);
		credential.setValue("password"); // Default password
		credential.setTemporary(false);

		UserRepresentation user = new UserRepresentation();
		user.setUsername(username);
		user.setEmail(email);
		user.setFirstName(firstName);
		user.setLastName(lastName);
		user.setEnabled(true);
		user.setEmailVerified(true);
		user.setCredentials(Collections.singletonList(credential));

		Response response = keycloak.realm(realm).users().create(user);

		if (response.getStatus() == 201)
		{
			String userId = extractUserId(response);
			assignRoles(userId, roles);
			LOG.info("Keycloak user created: username={}, userId={}", username, userId);
			return userId;
		}
		else
		{
			String error = response.readEntity(String.class);
			LOG.error("Failed to create Keycloak user: status={}, error={}",
				response.getStatus(), error);
			throw new RuntimeException("Failed to create Keycloak user: " + error);
		}
	}

	private String extractUserId(Response response)
	{
		String location = response.getHeaderString("Location");
		return location.substring(location.lastIndexOf('/') + 1);
	}

	private void assignRoles(String userId, List<String> roleNames)
	{
		if (roleNames == null || roleNames.isEmpty())
		{
			return;
		}

		// Ensure roles exist before trying to assign them
		roleNames.forEach(this::ensureRoleExists);

		List<RoleRepresentation> roles = roleNames.stream()
			.map(roleName -> keycloak.realm(realm).roles().get(roleName).toRepresentation())
			.collect(Collectors.toList());

		keycloak.realm(realm).users().get(userId).roles().realmLevel().add(roles);
		LOG.info("Assigned roles to user {}: {}", userId, roleNames);
	}

	private void ensureRoleExists(String roleName)
	{
		try
		{
			// Try to get the role - if it exists, this will succeed
			keycloak.realm(realm).roles().get(roleName).toRepresentation();
		}
		catch (Exception e)
		{
			// Role doesn't exist, create it
			LOG.info("Creating role: {}", roleName);
			RoleRepresentation role = new RoleRepresentation();
			role.setName(roleName);
			keycloak.realm(realm).roles().create(role);
			LOG.info("Role created: {}", roleName);
		}
	}

	public void deleteUser(String username)
	{
		UserRepresentation user = keycloak.realm(realm).users().search(username).stream().findFirst().orElse(null);
		if (user == null)
		{
			LOG.warn("No Keycloak user to delete for {}", username);
		}
		else
		{
			try (Response response = keycloak.realm(realm).users().delete(user.getId()))
			{
				LOG.info("Deleted Keycloak user with status {}: {}", response.getStatus(), username);
			}
		}
	}

	/**
	 * Finds a Keycloak user by username and returns their user ID.
	 *
	 * @param username
	 *            The username to search for
	 * @return The Keycloak user ID, or null if not found
	 */
	public String findUserIdByUsername(String username)
	{
		List<UserRepresentation> users = keycloak.realm(realm).users().search(username, true);
		if (users.isEmpty())
		{
			LOG.debug("No Keycloak user found with username: {}", username);
			return null;
		}

		UserRepresentation user = users.getFirst();
		LOG.debug("Found Keycloak user: username={}, userId={}", username, user.getId());
		return user.getId();
	}
}
