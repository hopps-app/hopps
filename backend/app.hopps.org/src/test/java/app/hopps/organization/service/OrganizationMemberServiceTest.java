package app.hopps.organization.service;

import app.hopps.member.domain.Member;
import app.hopps.member.domain.MemberStatus;
import app.hopps.member.domain.Role;
import app.hopps.member.repository.MemberRepository;
import app.hopps.organization.domain.Organization;
import app.hopps.organization.domain.OrganizationType;
import app.hopps.organization.model.MemberUpdateInput;
import app.hopps.shared.validation.NonUniqueConstraintViolation;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.validation.ConstraintViolationException;
import jakarta.ws.rs.BadRequestException;
import jakarta.ws.rs.ClientErrorException;
import jakarta.ws.rs.ForbiddenException;
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
    IdentityProvisioningService identityProvisioningService;

    @InjectMock
    PersistMemberDelegate persistenceDelegate;

    @InjectMock
    MemberRepository memberRepository;

    private Organization testOrganization;
    private Member testMember;
    private Member owner;

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

        owner = new Member();
        owner.setEmail("owner@example.com");
        owner.setFirstName("Owning");
        owner.setLastName("Person");
        owner.addOrganization(testOrganization, Role.OWNER);

        when(memberRepository.findByEmail(anyString())).thenReturn(null);
    }

    /** Stands in for the real invitation, which sets these two fields on the member it is given. */
    private void stubSuccessfulInvite(boolean userCreated) {
        doAnswer(invocation -> {
            Member member = invocation.getArgument(0);
            member.setKeycloakId(KEYCLOAK_ID);
            member.setStatus(MemberStatus.INVITED);
            return userCreated;
        }).when(identityProvisioningService).inviteMember(any(), anyString());
    }

    @Test
    @DisplayName("should provision an account and persist the member")
    void shouldAddMember() {
        stubSuccessfulInvite(true);
        doNothing().when(persistenceDelegate).persistMember(any(), any(), any());

        Member added = organizationMemberService.addMember(testOrganization, testMember, Role.ADMIN, owner);

        assertEquals(MemberStatus.INVITED, added.getStatus());
        assertEquals(KEYCLOAK_ID, added.getKeycloakId());
        verify(persistenceDelegate, times(1)).persistMember(testMember, testOrganization, Role.ADMIN);
        verify(identityProvisioningService, never()).deleteUser(anyString());
    }

    @Test
    @DisplayName("should remove the identity provider account again when persisting the member fails")
    void shouldRollBackKeycloakUserOnPersistenceFailure() {
        stubSuccessfulInvite(true);
        doThrow(new IllegalStateException("database is down")).when(persistenceDelegate)
                .persistMember(any(), any(), any());

        assertThrows(IllegalStateException.class,
                () -> organizationMemberService.addMember(testOrganization, testMember, Role.ADMIN, owner));

        verify(identityProvisioningService, times(1)).deleteUser(KEYCLOAK_ID);
    }

    @Test
    @DisplayName("should keep a pre-existing identity provider account when persisting the member fails")
    void shouldNotDeleteLinkedAccountOnPersistenceFailure() {
        // The account belonged to someone before this request — it must survive our failure.
        stubSuccessfulInvite(false);
        doThrow(new IllegalStateException("database is down")).when(persistenceDelegate)
                .persistMember(any(), any(), any());

        assertThrows(IllegalStateException.class,
                () -> organizationMemberService.addMember(testOrganization, testMember, Role.ADMIN, owner));

        verify(identityProvisioningService, never()).deleteUser(anyString());
    }

    @Test
    @DisplayName("should reject a duplicate email before touching the identity provider")
    void shouldRejectDuplicateEmail() {
        when(memberRepository.findByEmail(eq("invited@example.com"))).thenReturn(new Member());

        assertThrows(NonUniqueConstraintViolation.NonUniqueConstraintViolationException.class,
                () -> organizationMemberService.addMember(testOrganization, testMember, Role.ADMIN, owner));

        verify(identityProvisioningService, never()).inviteMember(any(), anyString());
        verify(persistenceDelegate, never()).persistMember(any(), any(), any());
    }

    @Test
    @DisplayName("should reject an invalid member before touching the identity provider")
    void shouldRejectInvalidMember() {
        testMember.setEmail("not-an-email");

        assertThrows(ConstraintViolationException.class,
                () -> organizationMemberService.addMember(testOrganization, testMember, Role.ADMIN, owner));

        verify(identityProvisioningService, never()).inviteMember(any(), anyString());
        verify(persistenceDelegate, never()).persistMember(any(), any(), any());
    }

    @Test
    @DisplayName("should reject adding a member when the caller may not manage members")
    void shouldRejectAddMemberWithoutPermission() {
        Member nonOwner = new Member();
        nonOwner.setEmail("admin@example.com");
        nonOwner.setFirstName("Regular");
        nonOwner.setLastName("Admin");
        nonOwner.addOrganization(testOrganization, Role.ADMIN);

        assertThrows(ForbiddenException.class,
                () -> organizationMemberService.addMember(testOrganization, testMember, Role.ADMIN, nonOwner));

        verify(identityProvisioningService, never()).inviteMember(any(), anyString());
        verify(persistenceDelegate, never()).persistMember(any(), any(), any());
    }

    @Test
    @DisplayName("should give the invited person the chosen role")
    void shouldPersistTheChosenRole() {
        stubSuccessfulInvite(true);
        doNothing().when(persistenceDelegate).persistMember(any(), any(), any());

        organizationMemberService.addMember(testOrganization, testMember, Role.AUDITOR, owner);

        verify(persistenceDelegate, times(1)).persistMember(testMember, testOrganization, Role.AUDITOR);
    }

    @Test
    @DisplayName("should not hand out the founder role when inviting")
    void shouldRejectInvitingAFounder() {
        assertThrows(BadRequestException.class,
                () -> organizationMemberService.addMember(testOrganization, testMember, Role.OWNER, owner));

        verify(identityProvisioningService, never()).inviteMember(any(), anyString());
    }

    @Test
    @DisplayName("should change the role of a member")
    void shouldChangeRole() {
        Member treasurer = memberWithId(2L, Role.ADMIN);
        when(memberRepository.findById(2L)).thenReturn(treasurer);

        organizationMemberService.changeRole(testOrganization, 2L, Role.BOARD, owner);

        assertEquals(Role.BOARD, treasurer.getRole(testOrganization).orElseThrow());
    }

    @Test
    @DisplayName("should not hand out the founder role when changing a role")
    void shouldRejectChangingToFounder() {
        Member treasurer = memberWithId(2L, Role.ADMIN);
        when(memberRepository.findById(2L)).thenReturn(treasurer);

        assertThrows(BadRequestException.class,
                () -> organizationMemberService.changeRole(testOrganization, 2L, Role.OWNER, owner));

        assertEquals(Role.ADMIN, treasurer.getRole(testOrganization).orElseThrow());
    }

    @Test
    @DisplayName("should not let anyone change their own role")
    void shouldRejectChangingOwnRole() {
        owner.id = 1L;
        when(memberRepository.findById(1L)).thenReturn(owner);

        ClientErrorException self = assertThrows(ClientErrorException.class,
                () -> organizationMemberService.changeRole(testOrganization, 1L, Role.BOARD, owner));
        assertEquals(409, self.getResponse().getStatus());
    }

    @Test
    @DisplayName("should reject changing a role when the caller may not manage members")
    void shouldRejectChangeRoleWithoutPermission() {
        Member treasurer = memberWithId(2L, Role.ADMIN);
        when(memberRepository.findById(3L)).thenReturn(memberWithId(3L, Role.ADMIN));

        assertThrows(ForbiddenException.class,
                () -> organizationMemberService.changeRole(testOrganization, 3L, Role.BOARD, treasurer));
    }

    @Test
    @DisplayName("should correct the name of a member")
    void shouldCorrectName() {
        Member invited = memberWithId(2L, Role.ADMIN);
        invited.setStatus(MemberStatus.ACTIVE);
        when(memberRepository.findById(2L)).thenReturn(invited);
        when(persistenceDelegate.updateMember(any())).thenAnswer(invocation -> invocation.getArgument(0));

        Member updated = organizationMemberService.updateMember(testOrganization, 2L,
                new MemberUpdateInput(" Kim ", "Rakete", null), owner);

        assertEquals("Kim", updated.getFirstName());
        assertEquals("Rakete", updated.getLastName());
        assertEquals("member2@example.com", updated.getEmail());
        verify(identityProvisioningService, never()).inviteMember(any(), anyString());
    }

    @Test
    @DisplayName("should move a pending invitation to a corrected email and drop the unused account")
    void shouldMoveInvitationToCorrectedEmail() {
        Member invited = memberWithId(2L, Role.ADMIN);
        invited.setStatus(MemberStatus.INVITATION_FAILED);
        invited.setKeycloakId("old-account");
        when(memberRepository.findById(2L)).thenReturn(invited);
        when(persistenceDelegate.updateMember(any())).thenAnswer(invocation -> invocation.getArgument(0));
        stubSuccessfulInvite(true);

        Member updated = organizationMemberService.updateMember(testOrganization, 2L,
                new MemberUpdateInput(null, null, "right@example.com"), owner);

        assertEquals("right@example.com", updated.getEmail());
        assertEquals(KEYCLOAK_ID, updated.getKeycloakId());
        assertEquals(MemberStatus.INVITED, updated.getStatus());
        verify(identityProvisioningService, times(1)).deleteUnusedUser("old-account");
    }

    @Test
    @DisplayName("should keep the email of a member who has logged in")
    void shouldKeepEmailOfActiveMember() {
        Member active = memberWithId(2L, Role.ADMIN);
        active.setStatus(MemberStatus.ACTIVE);
        when(memberRepository.findById(2L)).thenReturn(active);

        ClientErrorException conflict = assertThrows(ClientErrorException.class,
                () -> organizationMemberService.updateMember(testOrganization, 2L,
                        new MemberUpdateInput(null, null, "other@example.com"), owner));

        assertEquals(409, conflict.getResponse().getStatus());
        verify(identityProvisioningService, never()).inviteMember(any(), anyString());
    }

    @Test
    @DisplayName("should reject an email that belongs to another member")
    void shouldRejectEmailOfAnotherMember() {
        Member invited = memberWithId(2L, Role.ADMIN);
        invited.setStatus(MemberStatus.INVITED);
        when(memberRepository.findById(2L)).thenReturn(invited);
        when(memberRepository.findByEmail(eq("taken@example.com"))).thenReturn(new Member());

        assertThrows(NonUniqueConstraintViolation.NonUniqueConstraintViolationException.class,
                () -> organizationMemberService.updateMember(testOrganization, 2L,
                        new MemberUpdateInput(null, null, "taken@example.com"), owner));

        verify(identityProvisioningService, never()).inviteMember(any(), anyString());
    }

    private Member memberWithId(long id, Role role) {
        Member member = new Member();
        member.id = id;
        member.setEmail("member" + id + "@example.com");
        member.setFirstName("Member");
        member.setLastName(String.valueOf(id));
        member.addOrganization(testOrganization, role);
        return member;
    }
}
