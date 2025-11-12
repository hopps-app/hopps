# 2. Architecture Constraints

This chapter documents the constraints that influenced the design and architecture of the Hopps platform. These constraints come from technical requirements, organizational decisions, and regulatory requirements.

---

## Technical Constraints

### TC-1: Java 21 as Primary Backend Language

**Constraint:** All backend services must be implemented in Java 21 (LTS version).

**Rationale:**
- Modern language features (records, pattern matching, virtual threads)
- Long-term support until September 2029
- Excellent ecosystem for enterprise applications
- Strong typing and compile-time safety
- Native compilation support via GraalVM

**Impact:**
- Developers must be proficient in Java
- Dependencies must be Java 21 compatible
- Enables use of Quarkus native compilation
- Access to modern JVM performance improvements

---

### TC-2: Quarkus 3.19.2 Framework

**Constraint:** Backend services built on Quarkus 3.19.2 framework.

**Rationale:**
- Supersonic subatomic Java (fast startup < 3 seconds)
- Low memory footprint (< 100MB heap)
- Container-first design for Kubernetes
- Native compilation with GraalVM
- Excellent developer experience with live reload
- Strong CDI (Contexts and Dependency Injection) support

**Impact:**
- Limited to Quarkus-compatible libraries
- Must follow Quarkus conventions (CDI, config, etc.)
- Benefits from unified build tooling (Maven/Gradle)
- Excellent cloud-native characteristics

**Technologies Enabled:**
```xml
<quarkus.platform.version>3.19.2</quarkus.platform.version>
```

---

### TC-3: PostgreSQL Database

**Constraint:** PostgreSQL as the primary relational database.

**Rationale:**
- Open-source with strong community support
- ACID compliance for financial data
- Excellent JSON support for flexible data
- Mature ecosystem (Flyway, connection pooling)
- High performance for complex queries
- Advanced features (CTEs, window functions) for hierarchical data (Bommel tree)

**Impact:**
- SQL-based data modeling
- Flyway for schema migrations
- Hibernate ORM with Panache for data access
- PostgreSQL-specific features available (e.g., recursive CTEs for tree queries)

**Configuration:**
```yaml
quarkus:
  datasource:
    db-kind: postgresql
    jdbc:
      url: jdbc:postgresql://localhost:5432/hopps
```

---

### TC-4: Keycloak for Authentication

**Constraint:** Keycloak as the identity and access management system. No custom authentication implementation allowed.

**Rationale:**
- Industry-standard OAuth2/OIDC implementation
- Built-in user management and federation
- Support for social logins (if needed)
- Multi-factor authentication support
- Admin REST API for user provisioning
- Custom theme support

**Impact:**
- All users managed in Keycloak
- JWT tokens for API authentication
- Quarkus integration via `quarkus-keycloak-authorization`
- Custom user creation logic via Keycloak Admin Client
- Organization owners created during org setup workflow

**Dependencies:**
```xml
<dependency>
    <groupId>io.quarkus</groupId>
    <artifactId>quarkus-keycloak-authorization</artifactId>
</dependency>
<dependency>
    <groupId>io.quarkus</groupId>
    <artifactId>quarkus-keycloak-admin-rest-client</artifactId>
</dependency>
```

---

### TC-5: React for Frontend Development

**Constraint:** Frontend applications built with React framework.

**Rationale:**
- Large ecosystem and community
- Component-based architecture
- Virtual DOM for performance
- React Native for mobile apps (code sharing)
- TypeScript support for type safety
- Mature tooling (Vite, Create React App)

**Impact:**
- Frontend developers need React expertise
- State management decisions (Context API, Redux, etc.)
- Component library selection (Material-UI, Ant Design, etc.)
- Build tooling configuration
- Code sharing between web and mobile

**Stack:**
- **SPA:** React with TypeScript
- **Mobile:** React Native with TypeScript
- **API Client:** TypeScript-generated from OpenAPI specs

---

### TC-6: AWS S3 for Document Storage

**Constraint:** All uploaded documents stored in AWS S3 or S3-compatible storage.

**Rationale:**
- Scalable object storage
- High durability (99.999999999%)
- Cost-effective for large files
- Presigned URLs for secure access
- Lifecycle policies for archival
- S3-compatible alternatives (MinIO) for local dev

**Impact:**
- S3Handler utility for upload/download
- Presigned URL generation for frontend
- Environment-specific bucket configuration
- MinIO for local development
- Document metadata stored in PostgreSQL, files in S3

