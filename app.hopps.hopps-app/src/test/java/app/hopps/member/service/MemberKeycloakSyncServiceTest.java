package app.hopps.member.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import app.hopps.member.domain.Member;

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
			eq("john.doe@example.com"),
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
			eq("john.doe@example.com"),
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
			eq("john.doe@example.com"), // username
			eq("john.doe@example.com"), // email
			eq("John"), // firstName
			eq("Doe"), // lastName
			any());
	}

	@Test
	void shouldGenerateCorrectUsername()
	{
		// Given
		Member memberWithoutEmail = new Member();
		memberWithoutEmail.id = 456L;
		memberWithoutEmail.setFirstName("Jane");
		memberWithoutEmail.setLastName("Smith");
		memberWithoutEmail.setEmail(null);

		when(keycloakAdminService.createUser(any(), any(), any(), any(), any()))
			.thenReturn("kc-user-555");

		// When
		syncService.syncMemberToKeycloak(memberWithoutEmail);

		// Then - username should be generated from name when email is null
		verify(keycloakAdminService).createUser(
			eq("jane.smith"), // username generated from name
			eq(null), // email is null
			eq("Jane"),
			eq("Smith"),
			any());
	}
}
