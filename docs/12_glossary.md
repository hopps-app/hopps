---
layout: default
title: "12. Glossary"
description: "Domain terms, technical terms, and acronyms"
---
# 12. Glossary

This chapter defines important domain terms, technical terms, and acronyms used in the Hopps platform.

---

## Domain Terms

### Association / Verein
**Definition:** Non-profit organization in Germany, typically registered as "eingetragener Verein" (e.V.)

**Context:** Hopps is designed to manage German associations (Vereine) with features specific to this legal structure.

**Example:** "Example Sports Club e.V.", "Cultural Association Munich e.V."

---

### Bommel
**Definition:** A hierarchical budget structure node in Hopps. Represents a budget category or subcategory in a tree structure.

**Etymology:** German colloquial term, literally "pompom" or "tassel"

**Context:** Organizations create Bommel trees to organize their budgets hierarchically:
```
Root Bommel (Total Budget)
├── Administration
│   ├── Salaries
│   └── Office Supplies
└── Projects
    ├── Event A
    └── Event B
```

**Relationships:**
- Each Bommel belongs to one Organization
- Each Bommel has one owner (Member)
- Bommel can have parent and children (tree structure)

**Technical Details:**
- Stored in `bommel` table
- Self-referential relationship (parent_id)
- Recursive queries using CTEs

---

### e.V. (eingetragener Verein)
**Definition:** "Registered association" in German law. Legal structure for non-profit organizations.

**Context:** Target user base for Hopps platform

**Requirements:**
- At least 7 members
- Non-profit purpose
- Democratic structure
- Board (Vorstand)

---

### Member
**Definition:** Individual person who belongs to an Organization in Hopps

**Context:** Members are users with specific roles and permissions within organizations

**Relationships:**
- Member belongs to Organization(s)
- Member owns Bommels
- Member is linked to Keycloak user

**Roles:**
- Owner: Creator of organization, full admin
- Admin: Administrative privileges
- Member: Regular user
- Viewer: Read-only access (future)

---

### Organization
**Definition:** Top-level entity in Hopps representing a Verein or association

**Context:** Multi-tenant isolation is at organization level. Each organization has:
- Members
- Bommels (budget tree)
- Categories
- Documents
- Transactions

**Key Properties:**
- `name`: Display name (e.g., "Sports Club Berlin")
- `slug`: URL-friendly identifier (e.g., "sports-club-berlin")
- `address`: Physical address

---

### Slug
**Definition:** URL-friendly unique identifier for organizations

**Format:** Lowercase alphanumeric with hyphens only (`^[a-z0-9-]+$`)

**Examples:**
- "berlin-sports-club"
- "kulturverein-muenchen"
- "music-school-123"