**Implementation:**
```java
@ApplicationScoped
public class S3Handler {
    @Inject
    S3Client s3;

    public String uploadDocument(String key, InputStream data) {
        s3.putObject(request, RequestBody.fromInputStream(data, length));
        return getPresignedUrl(key);
    }
}
```

---

### TC-7: Kogito for BPMN Process Orchestration

**Constraint:** Business processes defined in BPMN 2.0 and executed via Kogito.

**Rationale:**
- Visual process modeling
- Industry-standard BPMN 2.0 notation
- Quarkus integration (kogito-quarkus)
- Process versioning and migration
- Audit trail for process execution
- Service task integration with Java delegates

**Impact:**
- BPMN diagrams in `src/main/resources/bpmn/`
- Java delegates for service tasks
- Process variables for state management
- Process instance tracking in database
- Kogito management endpoints

**Example Process:**
- **NewOrganization.bpmn:** Organization creation workflow with validation, Keycloak user creation, and persistence steps

**Dependencies:**
```xml
<dependency>
    <groupId>org.jbpm</groupId>
    <artifactId>jbpm-quarkus</artifactId>
</dependency>
```

---

### TC-8: Kafka for Asynchronous Messaging

**Constraint:** Apache Kafka for event-driven communication between services.

**Rationale:**
- High-throughput event streaming
- Durable message storage
- Scalable message broker
- Event sourcing capabilities
- Integration with Quarkus Reactive Messaging

**Impact:**
- DocumentProducer publishes document events
- Decoupled service communication
- Event-driven architecture patterns
- Kafka cluster management in infrastructure
- Consumer group management

**Configuration:**
```yaml
mp:
  messaging:
    outgoing:
      documents:
        connector: smallrye-kafka
        topic: documents
        value:
          serializer: org.apache.kafka.common.serialization.StringSerializer
```

---

### TC-9: Docker and Kubernetes for Deployment

**Constraint:** All services packaged as Docker containers and deployed via Kubernetes.

**Rationale:**
- Container portability
- Kubernetes orchestration (scaling, self-healing)
- Helm charts for configuration management
- Docker Compose for local development
- CI/CD integration

**Impact:**
- Dockerfile for each service
- Helm charts in `infrastructure/hopps-app/`
- Kubernetes manifests (deployments, services, ingress)
- Resource limits and requests configuration
- Health check endpoints required

**Example Dockerfile:**
```dockerfile
FROM quay.io/quarkus/quarkus-micro-image:2.0
COPY target/quarkus-app/ /deployments/
EXPOSE 8080
CMD ["java", "-jar", "/deployments/quarkus-run.jar"]
```

---

### TC-10: OpenAPI/Swagger for API Documentation

**Constraint:** All REST APIs documented via OpenAPI 3.0 specifications.

**Rationale:**
- Auto-generated documentation
- API contract definition
- Client code generation (TypeScript)
- Interactive API testing (Swagger UI)
- Contract-first development

**Impact:**
- Quarkus SmallRye OpenAPI extension
- Annotations on REST resources
- API versioning strategy
- `/q/swagger-ui` endpoint for testing
- OpenAPI JSON/YAML export

**Configuration:**
```yaml
quarkus:
  smallrye-openapi:
    path: /openapi
    info-title: Hopps Organization API
    info-version: 1.0.0
```

---

## Organizational Constraints

### OC-1: Small Development Team

**Constraint:** Limited team size (implied by architecture choices).

**Rationale:**
- Vertical Slice Architecture reduces cognitive load
- Microservices enable team autonomy
- Clear boundaries reduce coordination overhead

**Impact:**
- Focus on maintainability and simplicity
- Comprehensive documentation required
- Automation of testing and deployment
- Self-service capabilities prioritized

---

### OC-2: Vertical Slice Architecture Adoption

**Constraint:** Backend organized by business capabilities, not technical layers.

**Rationale:**
- High cohesion within features
- Low coupling between features
- Easier to understand and navigate
- Supports team autonomy
- Feature-based development

**Impact:**
- Package structure: `app.hopps.{slice}/{api,domain,repository,service}`
- Each slice contains all layers for a feature
- Shared infrastructure in `shared/` package
- Clear dependency rules (slices → shared, minimal slice → slice)

**Structure:**
```
app.hopps/
├── shared/           # Cross-cutting concerns
├── organization/     # Organization management slice
├── member/          # Member management slice
├── bommel/          # Budget tree slice
├── category/        # Category slice
├── document/        # Document processing slice
└── transaction/     # Transaction recording slice
```

**Reference:** See [backend-vertical-slice-implementation-summary.md](../backend-vertical-slice-implementation-summary.md)

