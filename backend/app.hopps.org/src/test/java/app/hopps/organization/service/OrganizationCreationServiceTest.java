package app.hopps.organization.service;

import app.hopps.member.domain.Member;
import app.hopps.organization.domain.Organization;
import app.hopps.shared.validation.NonUniqueConstraintViolation;
import io.quarkus.test.InjectMock;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import jakarta.validation.ConstraintViolationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

@QuarkusTest
class OrganizationCreationServiceTest {

    @Inject
    OrganizationCreationService organizationCreationService;

    @InjectMock
    CreationValidationDelegate validationDelegate;

    @InjectMock
    CreateUserInKeycloak keycloakService;

    @InjectMock
    PersistOrganizationDelegate persistenceDelegate;

    private Organization testOrganization;
    private Member testOwner;
    private static final String TEST_PASSWORD = "testPassword123";

    @BeforeEach
    void setUp() {
        testOrganization = new Organization();
        testOrganization.setName("Test Organization");
        testOrganization.setSlug("test-org");
        testOrganization.setType(Organization.TYPE.EINGETRAGENER_VEREIN);

        testOwner = new Member();
        testOwner.setEmail("test@example.com");
        testOwner.setFirstName("Test");
        testOwner.setLastName("User");
    }

    @Test
    @DisplayName("should create organization successfully when all validations pass")
    void shouldCreateOrganizationSuccessfully() {
        // given
        doNothing().when(validationDelegate).validateWithValidator(any(), any());
        doNothing().when(validationDelegate).validateUniqueness(any(), any());
        doNothing().when(keycloakService).createUserInKeycloak(any(), any());
        doNothing().when(persistenceDelegate).persistOrg(any(), any());

        // when
        organizationCreationService.createOrganization(testOrganization, testOwner, TEST_PASSWORD);

        // then
        verify(validationDelegate, times(1)).validateWithValidator(testOrganization, testOwner);
        verify(validationDelegate, times(1)).validateUniqueness(testOrganization, testOwner);
        verify(keycloakService, times(1)).createUserInKeycloak(testOwner, TEST_PASSWORD);
        verify(persistenceDelegate, times(1)).persistOrg(testOrganization, testOwner);
    }

    @Test
    @DisplayName("should not create keycloak user when constraint validation fails")
    void shouldNotCreateKeycloakUserWhenConstraintValidationFails() {
        // given
        doThrow(new ConstraintViolationException("Validation failed", null))
                .when(validationDelegate)
                .validateWithValidator(any(), any());

        // when/then
        assertThrows(ConstraintViolationException.class,
                () -> organizationCreationService.createOrganization(testOrganization, testOwner, TEST_PASSWORD));

        verify(validationDelegate, times(1)).validateWithValidator(testOrganization, testOwner);
        verify(validationDelegate, never()).validateUniqueness(any(), any());
        verify(keycloakService, never()).createUserInKeycloak(any(), any());
        verify(persistenceDelegate, never()).persistOrg(any(), any());
    }

    @Test
    @DisplayName("should not create keycloak user when uniqueness validation fails")
    void shouldNotCreateKeycloakUserWhenUniquenessValidationFails() {
        // given
        doNothing().when(validationDelegate).validateWithValidator(any(), any());
        doThrow(new NonUniqueConstraintViolation.NonUniqueConstraintViolationException(null))
                .when(validationDelegate)
                .validateUniqueness(any(), any());

        // when/then
        assertThrows(NonUniqueConstraintViolation.NonUniqueConstraintViolationException.class,
                () -> organizationCreationService.createOrganization(testOrganization, testOwner, TEST_PASSWORD));

        verify(validationDelegate, times(1)).validateWithValidator(testOrganization, testOwner);
        verify(validationDelegate, times(1)).validateUniqueness(testOrganization, testOwner);
        verify(keycloakService, never()).createUserInKeycloak(any(), any());
        verify(persistenceDelegate, never()).persistOrg(any(), any());
    }

    @Test
    @DisplayName("should call all delegates in correct order")
    void shouldCallAllDelegatesInCorrectOrder() {
        // given
        doNothing().when(validationDelegate).validateWithValidator(any(), any());
        doNothing().when(validationDelegate).validateUniqueness(any(), any());
        doNothing().when(keycloakService).createUserInKeycloak(any(), any());
        doNothing().when(persistenceDelegate).persistOrg(any(), any());

        // when
        organizationCreationService.createOrganization(testOrganization, testOwner, TEST_PASSWORD);

        // then - verify order using inOrder
        var inOrder = org.mockito.Mockito.inOrder(validationDelegate, keycloakService, persistenceDelegate);
        inOrder.verify(validationDelegate).validateWithValidator(testOrganization, testOwner);
        inOrder.verify(validationDelegate).validateUniqueness(testOrganization, testOwner);
        inOrder.verify(keycloakService).createUserInKeycloak(testOwner, TEST_PASSWORD);
        inOrder.verify(persistenceDelegate).persistOrg(testOrganization, testOwner);
    }
}
