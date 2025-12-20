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
- **SmallRye Health** - health check endpoints at `/q/health`
- **SmallRye OpenAPI** - API documentation

**Project structure:**

Feature-based package structure following the legacy service pattern:

```
app.hopps.<feature>/
├── api/          - REST resources/controllers (Renarde controllers extend Controller)
├── domain/       - Entity classes (extend PanacheEntity)
├── model/        - DTOs/Input classes
├── repository/   - Data access (implement PanacheRepository)
├── service/      - Business logic
├── client/       - External service clients
└── messaging/    - Message producers/consumers

app.hopps.shared/
├── filter/       - HTTP filters
├── infrastructure/storage/  - Storage handlers
├── security/     - Security utilities
├── util/         - Template extensions, startup logic
└── validation/   - Validation utilities

app.hopps.simplepe/ - Process engine (separate module)
```

Current features:
- `bommel/` - Bommel tree management (api, domain, repository)
- `audit/` - Audit logging (domain, repository)
- `shared/` - Shared utilities (util)
- `simplepe/` - Process engine

Templates: `src/main/resources/templates/<Feature>/<method>.html` (follow Renarde naming convention)

**Conventions:**

- Controllers use `@CheckedTemplate` with native method declarations for
  type-safe template binding
- Formatter config is at `../formatter/java.xml` (runs during validate phase)
- Use the repository pattern for data access with Panache, extend
  `PanacheEntity`. Use `Long` as primary key type.kl
- Test everything with the given then when pattern. Mock es little as possible.
  Use `@InjectMock` or the real `@Inject` if possible.
- Always run the app to see if it compiles

**Tests:**

- Also test the frontend with RESTAssured by calling the html endpoints and
  asserting the document to contain especially the entities.
- Use RESTAssured and Hamcrest
- name the tests like `shouldDoStuff`

**Frontend:**

- Use boxes to structure the layout
- Use the [Carbon Design System](https://carbondesignsystem.com/) for UI
  components and styling.
-
Use [@carbon/web-components](https://web-components.carbondesignsystem.com/?path=/docs/introduction-welcome--overview)
as vanilla as possible