---

### OC-3: Open-Source First Philosophy

**Constraint:** Prefer open-source technologies over proprietary solutions.

**Rationale:**
- Cost-effective
- Community support
- Avoid vendor lock-in
- Transparency and security
- Extensibility

**Impact:**
- Quarkus, PostgreSQL, Keycloak, Kafka all open-source
- MIT/Apache 2.0 licensed where possible
- Community contributions welcome
- Public GitHub repository (if applicable)

---

### OC-4: Agile Development Process

**Constraint:** Iterative development with frequent releases.

**Rationale:**
- Fast feedback loops
- Incremental value delivery
- Risk mitigation through small batches
- Adapt to changing requirements

**Impact:**
- Feature flags for incomplete features
- CI/CD pipeline for automated deployment
- Semantic versioning (1.0.1-SNAPSHOT)
- Rolling updates in Kubernetes

---

## Convention Constraints

### CC-1: Java Coding Standards

**Constraint:** Adhere to standard Java coding conventions.

**Standards:**
- Google Java Style Guide (with modifications)
- Checkstyle or SpotBugs for linting
- Formatter configuration in `backend/formatter/`
- Naming conventions:
  - Classes: PascalCase
  - Methods/Variables: camelCase
  - Constants: UPPER_SNAKE_CASE
  - Packages: lowercase

**Example:**
```java
@ApplicationScoped
public class OrganizationService {
    private static final Logger LOG = Logger.getLogger(OrganizationService.class);

    public Organization createOrganization(CreateOrganizationRequest request) {
        // Implementation
    }
}
```

---

### CC-2: REST API Conventions

**Constraint:** RESTful API design following best practices.

**Conventions:**
- Resource-based URLs: `/organizations`, `/bommels`
- HTTP verbs: GET (read), POST (create), PUT (update), DELETE (delete)
- HTTP status codes: 200 (OK), 201 (Created), 400 (Bad Request), 404 (Not Found)
- JSON request/response bodies
- Pagination for list endpoints
- Filter/sort query parameters

**Example:**
```
GET    /organizations/{id}
POST   /organizations
PUT    /organizations/{id}
DELETE /organizations/{id}
GET    /organizations/{orgId}/members
```

---

### CC-3: Database Migration Strategy

**Constraint:** All schema changes via Flyway migrations.

**Conventions:**
- Migration files: `V{version}__{description}.sql`
- Location: `src/main/resources/db/migration/`
- Incremental migrations only
- No rollback scripts (forward-only)
- Test migrations in dev environment first

**Example:**
```sql
-- V1__create_organization_table.sql
CREATE TABLE organization (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

---

### CC-4: Testing Standards

**Constraint:** Comprehensive test coverage with multiple test levels.

**Standards:**
- **Unit Tests:** JUnit 5, Mockito
- **Integration Tests:** Quarkus Test, RestAssured
- **Contract Tests:** Pact for API contracts
- **Test Coverage:** Target > 80% with JaCoCo
- **Test Naming:** `should{ExpectedBehavior}_when{Condition}`

**Dependencies:**
```xml
<dependency>
    <groupId>io.quarkus</groupId>
    <artifactId>quarkus-junit5</artifactId>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>io.quarkiverse.pact</groupId>
    <artifactId>quarkus-pact-consumer</artifactId>
    <scope>test</scope>
</dependency>
```

---

### CC-5: Git Workflow

**Constraint:** Git-based version control with branch strategy.

**Workflow:**
- **Main Branch:** `main` - production-ready code
- **Feature Branches:** `feat/{feature-name}`
- **Bugfix Branches:** `fix/{bug-description}`
- **Commit Messages:** Conventional Commits format
- **Pull Requests:** Required for all changes, code review mandatory

**Example Commit:**
```
feat(organization): add organization creation BPMN workflow

- Implement NewOrganization.bpmn process
- Add PersistOrganizationDelegate
- Integrate Keycloak user creation