**Purpose:**
- Human-readable URLs (`/organizations/berlin-sports-club`)
- Uniqueness constraint
- Stable identifier (doesn't change)

---

### Trade Party
**Definition:** External entity involved in a financial transaction (vendor, supplier, customer)

**Context:** Embedded in TransactionRecord, stores vendor/supplier information

**Properties:**
- Name
- Tax ID
- Address

---

### ZugFerd
**Definition:** German standard for electronic invoicing ("Zentraler User Guide des Forums elektronische Rechnung Deutschland")

**Format:** PDF with embedded XML invoice data

**Context:** Hopps can parse ZugFerd invoices automatically to extract:
- Invoice number
- Date
- Amount
- Line items
- Vendor information

**Versions:** ZugFerd 1.0, 2.0 (compatible with European EN 16931 standard)

---

## Technical Terms

### Arc42
**Definition:** Template for documenting software architecture

**Context:** This documentation follows arc42 structure (12 chapters)

**Website:** https://arc42.org

---

### BPMN (Business Process Model and Notation)
**Definition:** Graphical notation for business process workflows

**Context:** Hopps uses Kogito BPMN engine to orchestrate processes like organization creation

**Example Process:** `NewOrganization.bpmn`
- Validate input
- Create Keycloak user
- Persist organization
- Send welcome email

---

### CDI (Contexts and Dependency Injection)
**Definition:** Jakarta EE specification for dependency injection

**Context:** Quarkus uses CDI for bean management

**Example:**
```java
@ApplicationScoped
public class OrganizationService {
    @Inject
    OrganizationRepository repository;
}
```

---

### CTE (Common Table Expression)
**Definition:** SQL feature for recursive queries

**Context:** Used for Bommel tree queries (get ancestors, descendants)

**Example:**
```sql
WITH RECURSIVE parents AS (
    SELECT id, parent_id, name FROM bommel WHERE id = ?
    UNION ALL
    SELECT b.id, b.parent_id, b.name FROM bommel b
    INNER JOIN parents p ON b.id = p.parent_id
)
SELECT * FROM parents;
```

---

### Delegate (BPMN)
**Definition:** Java class that implements WorkItemHandler to execute BPMN service task

**Context:** Each step in BPMN process calls a delegate

**Example:**
```java
@ApplicationScoped
@Named("PersistOrganizationDelegate")
public class PersistOrganizationDelegate implements WorkItemHandler {
    // Implementation
}
```

---

### Flyway
**Definition:** Database migration tool

**Context:** Manages PostgreSQL schema changes in version-controlled SQL scripts

**Convention:** `V{version}__{description}.sql`

---

### GraalVM
**Definition:** High-performance JVM that supports native compilation

**Context:** Quarkus can compile to native executable using GraalVM for:
- Faster startup (< 0.1s)
- Lower memory usage
- Instant scale-to-zero

---

### JPA (Jakarta Persistence API)
**Definition:** Java specification for ORM (Object-Relational Mapping)

**Context:** Hibernate implements JPA, Panache provides Active Record pattern on top

**Example:**
```java
@Entity
public class Organization extends PanacheEntity {
    private String name;
    // ...
}
```

---

### JWT (JSON Web Token)
**Definition:** Compact token format for securely transmitting information between parties

**Context:** Keycloak issues JWT access tokens, backend validates them

**Structure:**
```
Header.Payload.Signature
eyJhbGci...  .eyJzdWI...  .SflKxwRJ...
```

**Claims:**
- `sub`: Subject (user ID)
- `email`: User email
- `exp`: Expiration time
- `iat`: Issued at time

---

### Kogito
**Definition:** Cloud-native business automation platform for Quarkus

**Context:** Provides BPMN execution engine in Quarkus

**Features:**
- BPMN 2.0 process execution
- Process management REST endpoints
- Process instance persistence
- Integration with CDI

---

### OIDC (OpenID Connect)
**Definition:** Authentication layer on top of OAuth2

**Context:** Keycloak provides OIDC authentication, Quarkus validates OIDC tokens

**Flow:** Authorization Code Flow with PKCE

---

### Panache
**Definition:** Quarkus extension simplifying Hibernate ORM

**Patterns:**
- **Active Record:** Entity extends PanacheEntity
- **Repository:** Repository implements PanacheRepository<Entity>

**Benefits:**
- Less boilerplate
- Static finder methods
- Automatic ID field
- Query shortcuts

---

### Presigned URL
**Definition:** Time-limited URL for secure S3 access without AWS credentials

**Context:** Frontend uploads documents directly to S3 using presigned URL

**Expiry:** 15 minutes

**Example:**
```
https://s3.eu-central-1.amazonaws.com/hopps-documents/
  org123/doc456.pdf
  ?X-Amz-Algorithm=AWS4-HMAC-SHA256
  &X-Amz-Credential=...
  &X-Amz-Date=20241112T103000Z
  &X-Amz-Expires=900
  &X-Amz-Signature=...
```

---

### Vertical Slice Architecture
**Definition:** Architectural pattern organizing code by business capability instead of technical layer

**Context:** Hopps backend organized into 6 vertical slices:
- organization/
- member/
- bommel/
- category/
- document/
- transaction/

**Benefits:**
- High cohesion (related code together)
- Low coupling (slices independent)
- Easy navigation
- Team ownership

**Reference:** [backend-vertical-slice-implementation-summary.md](../backend-vertical-slice-implementation-summary.md)

---

## Acronyms

### ADR
**Full Name:** Architecture Decision Record

**Definition:** Document describing significant architecture decision, alternatives, and rationale

**Reference:** See [Chapter 9: Architecture Decisions](09_architecture_decisions.md)

---

### API
**Full Name:** Application Programming Interface

**Context:** REST APIs for frontend-backend communication

---

### AWS
**Full Name:** Amazon Web Services

**Services Used:**
- S3 (object storage)
- RDS (PostgreSQL database)
- MSK (Kafka - optional)

---

### CDN
**Full Name:** Content Delivery Network

**Context:** Future consideration for serving SPA assets

---

### CI/CD
**Full Name:** Continuous Integration / Continuous Deployment

**Tools:** GitHub Actions, Maven, Docker

---

### CORS
**Full Name:** Cross-Origin Resource Sharing

**Context:** Configured to allow SPA (localhost:3000, app.hopps.app) to call API

---

### CRUD
**Full Name:** Create, Read, Update, Delete

**Context:** Basic operations for all resources (organizations, members, etc.)

---

### DTO
**Full Name:** Data Transfer Object

**Context:** Java records used for API requests/responses

**Example:** `OrganizationInput`, `CreateOrganizationResponse`

---

### GDPR
**Full Name:** General Data Protection Regulation

**Context:** EU regulation requiring:
- Data minimization
- Right to erasure
- Data portability
- Consent management

---

### HA
**Full Name:** High Availability

**Context:** Multiple replicas of services for redundancy

---

### HTTPS
**Full Name:** Hypertext Transfer Protocol Secure

**Context:** All API communication encrypted with TLS

---

### IdP
**Full Name:** Identity Provider

**Context:** Keycloak is the IdP for Hopps

---

### JAX-RS
**Full Name:** Jakarta RESTful Web Services

**Context:** Java specification for REST APIs, implemented by Quarkus REST

---

### JDBC
**Full Name:** Java Database Connectivity

**Context:** Standard API for database access

---

### JSON
**Full Name:** JavaScript Object Notation

**Context:** Data format for API requests/responses

---

### K8s
**Full Name:** Kubernetes (8 letters between K and s)

**Context:** Container orchestration platform for production deployment

---

### ML
**Full Name:** Machine Learning

**Context:** Document AI uses ML models for text extraction

---

### MFA
**Full Name:** Multi-Factor Authentication

**Context:** Keycloak supports MFA (not required yet)

---

### MVP
**Full Name:** Minimum Viable Product

**Context:** Current phase of Hopps development

---

### NLP
**Full Name:** Natural Language Processing

**Context:** Fin-Narrator uses NLP for semantic tagging

---

### OAuth2
**Full Name:** Open Authorization 2.0

**Context:** Framework for authorization, used by Keycloak/OIDC

---

### OCR
**Full Name:** Optical Character Recognition

**Context:** Document AI extracts text from scanned documents

---

### ORM
**Full Name:** Object-Relational Mapping

**Context:** Hibernate/JPA maps Java objects to database tables

---

### OWASP
**Full Name:** Open Web Application Security Project

**Context:** OWASP Top 10 vulnerabilities addressed in security design

---

### PII
**Full Name:** Personally Identifiable Information

**Context:** User email, name - must be handled securely (GDPR)

---

### RBAC
**Full Name:** Role-Based Access Control

**Context:** Users assigned roles (admin, user) with different permissions

---

### REST
**Full Name:** Representational State Transfer

**Context:** Architectural style for APIs

**Principles:**
- Resource-based URLs
- HTTP verbs (GET, POST, PUT, DELETE)
- Stateless
- JSON representation

---

### RTO
**Full Name:** Recovery Time Objective

**Context:** Target time to recover from disaster (1 hour for Hopps)

---

### RPO
**Full Name:** Recovery Point Objective

**Context:** Maximum acceptable data loss (5 minutes for Hopps)

---

### SPA
**Full Name:** Single Page Application

**Context:** React web frontend for Hopps

---

### SQL
**Full Name:** Structured Query Language

**Context:** PostgreSQL query language

---

### TLS
**Full Name:** Transport Layer Security

**Context:** Encryption for HTTPS communication (TLS 1.3)

---

### UUID
**Full Name:** Universally Unique Identifier

**Context:** Keycloak uses UUIDs for user IDs

---

### WAL
**Full Name:** Write-Ahead Log

**Context:** PostgreSQL transaction log used for point-in-time recovery

---

### YAML
**Full Name:** YAML Ain't Markup Language

**Context:** Configuration format for Kubernetes, application.yaml

---

## References

### Internal Documentation
- [Introduction](01_introduction.md)
- [Architecture Constraints](02_architecture_constraints.md)
- [System Context](03_context.md)
- [Solution Strategy](04_solution_strategy.md)
- [Building Blocks](05_building_blocks.md)
- [Runtime View](06_runtime_view.md)
- [Deployment View](07_deployment_view.md)
- [Cross-cutting Concepts](08_crosscutting_concepts.md)
- [Architecture Decisions](09_architecture_decisions.md)
- [Quality Requirements](10_quality_scenarios.md)
- [Technical Risks](11_technical_risks.md)

### External Resources
- **Quarkus:** https://quarkus.io
- **Keycloak:** https://www.keycloak.org
- **Kogito:** https://kogito.kie.org
- **Arc42:** https://arc42.org
- **Vertical Slice Architecture:** https://jimmybogard.com/vertical-slice-architecture/

---

**Document Version:** 1.0
**Last Updated:** 2025-11-12
**Status:** Active
