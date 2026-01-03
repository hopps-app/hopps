package app.hopps.shared.template;

import java.util.Set;

import io.quarkus.security.identity.SecurityIdentity;
import jakarta.enterprise.context.RequestScoped;
import jakarta.inject.Inject;
import jakarta.inject.Named;

/**
 * Makes user data from SecurityIdentity available in all Qute templates via
 * inject:userContext
 */
@RequestScoped
@Named("userContext")
public class UserContext
{
	@Inject
	SecurityIdentity securityIdentity;

	public boolean isAuthenticated()
	{
		return securityIdentity != null && !securityIdentity.isAnonymous();
	}

	public String getUsername()
	{
		return isAuthenticated() ? securityIdentity.getPrincipal().getName() : null;
	}

	public String getEmail()
	{
		// Mock email pattern - in production, get from OIDC UserInfo
		return isAuthenticated() ? getUsername() + "@hopps.local" : null;
	}

	public Set<String> getRoles()
	{
		return isAuthenticated() ? securityIdentity.getRoles() : Set.of();
	}

	public boolean hasRole(String role)
	{
		return isAuthenticated() && securityIdentity.hasRole(role);
	}

	public String getFirstLetter()
	{
		String username = getUsername();
		return username != null && !username.isEmpty() ? username.substring(0, 1).toUpperCase() : "?";
	}
}