Closes #123
```

---

## Regulatory and Legal Constraints

### RC-1: GDPR Compliance

**Constraint:** Full compliance with EU General Data Protection Regulation.

**Requirements:**
- Data minimization: collect only necessary data
- Right to erasure: ability to delete user data
- Data portability: export user data in standard format
- Consent management: explicit opt-in for data processing
- Audit logging: track all data access and modifications

**Impact:**
- User consent tracking in database
- Data export REST endpoints
- Anonymization strategy for deleted users
- Privacy policy and terms of service
- Data retention policies

---

### RC-2: German Association Law (Vereinsrecht)

**Constraint:** Support legal requirements for German associations (e.V.).

**Requirements:**
- Board member roles (Vorstand)
- General assembly (Mitgliederversammlung) tracking
- Financial transparency requirements
- Membership records

**Impact:**
- Role-based access control with specific roles
- Document retention for financial records
- Audit trail for financial transactions
- Support for annual financial reports

---

### RC-3: Financial Record Retention

**Constraint:** Retain financial documents and transaction records per legal requirements.

**Requirements:**
- 10-year retention for financial records (German tax law)
- Immutable audit trail
- Document archival strategy
- Backup and disaster recovery

**Impact:**
- S3 lifecycle policies for archival
- Database backup strategy
- Document deletion restrictions
- Audit log retention

---

## Hardware and Infrastructure Constraints

### HC-1: Cloud-Native Deployment

**Constraint:** Designed for cloud deployment (AWS, Azure, Google Cloud, or on-premise Kubernetes).

**Requirements:**
- Horizontal scalability
- Stateless services (except databases)
- External configuration management
- Health check endpoints
- Graceful shutdown

**Impact:**
- Kubernetes manifests
- ConfigMaps and Secrets for configuration
- Liveness and readiness probes
- 12-factor app principles

---

### HC-2: Resource Limits

**Constraint:** Services must operate within defined resource limits.

**Limits:**
- **Memory:** < 512MB per service instance (JVM heap)
- **CPU:** 1 vCPU per instance under normal load
- **Startup Time:** < 3 seconds (Quarkus requirement)
- **Response Time:** < 200ms for 95% of requests

**Impact:**
- Memory-efficient code
- Connection pool tuning
- Lazy loading strategies
- Query optimization
- Caching where appropriate

---

## Development Environment Constraints

### DC-1: Local Development with Docker Compose

**Constraint:** Developers must be able to run entire stack locally.

**Requirements:**
- Docker Compose for local services
- PostgreSQL, Keycloak, Kafka, MinIO (S3)
- Hot reload for rapid development
- Unified environment configuration

**Configuration:**
```yaml
# docker-compose.yaml
services:
  postgres:
    image: postgres:15
  keycloak:
    image: quay.io/keycloak/keycloak:latest
  minio:
    image: minio/minio
  kafka:
    image: confluentinc/cp-kafka:latest
```

**Location:** `/infrastructure/hopps-app/docker-compose.yaml`

---

### DC-2: IDE Support

**Constraint:** Support for IntelliJ IDEA and Visual Studio Code.

**Requirements:**
- Maven/Gradle project structure
- EditorConfig for consistent formatting
- Debug configuration
- Quarkus dev mode support

**Tools:**
- IntelliJ IDEA Ultimate (Quarkus plugin)
- VS Code with Quarkus extensions
- Maven wrapper (./mvnw) for consistent builds

---

## Third-Party Service Constraints

### TS-1: Document AI Analysis Service

**Constraint:** External AI service for document analysis (app.hopps.az-document-ai).

**Impact:**
- REST client configuration
- Timeout and retry logic
- Error handling for service unavailability
- Asynchronous processing patterns

**Client:**
```java
@RegisterRestClient(configKey = "document-analyze")
public interface DocumentAnalyzeClient {
    @POST
    @Path("/analyze")
    DocumentAnalysisResult analyze(MultipartFormDataOutput document);
}
```

---

### TS-2: Financial Narrator Service

**Constraint:** AI service for financial narrative tagging (fin-narrator).

**Impact:**
- Semantic tagging of transactions
- ML model versioning
- Fallback strategies if service unavailable

---

### TS-3: ZugFerd Invoice Processing

**Constraint:** External service for ZugFerd invoice parsing (app.hopps.zugferd).

**Impact:**
- Support for ZugFerd XML format embedded in PDFs
- Structured invoice data extraction
- Version compatibility (ZugFerd 1.0, 2.0)

---

## Summary of Constraint Impact

| Constraint Category | Count | Impact Level |
|---------------------|-------|--------------|
| Technical Constraints | 10 | High |
| Organizational Constraints | 4 | Medium |
| Convention Constraints | 5 | Medium |
| Regulatory Constraints | 3 | High |
| Hardware Constraints | 2 | Medium |
| Development Constraints | 2 | Low |
| Third-Party Constraints | 3 | Medium |

**Total Constraints:** 29

These constraints significantly shape the architecture and implementation of the Hopps platform, ensuring consistency, quality, and compliance throughout the system.

---

**Document Version:** 1.0
**Last Updated:** 2025-11-12
**Status:** Active
