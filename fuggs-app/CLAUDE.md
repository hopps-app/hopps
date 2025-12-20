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

- `rest/` - Renarde controllers (extend `Controller`, convention-based routing:
  `Classname/method`)
- `model/` - Domain models (currently in-memory, prepared for Panache ORM)
- `util/` - Qute template extensions (`@TemplateExtension`) and startup logic
- `src/main/resources/templates/` - Qute HTML templates (follow
  `Classname/method.html` convention)

**Conventions:**

- Controllers use `@CheckedTemplate` with native method declarations for
  type-safe template binding
- Formatter config is at `../formatter/java.xml` (runs during validate phase)
- Use the repository pattern for data access with Panache, extend
  `PanacheEntity`
- Use the [Carbon Design System](https://carbondesignsystem.com/) for UI
  components and styling.
- Use [@carbon/web-components](https://web-components.carbondesignsystem.com/?path=/docs/introduction-welcome--overview)
as vanilla as possible
- Test everything with the given then when pattern. Mock es little as possible.
  Use `@InjectMock` or the real `@Inject` if possible. 
- Always run the app to see if it compiles
- Use boxes to structure the layout