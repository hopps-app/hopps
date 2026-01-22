package app.fuggs.shared.template;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.*;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import app.fuggs.organization.domain.Organization;
import app.fuggs.shared.BaseOrganizationTest;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.security.TestSecurity;
import jakarta.inject.Inject;

@QuarkusTest
class UserContextTest extends BaseOrganizationTest
{
	@Inject
	UserContext userContext;

	@BeforeEach
	@jakarta.transaction.Transactional(jakarta.transaction.Transactional.TxType.REQUIRES_NEW)
	void setupTestMembers()
	{
		Organization org = getOrCreateTestOrganization();
		createTestMember("alice", org);
		createTestMember("bob", org);
		createTestMember("x", org);
	}

	@Test
	@TestSecurity(user = "alice", roles = { "admin", "user" })
	void shouldReturnAuthenticatedForAuthenticatedUser()
	{
		assertThat(userContext.isAuthenticated(), is(true));
	}

	@Test
	@TestSecurity(user = "alice", roles = { "admin", "user" })
	void shouldReturnUsernameForAuthenticatedUser()
	{
		assertThat(userContext.getUsername(), is("alice"));
	}

	@Test
	@TestSecurity(user = "alice", roles = { "admin", "user" })
	void shouldReturnMockEmailForAuthenticatedUser()
	{
		assertThat(userContext.getEmail(), is("alice@test.local"));
	}

	@Test
	@TestSecurity(user = "alice", roles = { "admin", "user" })
	void shouldReturnRolesForAuthenticatedUser()
	{
		assertThat(userContext.getRoles(), containsInAnyOrder("admin", "user"));
		assertThat(userContext.getRoles().size(), is(2));
	}

	@Test
	@TestSecurity(user = "bob", roles = { "user" })
	void shouldReturnSingleRoleForUserWithOneRole()
	{
		assertThat(userContext.getRoles(), contains("user"));
		assertThat(userContext.getRoles().size(), is(1));
	}

	@Test
	@TestSecurity(user = "alice", roles = { "admin", "user" })
	void shouldReturnTrueForHasRoleWhenUserHasRole()
	{
		assertThat(userContext.hasRole("admin"), is(true));
		assertThat(userContext.hasRole("user"), is(true));
	}

	@Test
	@TestSecurity(user = "alice", roles = { "admin", "user" })
	void shouldReturnFalseForHasRoleWhenUserDoesNotHaveRole()
	{
		assertThat(userContext.hasRole("superadmin"), is(false));
		assertThat(userContext.hasRole("guest"), is(false));
	}

	@Test
	@TestSecurity(user = "bob", roles = { "user" })
	void shouldReturnFalseForHasRoleWhenUserDoesNotHaveAdminRole()
	{
		assertThat(userContext.hasRole("admin"), is(false));
	}

	@Test
	@TestSecurity(user = "alice", roles = { "admin", "user" })
	void shouldReturnFirstLetterUppercaseForAuthenticatedUser()
	{
		assertThat(userContext.getFirstLetter(), is("A"));
	}

	@Test
	@TestSecurity(user = "bob", roles = { "user" })
	void shouldReturnFirstLetterUppercaseForBob()
	{
		assertThat(userContext.getFirstLetter(), is("B"));
	}

	@Test
	@TestSecurity(user = "x", roles = { "user" })
	void shouldReturnFirstLetterUppercaseForSingleCharacterUsername()
	{
		assertThat(userContext.getFirstLetter(), is("X"));
	}

	@Test
	void shouldReturnFalseForIsAuthenticatedWhenNotAuthenticated()
	{
		// No @TestSecurity annotation = anonymous/unauthenticated
		assertThat(userContext.isAuthenticated(), is(false));
	}

	@Test
	void shouldReturnNullForUsernameWhenNotAuthenticated()
	{
		assertThat(userContext.getUsername(), is(nullValue()));
	}

	@Test
	void shouldReturnNullForEmailWhenNotAuthenticated()
	{
		assertThat(userContext.getEmail(), is(nullValue()));
	}

	@Test
	void shouldReturnEmptySetForRolesWhenNotAuthenticated()
	{
		assertThat(userContext.getRoles(), is(empty()));
	}

	@Test
	void shouldReturnFalseForHasRoleWhenNotAuthenticated()
	{
		assertThat(userContext.hasRole("admin"), is(false));
		assertThat(userContext.hasRole("user"), is(false));
	}

	@Test
	void shouldReturnQuestionMarkForFirstLetterWhenNotAuthenticated()
	{
		assertThat(userContext.getFirstLetter(), is("?"));
	}
}
