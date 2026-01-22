package app.fuggs.member.service;

import app.fuggs.member.domain.Member;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MemberKeycloakSyncServiceTest
{
	@Mock
	KeycloakAdminService keycloakAdminService;

	@InjectMocks
	MemberKeycloakSyncService syncService;

	private Member member;

	@BeforeEach
	void setUp()
	{
		member = new Member();
		member.id = 123L;
		member.setUserName("john.doe");
		member.setFirstName("John");
		member.setLastName("Doe");
		member.setEmail("john.doe@example.com");
	}

	@Test
	void shouldSyncMemberWithDefaultRoles()
	{
		// Given
		when(keycloakAdminService.createUser(any(), any(), any(), any(), any()))
			.thenReturn("kc-user-123");

		// When
		String result = syncService.syncMemberToKeycloak(member);

		// Then
		assertEquals("kc-user-123", result);
		verify(keycloakAdminService).createUser(
			eq("john.doe"),
			eq("john.doe@example.com"),
			eq("John"),
			eq("Doe"),
			argThat(list -> list.size() == 1 && list.contains("user")));
	}

	@Test
	void shouldSyncMemberWithAdditionalRoles()
	{
		// Given
		List<String> additionalRoles = List.of("admin", "moderator");
		when(keycloakAdminService.createUser(any(), any(), any(), any(), any()))
			.thenReturn("kc-user-456");

		// When
		String result = syncService.syncMemberToKeycloak(member, additionalRoles);

		// Then
		assertEquals("kc-user-456", result);
		verify(keycloakAdminService).createUser(
			eq("john.doe"),
			eq("john.doe@example.com"),
			eq("John"),
			eq("Doe"),
			argThat(list -> list.size() == 3
				&& list.contains("user")
				&& list.contains("admin")
				&& list.contains("moderator")));
	}

	@Test
	void shouldHandleNullAdditionalRoles()
	{
		// Given
		when(keycloakAdminService.createUser(any(), any(), any(), any(), any()))
			.thenReturn("kc-user-789");

		// When
		String result = syncService.syncMemberToKeycloak(member, null);

		// Then
		assertEquals("kc-user-789", result);
		verify(keycloakAdminService).createUser(
			any(),
			any(),
			any(),
			any(),
			argThat(list -> list.size() == 1 && list.contains("user")));
	}

	@Test
	void shouldPassCorrectUserDetailsToKeycloak()
	{
		// Given
		when(keycloakAdminService.createUser(any(), any(), any(), any(), any()))
			.thenReturn("kc-user-123");

		// When
		syncService.syncMemberToKeycloak(member);

		// Then
		verify(keycloakAdminService).createUser(
			eq("john.doe"), // username from userName field
			eq("john.doe@example.com"), // email
			eq("John"), // firstName
			eq("Doe"), // lastName
			any());
	}

	@Test
	void shouldUseUserNameFieldDirectly()
	{
		// Given
		Member memberWithDifferentUsername = new Member();
		memberWithDifferentUsername.id = 456L;
		memberWithDifferentUsername.setUserName("jane.smith");
		memberWithDifferentUsername.setFirstName("Jane");
		memberWithDifferentUsername.setLastName("Smith");
		memberWithDifferentUsername.setEmail("jane@example.com");

		when(keycloakAdminService.createUser(any(), any(), any(), any(), any()))
			.thenReturn("kc-user-555");

		// When
		syncService.syncMemberToKeycloak(memberWithDifferentUsername);

		// Then - username comes directly from userName field
		verify(keycloakAdminService).createUser(
			eq("jane.smith"), // username from userName field
			eq("jane@example.com"), // email
			eq("Jane"),
			eq("Smith"),
			any());
	}
}
