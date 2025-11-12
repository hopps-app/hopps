---
layout: default
title: "09. Architecture Decisions"
description: "ADRs documenting significant architectural decisions"
---
# 9. Architecture Decisions

This chapter documents significant architecture decisions (ADRs) using the ADR format.

---

## ADR-001: Adopt Vertical Slice Architecture

**Status:** ✅ Accepted (Implemented 2025-11-12)

**Context:**
The original backend structure used layered architecture with separate `org` and `fin` modules, leading to:
- Confusion about where to place features
- Low cohesion (related code scattered across layers)
- High coupling (changes affected multiple layers)
- Difficult navigation for developers

**Decision:**
Reorganize backend into vertical slices by business capability:
- `organization/` - Complete organization management
- `member/` - Member operations
- `bommel/` - Budget tree management
- `category/` - Category management
- `document/` - Document processing
- `transaction/` - Transaction recording
- `shared/` - Cross-cutting infrastructure

Each slice contains all layers: `api/`, `domain/`, `repository/`, `service/`, `model/`

**Consequences:**
✅ High cohesion - all organization code in `organization/`
✅ Easy navigation - find everything for a feature in one place
✅ Team autonomy - teams can own entire slices
✅ Easier testing - test complete slices in isolation
✅ Better scalability - add new features as new slices
❌ Some code duplication (mitigated by `shared/`)
❌ Cross-slice dependencies require careful management

**Implementation:**
See [backend-vertical-slice-implementation-summary.md](../backend-vertical-slice-implementation-summary.md) for complete migration details.

---

## ADR-002: Choose Quarkus Over Spring Boot

**Status:** ✅ Accepted

**Context:**
Need to select Java framework for backend microservices. Options:
- **Spring Boot** - Industry standard, mature ecosystem
- **Quarkus** - Cloud-native, fast startup, low memory
- **Micronaut** - Similar to Quarkus, smaller ecosystem

**Decision:**
Use Quarkus 3.19.2 for all backend services.

**Rationale:**
- **Startup Time:** < 3 seconds (Spring Boot: 15-30s)
- **Memory:** < 100MB heap (Spring Boot: 200-300MB)
- **Container-First:** Designed for Kubernetes
- **Native Compilation:** GraalVM support for even better performance
- **Standards-Based:** Jakarta EE, MicroProfile (portable)
- **Developer Experience:** Live reload, unified config
- **Cloud-Native:** Built for containers from day one

**Consequences:**
✅ Fast startup enables rapid development and testing
✅ Low memory reduces infrastructure costs
✅ Excellent Kubernetes characteristics
✅ Strong Red Hat/IBM backing
✅ Growing ecosystem and community
❌ Smaller ecosystem than Spring Boot
❌ Some libraries not yet compatible
❌ Team learning curve (but familiar to Jakarta EE devs)

**Trade-offs:**
- Chose performance over ecosystem maturity
- Acceptable given cloud-native requirements

---

## ADR-003: Use Keycloak for Authentication

**Status:** ✅ Accepted

**Context:**
Need identity and access management. Options:
- **Custom Implementation** - Full control but high effort
- **Auth0** - SaaS, easy but costly
- **Keycloak** - Open-source, feature-rich
- **AWS Cognito** - Cloud-native but vendor lock-in

**Decision:**
Use Keycloak as identity provider with OAuth2/OIDC.

**Rationale:**
- **Open Source:** No licensing costs
- **Feature Complete:** User management, MFA, social login, admin API
- **Standards-Based:** OAuth2, OIDC, SAML
- **Customizable:** Themes, authentication flows
- **Self-Hosted:** Full control, no SaaS costs
- **Quarkus Integration:** Excellent support via quarkus-keycloak-authorization

**Consequences:**
✅ No custom authentication code to maintain
✅ Production-ready security (OAuth2/OIDC)
✅ Admin API for programmatic user creation
✅ Flexible authentication flows
✅ No per-user costs (vs Auth0)
❌ Need to host and maintain Keycloak
❌ Complex configuration initially
❌ High memory usage (need dedicated resources)

**Implementation:**
- Organization creation workflow creates Keycloak user
- JWT tokens for API authentication
- Quarkus validates tokens using JWKS

