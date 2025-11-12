# 8. Cross-cutting Concepts

This chapter describes concepts, patterns, and solutions that apply across multiple parts of the Hopps platform.

---

## Security

### Authentication and Authorization

**OAuth2/OIDC with Keycloak:**

```yaml
# Backend configuration
quarkus:
  oidc:
    auth-server-url: ${KEYCLOAK_URL}/realms/hopps
    client-id: hopps-backend
    credentials:
      secret: ${KEYCLOAK_CLIENT_SECRET}
    tls:
      verification: none  # Only for development!
```

**JWT Token Validation:**
```java
@ApplicationScoped
public class SecurityUtils {
    public Organization getUserOrganization(SecurityContext ctx) {
        String email = ctx.getUserPrincipal().getName();  // From JWT
        Member member = memberRepository.findByEmail(email);
        return member.getOrganizations().stream().findFirst()
            .orElseThrow(() -> new WebApplicationException(404));
    }
}
```

**Multi-Tenant Isolation:**
- Every request extracts user organization from JWT
- All database queries filtered by organization_id
- Prevents cross-organization data access

**Role-Based Access Control:**
```java
@Path("/organizations/{id}")
@RolesAllowed("admin")  // Only admins can access
public Response update(@PathParam("id") Long id, OrganizationInput input) {
    // Implementation
}
```

---

### Data Protection

**GDPR Compliance:**
- **Consent Management:** Explicit opt-in for data processing
- **Right to Erasure:** User deletion endpoint with cascade
- **Data Portability:** Export user data in JSON format
- **Privacy by Design:** Minimal data collection

**Encryption:**
- **In Transit:** TLS 1.3 for all HTTPS communication
- **At Rest:** Database encryption (AWS RDS encryption), S3 server-side encryption (SSE-S3)
- **Secrets:** Kubernetes Secrets (base64 encoded), Sealed Secrets for GitOps

**Sensitive Data Handling:**
```java
// Never log sensitive data
LOG.info("User {} created organization {}",
    sanitize(email),  // Mask email
    organizationId
);

// Use @JsonIgnore for sensitive fields
@Entity
public class Member {
    @JsonIgnore  // Never serialize to API
    private String internalNotes;
}
```

---

## Persistence

### JPA and Hibernate

**Panache Pattern:**
```java
@Entity
public class Organization extends PanacheEntity {
    // No need to define id field (inherited)
    private String name;

    // Active Record pattern
    public static Organization findBySlug(String slug) {
        return find("slug", slug).firstResult();
    }
}
```

**Repository Pattern:**
```java
@ApplicationScoped
public class OrganizationRepository implements PanacheRepository<Organization> {
    public List<Organization> findByMember(Member member) {
        return find("SELECT o FROM Organization o JOIN o.members m WHERE m = ?1", member).list();
    }
}
```

---

### Database Schema Migrations

**Flyway Convention:**
```
src/main/resources/db/migration/
├── V1__create_organization.sql
├── V2__add_member_table.sql
├── V3__add_bommel_table.sql
└── V4__add_category_table.sql
```

**Migration Example:**
```sql
-- V1__create_organization.sql
CREATE TABLE organization (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    street VARCHAR(255),
    city VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(2) DEFAULT 'DE',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_organization_slug ON organization(slug);
```

**Best Practices:**
- Forward-only migrations (no rollback)
- Test migrations on copy of production data
- Version control all migration scripts
- Use transactions for data migrations

---

### Connection Pooling

**HikariCP Configuration:**
```yaml
quarkus:
  datasource:
    jdbc:
      max-size: 16           # Maximum pool size
      min-size: 2            # Minimum idle connections
      acquisition-timeout: 30s
    username: ${DB_USER}
    password: ${DB_PASSWORD}
```

**Pool Sizing Formula:**
```
connections = ((core_count * 2) + effective_spindle_count)
For 4-core CPU: (4 * 2) + 1 = 9 connections minimum
```

---

## API Design

### RESTful Principles

**Resource-Based URLs:**
```
GET    /organizations           # List organizations
POST   /organizations           # Create organization
GET    /organizations/{id}      # Get specific organization
PUT    /organizations/{id}      # Update organization
DELETE /organizations/{id}      # Delete organization

# Nested resources
GET    /organizations/{id}/members
```

**HTTP Status Codes:**
- `200 OK` - Successful GET/PUT
- `201 Created` - Successful POST
- `204 No Content` - Successful DELETE
- `400 Bad Request` - Validation error
- `401 Unauthorized` - Missing/invalid token
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource doesn't exist
- `500 Internal Server Error` - Server error

