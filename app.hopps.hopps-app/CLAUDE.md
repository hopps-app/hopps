# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Build Commands

```bash
# Run in dev mode with live reload
./mvnw quarkus:dev

# Run tests
./mvnw test

# Run a single test class
./mvnw test -Dtest=TestClassName

# Package the application
./mvnw package

# Validate code formatting
./mvnw formatter:validate

# Format code
./mvnw formatter:format
```

## Architecture

This is a Quarkus web application using the Renarde framework for server-side
rendering.

**Key frameworks:**

- **Quarkus 3.30.x** with Java 21
- **Renarde** - server-side web framework built on Qute templating, RESTEasy
  Reactive
- **Hibernate ORM Panache** - simplified ORM with repository pattern
- **Amazon S3** - file storage via quarkus-amazon-s3 (LocalStack in dev/test)
- **SmallRye Health** - health check endpoints at `/q/health`
- **SmallRye OpenAPI** - API documentation

**Project structure:**

Feature-based package structure:

```
app.hopps.<feature>/
├── api/          - Renarde controllers (extend Controller)
├── domain/       - Entity classes (extend PanacheEntity)
├── model/        - DTOs/Input classes
├── repository/   - Data access (implement PanacheRepository)
├── service/      - Business logic (e.g., StorageService)
└── messaging/    - Message producers/consumers

app.hopps.shared/
├── filter/       - HTTP filters
├── infrastructure/storage/  - Storage handlers
├── security/     - Security utilities
├── util/         - Template extensions (JavaExtensions.java)
└── validation/   - Validation utilities
```

Current features:

- `bommel/` - Bommel tree management (api, domain, repository)
- `member/` - Member management (api, domain, repository)
- `document/` - Document/receipt management with S3 file storage
- `audit/` - Audit logging (domain, repository)
- `shared/` - Shared utilities
- `simplepe/` - Process engine

Templates: `src/main/resources/templates/<ControllerName>/<method>.html`

## Renarde & Qute Conventions

**Controllers:**

- Extend `Controller` class from Renarde
- Use `@CheckedTemplate` with native method declarations for type-safe templates
- Method names become URL paths: `save()` -> `/resource/save`
- Use `redirect(Resource.class).method()` for redirects
- Use `flash("key", "message")` for flash messages

**Qute CheckedTemplate limitations:**

- NO direct Java method calls like `ZoneId.systemDefault()` in templates
- NO safe navigation operator `?.` (e.g., `object?.field`)
- Solution: Add helper methods to entities for template access:

```java
// In entity class
public String getFormattedDate() {
    return date != null ? date.format(formatter) : "";
}

public String getSenderName() {
    return sender != null ? sender.getName() : "";
}
```

**Logging:**

- Use `org.slf4j.Logger` for logging
- Create logger: `private static final Logger LOG = LoggerFactory.getLogger(MyClass.class);`
- Add reasonable logging for important operations, errors, and debugging
- Log levels: `error` for failures, `warn` for issues, `info` for operations, `debug` for details

**Form handling:**

- Forms require `{#authenticityToken /}` for CSRF protection
- Use `@RestForm` annotation for form parameters
- Multipart forms: `enctype="multipart/form-data"` with `FileUpload` parameter
- Validation: `@NotNull`, `validationFailed()` check

## S3 File Storage

Configuration in `application.properties`:

```properties
bucket.name=hopps-documents
quarkus.s3.path-style-access=true
quarkus.s3.devservices.buckets=${bucket.name}
```

Dev services automatically start LocalStack for S3 in dev/test mode.

Use `StorageService` for file operations:

```java
@Inject StorageService storageService;

storageService.uploadFile(key, filePath, contentType);
storageService.downloadFile(key);
storageService.deleteFile(key);
```

## Testing

**Patterns:**

- Use `@QuarkusTest` annotation
- Name tests like `shouldDoSomething()`
- Use RESTAssured for HTTP tests
- Use Hamcrest matchers (`containsString`, `is`, `equalTo`)
- Helper methods with `@Transactional(TxType.REQUIRES_NEW)` for test data

**Example test structure:**

```java
@QuarkusTest
class ResourceTest {
    @Inject
    Repository repository;

    @Test
    void shouldShowEntityInList() {
        deleteAllData();
        createEntity("Test");

        given()
            .when()
            .get("/resource")
            .then()
            .statusCode(200)
            .body(containsString("Test"));
    }

    @Transactional(TxType.REQUIRES_NEW)
    void deleteAllData() {
        repository.deleteAll();
    }
}
```

**Testing forms with CSRF:**

Form POST endpoints require CSRF tokens. For testing:

- Test GET endpoints and verify form elements are present
- Test service layer directly for business logic
- Download endpoints work without CSRF

## Frontend

- Use boxes (`<div class="box">`) to structure layout
- Use [Carbon Design System](https://carbondesignsystem.com/) for UI
- Use [@carbon/web-components](https://web-components.carbondesignsystem.com/)
- Common components: `cds-inline-notification`, tables, buttons
- Custom CSS follows Carbon design tokens (e.g., `--cds-spacing-05`)

## Common Gotchas

1. **Formatter runs on validate phase** - Run `./mvnw formatter:format` before
   committing
2. **CheckedTemplate expressions** - No Java calls or `?.` operator in templates
3. **CSRF tokens** - All POST forms need `{#authenticityToken /}`
4. **.gitignore patterns** - Use `/tags` not `tags` to avoid ignoring
   `templates/tags/`
5. **S3 dependency** - Requires `url-connection-client` for HTTP transport
