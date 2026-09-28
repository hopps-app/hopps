package app.hopps.organization.service.authentik;

import app.hopps.member.domain.Member;
import app.hopps.member.domain.MemberStatus;
import jakarta.ws.rs.ClientErrorException;
import jakarta.ws.rs.WebApplicationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AuthentikIdentityProvisioningServiceTest {

    private static final String EMAIL = "founder@example.org";
    private static final String PASSWORD = "testPassword";
    private static final AuthentikUser ACCOUNT = new AuthentikUser(42L, "uuid-42", EMAIL, "Fiona Founder", EMAIL, true);

    AuthentikApi api;
    AuthentikIdentityProvisioningService service;
    Member founder;

    @BeforeEach
    void setUp() {
        api = mock(AuthentikApi.class);
        service = new AuthentikIdentityProvisioningService();
        service.api = api;
        service.recoveryEmailStageId = Optional.empty();
        service.invitationLifespanSeconds = 3600;

        founder = new Member();
        founder.setFirstName("Fiona");
        founder.setLastName("Founder");
        founder.setEmail(EMAIL);
    }

    @Test
    void createOwnerCreatesTheAccountWithTheChosenPassword() {
        when(api.findUsersByEmail(EMAIL)).thenReturn(new AuthentikList<>(List.of()));
        when(api.createUser(any())).thenReturn(ACCOUNT);

        service.createOwner(founder, PASSWORD);

        verify(api).setPassword(42L, new AuthentikPasswordRequest(PASSWORD));
        assertEquals("uuid-42", founder.getKeycloakId());
        // They picked a password during registration, so they can log in right away.
        assertEquals(MemberStatus.ACTIVE, founder.getStatus());
    }

    @Test
    void createOwnerLeavesAnExistingAccountAlone() {
        when(api.findUsersByEmail(EMAIL)).thenReturn(new AuthentikList<>(List.of(ACCOUNT)));

        ClientErrorException e = assertThrows(ClientErrorException.class, () -> service.createOwner(founder, PASSWORD));

        assertEquals(409, e.getResponse().getStatus());
        verify(api, never()).createUser(any());
        verify(api, never()).setPassword(anyLong(), any());
        assertNull(founder.getKeycloakId());
    }

    @Test
    void createOwnerRemovesTheAccountWhenThePasswordIsRejected() {
        when(api.findUsersByEmail(EMAIL)).thenReturn(new AuthentikList<>(List.of()));
        when(api.createUser(any())).thenReturn(ACCOUNT);
        when(api.findUsersByUuid("uuid-42")).thenReturn(new AuthentikList<>(List.of(ACCOUNT)));
        doThrow(new WebApplicationException(400)).when(api).setPassword(anyLong(), any());

        assertThrows(WebApplicationException.class, () -> service.createOwner(founder, PASSWORD));

        verify(api).deleteUser(42L);
        assertNull(founder.getKeycloakId());
    }

    @Test
    void createOwnerRefusesAnEmptyPassword() {
        assertThrows(IllegalArgumentException.class, () -> service.createOwner(founder, ""));

        verify(api, never()).createUser(any());
    }
}