---

## ADR-004: Microservices Decomposition

**Status:** ✅ Accepted

**Context:**
Decide service boundaries. Options:
- **Monolith** - Single deployable, simpler but less scalable
- **Microservices** - Multiple services, complex but scalable
- **Modular Monolith** - Middle ground

**Decision:**
Decompose into focused microservices:
- **app.hopps.org** - Main business logic
- **app.hopps.az-document-ai** - AI document analysis
- **app.hopps.fin-narrator** - Financial semantic tagging
- **app.hopps.zugferd** - ZugFerd invoice parsing
- **app.hopps.mailservice** - Email notifications

**Rationale:**
- **Independent Scaling:** Scale AI service separately from main service
- **Technology Diversity:** Use different ML frameworks if needed
- **Team Autonomy:** Different teams own different services
- **Failure Isolation:** AI service failure doesn't affect core features
- **Deployment Independence:** Deploy services separately

**Consequences:**
✅ Independent scaling of services
✅ Technology flexibility (different frameworks per service)
✅ Failure isolation
✅ Team autonomy
❌ Increased operational complexity
❌ Network latency between services
❌ Distributed transactions complexity
❌ More infrastructure to manage

**Trade-offs:**
- Vertical scaling within main service (6 slices)
- Horizontal scaling across services
- Acceptable complexity given benefits

---

## ADR-005: BPMN for Business Process Orchestration

**Status:** ✅ Accepted

**Context:**
Need to orchestrate complex multi-step workflows (organization creation). Options:
- **Hardcoded Logic** - Simple but inflexible
- **Saga Pattern** - Good for distributed transactions
- **State Machine** - Good for simple workflows
- **BPMN Engine** - Visual modeling, flexible

**Decision:**
Use Kogito BPMN engine for business process orchestration.

**Rationale:**
- **Visual Modeling:** Non-developers can understand process
- **Industry Standard:** BPMN 2.0 notation
- **Quarkus Integration:** kogito-quarkus extension
- **Audit Trail:** Complete history of process execution
- **Flexibility:** Easy to modify business rules
- **Service Tasks:** Call Java delegates for steps
- **Error Handling:** Built-in error boundary events

**Consequences:**
✅ Business logic visible in BPMN diagram
✅ Easy to add/modify steps
✅ Process versioning and migration
✅ Built-in error handling and retry
✅ Audit trail for compliance
❌ Learning curve for BPMN
❌ Additional runtime dependency
❌ Process state stored in database

**Use Cases:**
- Organization creation workflow
- Document submission workflow
- Member invitation workflow (future)

---

## ADR-006: React for Frontend

**Status:** ✅ Accepted

**Context:**
Choose frontend framework. Options:
- **React** - Large ecosystem, mature
- **Vue.js** - Simpler, smaller ecosystem
- **Angular** - Full framework, opinionated
- **Svelte** - Compiler-based, fast

**Decision:**
Use React for web (SPA) and React Native for mobile.

**Rationale:**
- **Code Sharing:** Share business logic between web and mobile
- **Ecosystem:** Largest ecosystem of components and libraries
- **Talent Pool:** Most developers know React
- **TypeScript:** Excellent TypeScript support
- **React Native:** Native mobile apps with React
- **Tooling:** Excellent developer experience
- **Community:** Massive community and resources

**Consequences:**
✅ Code reuse between web and mobile
✅ Large talent pool
✅ Rich ecosystem (routing, state, UI components)
✅ TypeScript support for type safety
✅ React Native for mobile
❌ Need to choose state management (Context, Redux, Zustand)
❌ Many ways to do things (decision fatigue)
❌ Fast-paced ecosystem (frequent updates)

---

## ADR-007: AWS S3 for Document Storage

**Status:** ✅ Accepted

**Context:**
Store uploaded documents. Options:
- **Database** - Simple but not scalable
- **File System** - Cheap but not durable
- **S3** - Scalable, durable, cloud-native

**Decision:**
Use AWS S3 (or S3-compatible MinIO for dev) for document storage.

