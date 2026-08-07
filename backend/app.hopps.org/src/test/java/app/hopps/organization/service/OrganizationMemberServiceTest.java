package app.hopps.organization.service;

import app.hopps.member.domain.Member;
import app.hopps.member.domain.MemberStatus;
import app.hopps.member.repository.MemberRepository;
import app.hopps.organization.domain.Organization;
import app.hopps.organization.domain.OrganizationType;
import app.hopps.shared.validation.NonUniqueConstraintViolation;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.validation.ConstraintViolationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@QuarkusTest
class OrganizationMemberServiceTest {

    private static final String KEYCLOAK_ID = "11111111-2222-3333-4444-555555555555";

    @Inject
    OrganizationMemberService organizationMemberService;

    @InjectMock
    CreateUserInKeycloak keycloakService;

    @InjectMock
    PersistMemberDelegate persistenceDelegate;

    @InjectMock
    MemberRepository memberRepository;

    private Organization testOrganization;
    private Member testMember;

    @BeforeEach
    void setUp() {
        testOrganization = new Organization();
        testOrganization.setName("Test Organization");
        testOrganization.setSlug("test-org");
        testOrganization.setType(OrganizationType.EINGETRAGENER_VEREIN);

        testMember = new Member();
        testMember.setEmail("invited@example.com");
        testMember.setFirstName("Invited");
        testMember.setLastName("Person");

        when(memberRepository.findByEmail(anyString())).thenReturn(null);
    }

    /** Stands in for the real invitation, which sets these two fields on the member it is given. */
    private void stubSuccessfulInvite(boolean userCreated) {
        doAnswer(invocation -> {
            Member member = invocation.getArgument(0);
            member.setKeycloakId(KEYCLOAK_ID);
            member.setStatus(MemberStatus.INVITED);
            return userCreated;
        }).when(keycloakService).inviteUser(any(), anyString());
    }

    @Test
    @DisplayName("should provision an account and persist the member")
    void shouldAddMember() {
        stubSuccessfulInvite(true);
        doNothing().when(persistenceDelegate).persistMember(any(), any());

        Member added = organizationMemberService.addMember(testOrganization, testMember);

        assertEquals(MemberStatus.INVITED, added.getStatus());
        assertEquals(KEYCLOAK_ID, added.getKeycloakId());
        verify(persistenceDelegate, times(1)).persistMember(testMember, testOrganization);
        verify(keycloakService, never()).deleteUser(anyString());
    }

    @Test
    @DisplayName("should remove the Keycloak account again when persisting the member fails")
    void shouldRollBackKeycloakUserOnPersistenceFailure() {
        stubSuccessfulInvite(true);
        doThrow(new IllegalStateException("database is down")).when(persistenceDelegate)
                .persistMember(any(), any());

        assertThrows(IllegalStateException.class,
                () -> organizationMemberService.addMember(testOrganization, testMember));

        verify(keycloakService, times(1)).deleteUser(KEYCLOAK_ID);
    }

    @Test
    @DisplayName("should keep a pre-existing Keycloak account when persisting the member fails")
    void shouldNotDeleteLinkedAccountOnPersistenceFailure() {
        // The account belonged to someone before this request — it must survive our failure.
        stubSuccessfulInvite(false);
        doThrow(new IllegalStateException("database is down")).when(persistenceDelegate)
                .persistMember(any(), any());

        assertThrows(IllegalStateException.class,
                () -> organizationMemberService.addMember(testOrganization, testMember));

        verify(keycloakService, never()).deleteUser(anyString());
    }

    @Test
    @DisplayName("should reject a duplicate email before touching Keycloak")
    void shouldRejectDuplicateEmail() {
        when(memberRepository.findByEmail(eq("invited@example.com"))).thenReturn(new Member());

        assertThrows(NonUniqueConstraintViolation.NonUniqueConstraintViolationException.class,
                () -> organizationMemberService.addMember(testOrganization, testMember));

        verify(keycloakService, never()).inviteUser(any(), anyString());
        verify(persistenceDelegate, never()).persistMember(any(), any());
    }

    @Test
    @DisplayName("should reject an invalid member before touching Keycloak")
    void shouldRejectInvalidMember() {
        testMember.setEmail("not-an-email");

        assertThrows(ConstraintViolationException.class,
                () -> organizationMemberService.addMember(testOrganization, testMember));

        verify(keycloakService, never()).inviteUser(any(), anyString());
        verify(persistenceDelegate, never()).persistMember(any(), any());
    }
}