---

### OpenAPI Documentation

**Annotations:**
```java
@Path("/organizations")
@Tag(name = "Organizations", description = "Organization management endpoints")
public class OrganizationResource {

    @POST
    @Operation(summary = "Create new organization")
    @APIResponse(responseCode = "201", description = "Organization created")
    @APIResponse(responseCode = "400", description = "Invalid input")
    public Response create(@Valid NewOrganizationInput input) {
        // Implementation
    }
}
```

**Swagger UI:**
- Available at `/q/swagger-ui`
- Interactive API testing
- Request/response examples
- Schema documentation

---

### Versioning Strategy

**URL Versioning (Future):**
```
/api/v1/organizations
/api/v2/organizations
```

**Current:** No versioning yet (pre-v1.0)

**Backwards Compatibility:**
- Add new fields (don't remove)
- Deprecate before removing
- Version breaking changes

---

## Validation

### Jakarta Bean Validation

**Input Validation:**
```java
public record OrganizationInput(
    @NotBlank(message = "Name is required")
    @Size(min = 3, max = 255, message = "Name must be 3-255 characters")
    String name,

    @NotBlank(message = "Slug is required")
    @Pattern(regexp = "^[a-z0-9-]+$", message = "Slug must be lowercase alphanumeric with hyphens")
    String slug,

    @Valid  // Cascade validation
    Address address
) {}
```

**Custom Validators:**
```java
@Constraint(validatedBy = UniqueSlugValidator.class)
@Retention(RUNTIME)
@Target(FIELD)
public @interface UniqueSlug {
    String message() default "Slug already exists";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}

public class UniqueSlugValidator implements ConstraintValidator<UniqueSlug, String> {
    @Inject
    OrganizationRepository repository;

    @Override
    public boolean isValid(String slug, ConstraintValidatorContext context) {
        return !repository.slugExists(slug);
    }
}
```

---

### Business Validation

**BPMN Validation Delegate:**
```java
@ApplicationScoped
@Named("CreationValidationDelegate")
public class CreationValidationDelegate implements WorkItemHandler {
    @Inject
    Validator validator;

    @Override
    public void executeWorkItem(WorkItem workItem, WorkItemManager manager) {
        NewOrganizationInput input = (NewOrganizationInput) workItem.getParameter("input");

        // Jakarta Bean Validation
        Set<ConstraintViolation<NewOrganizationInput>> violations = validator.validate(input);
        if (!violations.isEmpty()) {
            throw new ConstraintViolationException(violations);
        }

        // Custom business rules
        if (repository.slugExists(input.getSlug())) {
            throw new NonUniqueConstraintViolation("slug", input.getSlug());
        }

        manager.completeWorkItem(workItem.getId(), Map.of("valid", true));
    }
}
```

---

## Error Handling

### Exception Hierarchy

```
WebApplicationException (JAX-RS)
├── NotFoundException (404)
├── ForbiddenException (403)
├── BadRequestException (400)
└── InternalServerErrorException (500)

Custom Exceptions:
├── NonUniqueConstraintViolation (400)
├── BommelCycleException (400)
└── DocumentAnalysisException (500)
```

---

### Error Response Format

```json
{
  "error": "ValidationError",
  "message": "Input validation failed",
  "details": [
    {
      "field": "name",
      "message": "Name is required"
    },
    {
      "field": "slug",
      "message": "Slug must be lowercase alphanumeric"
    }
  ],
  "timestamp": "2024-11-12T10:30:00Z",
  "path": "/organizations"
}
```

**Exception Mapper:**
```java
@Provider
public class ValidationExceptionMapper implements ExceptionMapper<ConstraintViolationException> {

    @Override
    public Response toResponse(ConstraintViolationException exception) {
        List<ValidationError> errors = exception.getConstraintViolations().stream()
            .map(cv -> new ValidationError(
                cv.getPropertyPath().toString(),
                cv.getMessage()
            ))
            .collect(Collectors.toList());

        ErrorResponse response = new ErrorResponse(
            "ValidationError",
            "Input validation failed",
            errors,
            Instant.now(),
            uriInfo.getPath()
        );

        return Response.status(400).entity(response).build();
    }
}
```

---

## Logging

### Structured Logging

**Log Format:**
```json
{
  "timestamp": "2024-11-12T10:30:00.123Z",
  "level": "INFO",
  "logger": "app.hopps.organization.api.OrganizationResource",
  "message": "Organization created successfully",
  "thread": "executor-thread-1",
  "context": {
    "organizationId": 123,
    "userId": "user-456",
    "requestId": "abc-123-def",
    "duration_ms": 250
  }
}
```

**Configuration:**
```yaml
quarkus:
  log:
    level: INFO
    category:
      "app.hopps": DEBUG
      "org.hibernate": WARN
    console:
      format: "%d{yyyy-MM-dd HH:mm:ss,SSS} %-5p [%c{3.}] (%t) %s%e%n"
      json: true  # Enable JSON logging
```

---

### Logging Best Practices

```java
@Path("/organizations")
public class OrganizationResource {
    private static final Logger LOG = Logger.getLogger(OrganizationResource.class);

    @POST
    public Response create(@Valid NewOrganizationInput input) {
        LOG.infof("Creating organization: slug=%s", input.getSlug());

        try {
            Organization org = service.create(input);
            LOG.infof("Organization created: id=%d, slug=%s", org.id, org.getSlug());
            return Response.status(201).entity(org).build();
        } catch (Exception e) {
            LOG.errorf(e, "Failed to create organization: slug=%s", input.getSlug());
            throw e;
        }
    }
}
```

**Do's:**
- Use parameterized logging (`LOG.infof()`)
- Include request ID for traceability
- Log business events (org created, document uploaded)
- Log errors with full stack traces

**Don'ts:**
- Don't log sensitive data (passwords, tokens, PII)
- Don't log in tight loops (use counters/metrics instead)
- Don't use `System.out.println()` (use logger)

---

## Monitoring

### Health Checks

**Liveness Probe:**
```java
@Liveness
@ApplicationScoped
public class DatabaseLivenessCheck implements HealthCheck {
    @Inject
    DataSource dataSource;

    @Override
    public HealthCheckResponse call() {
        try (Connection conn = dataSource.getConnection()) {
            return HealthCheckResponse.up("database");
        } catch (SQLException e) {
            return HealthCheckResponse.down("database");
        }
    }
}
```

**Readiness Probe:**
```java
@Readiness
@ApplicationScoped
public class KeycloakReadinessCheck implements HealthCheck {
    @Inject
    @RestClient
    KeycloakClient keycloak;

    @Override
    public HealthCheckResponse call() {
        try {
            keycloak.healthCheck();
            return HealthCheckResponse.up("keycloak");
        } catch (Exception e) {
            return HealthCheckResponse.down("keycloak");
        }
    }
}
```

---

### Metrics

**Prometheus Metrics:**
```java
@Path("/organizations")
public class OrganizationResource {

    @Inject
    @Metric(name = "organizations_created_total")
    Counter organizationsCreated;

    @Inject
    @Metric(name = "organization_creation_duration_seconds")
    Timer creationTimer;

    @POST
    public Response create(@Valid NewOrganizationInput input) {
        return creationTimer.time(() -> {
            Organization org = service.create(input);
            organizationsCreated.inc();
            return Response.status(201).entity(org).build();
        });
    }
}
```

**Custom Metrics:**
- `hopps_organizations_total` - Total organizations
- `hopps_documents_uploaded_total` - Total documents uploaded
- `hopps_transactions_total` - Total transactions
- `hopps_active_users` - Active users (gauge)

---

## Configuration Management

### Quarkus Configuration

**application.yaml:**
```yaml
# Default configuration (all environments)
quarkus:
  application:
    name: hopps-main
    version: 1.0.0

  http:
    port: 8080
    cors:
      ~: true
      origins: ${CORS_ORIGINS:http://localhost:3000}

  datasource:
    db-kind: postgresql
    jdbc:
      url: ${DATABASE_URL:jdbc:postgresql://localhost:5432/hopps}
      max-size: ${DATABASE_POOL_SIZE:16}
    username: ${DATABASE_USER:hopps}
    password: ${DATABASE_PASSWORD:hopps}
```

**application-prod.yaml:**
```yaml
# Production overrides
quarkus:
  log:
    level: INFO
  datasource:
    jdbc:
      max-size: 32
```

---

### Environment Variables

**Precedence:**
1. Environment variables (highest)
2. application-{profile}.yaml
3. application.yaml (lowest)

**Example:**
```bash
# Development
export DATABASE_URL=jdbc:postgresql://localhost:5432/hopps
export KEYCLOAK_URL=http://localhost:8180

# Production
export DATABASE_URL=jdbc:postgresql://prod-db:5432/hopps
export KEYCLOAK_URL=https://auth.hopps.app
```

---

## Testing Strategy

### Unit Tests

**JUnit 5 + Mockito:**
```java
@QuarkusTest
class OrganizationServiceTest {

    @InjectMock
    OrganizationRepository repository;

    @Inject
    OrganizationService service;

    @Test
    void shouldCreateOrganization() {
        // Given
        OrganizationInput input = new OrganizationInput("Test Org", "test-org");
        Organization expected = new Organization();
        expected.id = 1L;

        when(repository.persist(any(Organization.class))).thenAnswer(inv -> {
            Organization org = inv.getArgument(0);
            org.id = 1L;
            return org;
        });

        // When
        Organization result = service.create(input);

        // Then
        assertNotNull(result.id);
        assertEquals("Test Org", result.getName());
        verify(repository).persist(any(Organization.class));
    }
}
```

---

### Integration Tests

**Quarkus Test with TestContainers:**
```java
@QuarkusTest
@QuarkusTestResource(PostgresTestResource.class)
class OrganizationResourceTest {

    @Test
    @TestSecurity(user = "test@example.com", roles = "user")
    void shouldCreateOrganization() {
        given()
            .contentType(ContentType.JSON)
            .body("""
                {
                  "name": "Test Org",
                  "slug": "test-org"
                }
                """)
        .when()
            .post("/organizations")
        .then()
            .statusCode(201)
            .body("id", notNullValue())
            .body("name", equalTo("Test Org"))
            .body("slug", equalTo("test-org"));
    }
}
```

---

### Contract Tests (Pact)

**Consumer Test (Frontend):**
```typescript
describe('Organization API', () => {
  it('should create organization', async () => {
    await provider.addInteraction({
      state: 'user is authenticated',
      uponReceiving: 'a request to create organization',
      withRequest: {
        method: 'POST',
        path: '/organizations',
        body: { name: 'Test Org', slug: 'test-org' }
      },
      willRespondWith: {
        status: 201,
        body: { id: 1, name: 'Test Org', slug: 'test-org' }
      }
    });

    const result = await organizationApi.create({ name: 'Test Org', slug: 'test-org' });
    expect(result.id).toBe(1);
  });
});
```

**Provider Verification (Backend):**
```java
@Provider("hopps-backend")
@PactFolder("pacts")
public class OrganizationPactTest {
    @TestTemplate
    @ExtendWith(PactVerificationInvocationContextProvider.class)
    void pactVerificationTestTemplate(PactVerificationContext context) {
        context.verifyInteraction();
    }
}
```

---

## Internationalization (Future)

**i18n Support:**
```java
@Inject
Messages messages;

public String getMessage(String key, Locale locale) {
    return messages.getMessage(key, locale);
}
```

**Resource Bundles:**
```
src/main/resources/
├── messages_de.properties
├── messages_en.properties
└── messages_fr.properties
```

---

## Caching

**Quarkus Cache:**
```java
@ApplicationScoped
public class CategoryService {

    @CacheResult(cacheName = "categories")
    public List<Category> getByOrganization(Long organizationId) {
        return categoryRepository.find("organization.id", organizationId).list();
    }

    @CacheInvalidate(cacheName = "categories")
    public void create(CategoryInput input, Organization org) {
        Category category = new Category();
        category.setOrganization(org);
        categoryRepository.persist(category);
    }
}
```

**Configuration:**
```yaml
quarkus:
  cache:
    caffeine:
      categories:
        maximum-size: 1000
        expire-after-write: 5M
```

---

## Summary

Hopps platform cross-cutting concepts ensure:

1. **Security:** OAuth2/OIDC, multi-tenant isolation, GDPR compliance
2. **Persistence:** JPA/Panache, Flyway migrations, connection pooling
3. **API Design:** RESTful principles, OpenAPI documentation, versioning
4. **Validation:** Jakarta Bean Validation, custom validators, business rules
5. **Error Handling:** Consistent error responses, exception mappers
6. **Logging:** Structured JSON logs, request tracing, no sensitive data
7. **Monitoring:** Health checks, Prometheus metrics, Grafana dashboards
8. **Configuration:** Environment-based, externalized, 12-factor app
9. **Testing:** Unit, integration, contract tests with high coverage
10. **Caching:** Strategic caching for performance

---

**Document Version:** 1.0
**Last Updated:** 2025-11-12
**Status:** Active