**Rationale:**
- **Scalability:** Unlimited storage capacity
- **Durability:** 99.999999999% (11 9's)
- **Cost-Effective:** Pay per GB
- **Presigned URLs:** Secure direct upload from frontend
- **Lifecycle Policies:** Automatic archival (S3-IA, Glacier)
- **S3-Compatible:** MinIO for local development

**Consequences:**
✅ No storage limits
✅ High durability and availability
✅ Direct upload from frontend (no backend bottleneck)
✅ Cost-effective for large files
✅ Lifecycle management
❌ Vendor dependency (mitigated by S3-compatible alternatives)
❌ Network latency for downloads
❌ Additional AWS costs

**Implementation:**
- S3Handler utility class
- Presigned URLs (15-minute expiry)
- Document metadata in PostgreSQL, files in S3
- MinIO for local development

---

## ADR-008: Kafka for Event-Driven Architecture

**Status:** ✅ Accepted

**Context:**
Enable asynchronous communication between services. Options:
- **HTTP Webhooks** - Simple but not reliable
- **RabbitMQ** - Message queue, good for work distribution
- **Kafka** - Event streaming, durable log
- **AWS SQS** - Managed queue, vendor-specific

**Decision:**
Use Apache Kafka for event-driven communication.

**Rationale:**
- **Event Streaming:** Durable event log
- **High Throughput:** Handle millions of events/second
- **Scalability:** Horizontal scaling
- **Multiple Consumers:** Many services can consume same events
- **Replay:** Can replay events for debugging
- **Quarkus Integration:** Reactive Messaging with Kafka

**Consequences:**
✅ Decoupled services
✅ Event sourcing capabilities
✅ High throughput
✅ Event history for debugging
✅ Easy to add new consumers
❌ Operational complexity (Zookeeper/KRaft)
❌ Need to manage topics and partitions
❌ Eventually consistent

**Use Cases:**
- Document uploaded events → Mail service sends notification
- Organization created → Analytics service records event
- Transaction created → Audit service logs event

---

## ADR-009: PostgreSQL as Single Database

**Status:** ✅ Accepted

**Context:**
Choose database technology. Options:
- **MongoDB** - Document DB, flexible schema
- **PostgreSQL** - Relational, ACID, mature
- **MySQL** - Relational, popular
- **Separate DBs per service** - True microservices

**Decision:**
Use PostgreSQL as single database for all services (currently).

**Rationale:**
- **ACID Compliance:** Essential for financial data
- **Mature:** 30+ years of development
- **Advanced Features:** Recursive CTEs (for Bommel tree), JSONB, full-text search
- **Reliable:** Battle-tested at scale
- **Open Source:** No licensing costs
- **Quarkus Support:** Excellent Hibernate/Panache integration

**Consequences:**
✅ ACID transactions guarantee data integrity
✅ Advanced SQL features (recursive CTEs)
✅ Single database simplifies operations
✅ Foreign key constraints
❌ Shared database couples services
❌ Schema migrations affect all services
❌ Potential bottleneck at scale

**Future Evolution:**
- Migrate to separate databases per service when scaling requires it
- Current shared database acceptable for MVP

---

## ADR-010: TypeScript API Client Generation

**Status:** ✅ Accepted

**Context:**
Frontend needs to call backend APIs. Options:
- **Manual API Calls** - Flexible but error-prone
- **Generated Client** - Type-safe, less effort
- **GraphQL** - Different paradigm

**Decision:**
Generate TypeScript API client from OpenAPI specification.

**Rationale:**
- **Type Safety:** Compile-time checking of API calls
- **Single Source of Truth:** OpenAPI spec defines contract
- **Less Boilerplate:** No manual API call code
- **Pact Testing:** Can generate Pact contracts from OpenAPI
- **Auto-Sync:** Regenerate client when API changes

**Consequences:**
✅ Type-safe API calls
✅ Reduced boilerplate
✅ API changes detected at compile time
✅ Consistent error handling
❌ Build step required to regenerate
❌ Inflexible for custom logic
❌ Must keep OpenAPI spec up to date

**Tooling:**
- `openapi-generator-cli` or `openapi-typescript-codegen`
- Part of frontend build process

---

## ADR-011: Flyway for Database Migrations

**Status:** ✅ Accepted

**Context:**
Manage database schema changes. Options:
- **Liquibase** - XML/YAML based, feature-rich
- **Flyway** - SQL-based, simpler
- **Manual Scripts** - Flexible but error-prone

**Decision:**
Use Flyway for version-controlled database migrations.

**Rationale:**
- **SQL-Based:** Familiar syntax
- **Version Control:** Migrations in Git
- **Automatic Execution:** Quarkus runs on startup
- **Rollback Protection:** Forward-only (safe)
- **History Table:** Tracks applied migrations
- **Simple:** Less complexity than Liquibase

**Consequences:**
✅ Schema changes version-controlled
✅ Automatic migration on deployment
✅ History of all schema changes
✅ Works with any SQL database
❌ Forward-only (no automatic rollback)
❌ Manual intervention for failed migrations
❌ Need to coordinate across services

**Convention:**
```
V{version}__{description}.sql
V1__create_organization.sql
V2__add_member_table.sql
```

---

## ADR-012: OpenFGA for Fine-Grained Authorization (Future)

**Status:** 🟡 Proposed (Not Implemented)

**Context:**
Current authorization is role-based (admin, user). Need fine-grained permissions like:
- "User X can edit Document Y"
- "Admin A can manage Organization B"

**Decision:**
Adopt OpenFGA (Open Fine-Grained Authorization) when fine-grained permissions needed.

**Rationale:**
- **Relationship-Based:** Define relationships between users and resources
- **Scalable:** Google Zanzibar-inspired
- **Open Source:** CNCF project
- **Quarkus Integration:** quarkus-openfga-client
- **Flexible:** Define any permission model

**Consequences:**
✅ Flexible permission model
✅ Scalable authorization checks
✅ Relationship-based (not just roles)
✅ Audit trail of permission changes
❌ Additional service to deploy
❌ Learning curve for team
❌ Migration from current RBAC

**Implementation (When Needed):**
```java
@Inject
OpenFGAClient fga;

public boolean canEdit(String userId, String documentId) {
    return fga.check(
        user: "user:" + userId,
        relation: "editor",
        object: "document:" + documentId
    );
}
```

---

## Decision Log

| ADR | Decision | Status | Date |
|-----|----------|--------|------|
| ADR-001 | Vertical Slice Architecture | ✅ Accepted | 2025-11-12 |
| ADR-002 | Quarkus Framework | ✅ Accepted | 2024-01-15 |
| ADR-003 | Keycloak Authentication | ✅ Accepted | 2024-01-15 |
| ADR-004 | Microservices Decomposition | ✅ Accepted | 2024-02-01 |
| ADR-005 | BPMN Orchestration | ✅ Accepted | 2024-03-01 |
| ADR-006 | React Frontend | ✅ Accepted | 2024-01-20 |
| ADR-007 | AWS S3 Storage | ✅ Accepted | 2024-04-01 |
| ADR-008 | Kafka Messaging | ✅ Accepted | 2024-05-01 |
| ADR-009 | PostgreSQL Database | ✅ Accepted | 2024-01-15 |
| ADR-010 | TypeScript Client | ✅ Accepted | 2024-02-15 |
| ADR-011 | Flyway Migrations | ✅ Accepted | 2024-01-15 |
| ADR-012 | OpenFGA Authorization | 🟡 Proposed | TBD |

---

## Future Decisions

### Under Consideration

**Multi-Database Strategy:**
- When: Main service becomes bottleneck
- Options: Separate DB per service, read replicas, CQRS
- Trade-offs: Complexity vs scalability

**API Gateway:**
- When: Need centralized rate limiting, authentication
- Options: Kong, AWS API Gateway, Traefik
- Trade-offs: Single point of failure vs centralized control

**Service Mesh:**
- When: Service-to-service communication complex
- Options: Istio, Linkerd, Consul
- Trade-offs: Observability vs operational complexity

---

## Review Process

Architecture decisions follow this process:

1. **Proposal:** Anyone can propose ADR
2. **Discussion:** Team discusses trade-offs
3. **Decision:** Architecture team makes final decision
4. **Documentation:** ADR documented in this file
5. **Implementation:** Changes implemented
6. **Review:** Quarterly review of all ADRs

---

**Document Version:** 1.0
**Last Updated:** 2025-11-12
**Status:** Active
