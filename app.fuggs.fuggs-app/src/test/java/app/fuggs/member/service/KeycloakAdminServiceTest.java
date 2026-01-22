package app.fuggs.member.service;

import jakarta.ws.rs.core.Response;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.keycloak.admin.client.Keycloak;
import org.keycloak.admin.client.resource.RealmResource;
import org.keycloak.admin.client.resource.RoleMappingResource;
import org.keycloak.admin.client.resource.RoleResource;
import org.keycloak.admin.client.resource.RoleScopeResource;
import org.keycloak.admin.client.resource.RolesResource;
import org.keycloak.admin.client.resource.UserResource;
import org.keycloak.admin.client.resource.UsersResource;
import org.keycloak.representations.idm.RoleRepresentation;
import org.keycloak.representations.idm.UserRepresentation;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class KeycloakAdminServiceTest
{
	@Mock
	Keycloak keycloak;

	@Mock
	RealmResource realmResource;

	@Mock
	UsersResource usersResource;

	@Mock
	RolesResource rolesResource;

	@Mock
	RoleResource roleResource;

	@Mock
	UserResource userResource;

	@Mock
	RoleMappingResource roleMappingResource;

	@Mock
	RoleScopeResource roleScopeResource;

	@Mock
	Response response;

	@InjectMocks
	KeycloakAdminService service;

	@BeforeEach
	void setUp()
	{
		// Set the realm via reflection since it's injected via @ConfigProperty
		try
		{
			var field = KeycloakAdminService.class.getDeclaredField("realm");
			field.setAccessible(true);
			field.set(service, "test-realm");
		}
		catch (Exception e)
		{
			throw new RuntimeException(e);
		}

		// Setup default mock chain with lenient() to avoid unnecessary stubbing
		// errors
		lenient().when(keycloak.realm("test-realm")).thenReturn(realmResource);
		lenient().when(realmResource.users()).thenReturn(usersResource);
		lenient().when(realmResource.roles()).thenReturn(rolesResource);
	}

	@Test
	void shouldCreateUserSuccessfully()
	{
		// Given
		String username = "john.doe";
		String email = "john.doe@example.com";
		String firstName = "John";
		String lastName = "Doe";
		List<String> roles = List.of("user", "admin");

		when(usersResource.create(any(UserRepresentation.class))).thenReturn(response);
		when(response.getStatus()).thenReturn(201);
		when(response.getHeaderString("Location"))
			.thenReturn("https://keycloak.example.com/users/user-123");

		// Mock role existence checks
		when(rolesResource.get("user")).thenReturn(roleResource);
		when(rolesResource.get("admin")).thenReturn(roleResource);
		when(roleResource.toRepresentation()).thenReturn(new RoleRepresentation());

		// Mock user resource for role assignment - full chain
		when(usersResource.get("user-123")).thenReturn(userResource);
		when(userResource.roles()).thenReturn(roleMappingResource);
		when(roleMappingResource.realmLevel()).thenReturn(roleScopeResource);

		// When
		String userId = service.createUser(username, email, firstName, lastName, roles);

		// Then
		assertEquals("user-123", userId);
		verify(usersResource).create(any(UserRepresentation.class));
		verify(roleScopeResource).add(anyList());
	}

	@Test
	void shouldThrowExceptionWhenUserCreationFails()
	{
		// Given
		when(usersResource.create(any(UserRepresentation.class))).thenReturn(response);
		when(response.getStatus()).thenReturn(400);
		when(response.readEntity(String.class)).thenReturn("User already exists");

		// When/Then
		assertThrows(RuntimeException.class, () -> {
			service.createUser("john.doe", "john@example.com", "John", "Doe", List.of("user"));
		});
	}

	@Test
	void shouldCreateUserWithoutRoles()
	{
		// Given
		when(usersResource.create(any(UserRepresentation.class))).thenReturn(response);
		when(response.getStatus()).thenReturn(201);
		when(response.getHeaderString("Location"))
			.thenReturn("https://keycloak.example.com/users/user-456");

		// When
		String userId = service.createUser("jane.doe", "jane@example.com", "Jane", "Doe", List.of());

		// Then
		assertEquals("user-456", userId);
		verify(usersResource).create(any(UserRepresentation.class));
		// Verify roles were not assigned (assignRoles returns early for empty
		// list)
		verify(usersResource, never()).get(any());
	}

	@Test
	void shouldHandleNullRolesList()
	{
		// Given
		when(usersResource.create(any(UserRepresentation.class))).thenReturn(response);
		when(response.getStatus()).thenReturn(201);
		when(response.getHeaderString("Location"))
			.thenReturn("https://keycloak.example.com/users/user-789");

		// When
		String userId = service.createUser("bob.smith", "bob@example.com", "Bob", "Smith", null);

		// Then
		assertEquals("user-789", userId);
		verify(usersResource).create(any(UserRepresentation.class));
		// Verify roles were not assigned
		verify(usersResource, never()).get(any());
	}

	@Test
	void shouldExtractUserIdFromLocationHeader()
	{
		// Given - location with complex path
		when(usersResource.create(any(UserRepresentation.class))).thenReturn(response);
		when(response.getStatus()).thenReturn(201);
		when(response.getHeaderString("Location"))
			.thenReturn("https://keycloak.example.com/admin/realms/test-realm/users/abc-123-def-456");

		// When
		String userId = service.createUser("test", "test@example.com", "Test", "User", List.of());

		// Then
		assertEquals("abc-123-def-456", userId);
	}

	@Test
	void shouldCreateRoleIfNotExists()
	{
		// Given
		when(usersResource.create(any(UserRepresentation.class))).thenReturn(response);
		when(response.getStatus()).thenReturn(201);
		when(response.getHeaderString("Location"))
			.thenReturn("https://keycloak.example.com/users/user-999");

		// Mock role doesn't exist on first call (throws exception), exists on
		// second
		when(rolesResource.get("new-role")).thenReturn(roleResource);
		when(roleResource.toRepresentation())
			.thenThrow(new RuntimeException("Role not found"))
			.thenReturn(new RoleRepresentation());

		// Mock user resource for role assignment
		when(usersResource.get("user-999")).thenReturn(userResource);
		when(userResource.roles()).thenReturn(roleMappingResource);
		when(roleMappingResource.realmLevel()).thenReturn(roleScopeResource);

		// When
		service.createUser("test", "test@example.com", "Test", "User", List.of("new-role"));

		// Then
		// Verify role was created
		verify(rolesResource).create(any(RoleRepresentation.class));
	}

	@Test
	void shouldDeleteUserSuccessfully()
	{
		// Given
		String username = "testuser";
		String userId = "user-id-123";

		UserRepresentation userRep = new UserRepresentation();
		userRep.setId(userId);
		userRep.setUsername(username);

		when(keycloak.realm("test-realm")).thenReturn(realmResource);
		when(realmResource.users()).thenReturn(usersResource);
		when(usersResource.search(username)).thenReturn(List.of(userRep));
		when(usersResource.delete(userId)).thenReturn(response);

		// When
		service.deleteUser(username);

		// Then
		verify(usersResource).search(username);
		verify(usersResource).delete(userId);
	}

	@Test
	void shouldHandleMultipleRoleAssignments()
	{
		// Given
		List<String> roles = List.of("role1", "role2", "role3");
		when(usersResource.create(any(UserRepresentation.class))).thenReturn(response);
		when(response.getStatus()).thenReturn(201);
		when(response.getHeaderString("Location"))
			.thenReturn("https://keycloak.example.com/users/user-multi-role");

		// Mock all roles exist
		when(rolesResource.get("role1")).thenReturn(roleResource);
		when(rolesResource.get("role2")).thenReturn(roleResource);
		when(rolesResource.get("role3")).thenReturn(roleResource);
		when(roleResource.toRepresentation()).thenReturn(new RoleRepresentation());

		// Mock user resource for role assignment
		when(usersResource.get("user-multi-role")).thenReturn(userResource);
		when(userResource.roles()).thenReturn(roleMappingResource);
		when(roleMappingResource.realmLevel()).thenReturn(roleScopeResource);

		// When
		String userId = service.createUser("multi", "multi@example.com", "Multi", "Role", roles);

		// Then
		assertEquals("user-multi-role", userId);
		// Verify roles assignment was called
		verify(roleScopeResource).add(anyList());
	}
}
