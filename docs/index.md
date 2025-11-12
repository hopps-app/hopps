# Hopps Platform - Architecture Documentation

Welcome to the comprehensive architecture documentation for **Hopps**, a modern web-based platform for managing German organizations and associations (Vereine e.V.). This documentation follows the [arc42](https://arc42.org) template, providing structured and detailed architectural information.

## About Hopps

**Hopps** is a cloud-native platform that enables German associations (Vereine) to:
- Manage organizations and members
- Create hierarchical budget structures (Bommel trees)
- Process financial documents with AI-powered analysis
- Record and categorize transactions
- Collaborate across web and mobile devices

### Technology Stack

**Backend:**
- Quarkus 3.19.2 (Java 21) - Cloud-native microservices
- PostgreSQL - Relational database
- Kogito BPMN - Business process orchestration
- Kafka - Event-driven messaging
- AWS S3 - Document storage

**Frontend:**
- React SPA (TypeScript) - Web application
- React Native - Mobile application
- OpenAPI-generated API client

**Infrastructure:**
- Keycloak - Identity and access management
- Kubernetes - Container orchestration
- Docker Compose - Local development
- Prometheus & Grafana - Monitoring

### Architecture Highlights

- **Vertical Slice Architecture** - Code organized by business capabilities
- **Microservices** - Specialized services (document AI, invoice parsing, email)
- **Multi-Tenant** - Secure data isolation per organization
- **Event-Driven** - Kafka for asynchronous communication
- **API-First** - Complete OpenAPI/Swagger documentation
- **Cloud-Native** - Fast startup (< 3s), low memory (< 100MB)

---

## 📚 Documentation Structure

This documentation consists of 12 comprehensive chapters following the arc42 template:

### Core Architecture

1. **[Introduction and Goals](01_introduction.md)**
   Requirements overview, stakeholders, quality goals, and success criteria for the Hopps platform.

2. **[Architecture Constraints](02_architecture_constraints.md)**
   Technical (Java 21, Quarkus, PostgreSQL), organizational, and regulatory constraints (GDPR) that shaped the architecture.

3. **[System Scope and Context](03_context.md)**
   Business context, external systems (Keycloak, S3, AI services), and communication interfaces.

4. **[Solution Strategy](04_solution_strategy.md)**
   Key technology decisions (Quarkus, Keycloak, React) and architectural patterns (Vertical Slices, Microservices, BPMN).

### System Structure

5. **[Building Block View](05_building_blocks.md)**
   Static decomposition: 6 vertical slices (organization, member, bommel, category, document, transaction) + shared infrastructure.

6. **[Runtime View](06_runtime_view.md)**
   Dynamic behavior: authentication flows, BPMN workflows, document processing, and tree navigation with sequence diagrams.

7. **[Deployment View](07_deployment_view.md)**
   Infrastructure: Docker Compose (dev), Kubernetes (production), CI/CD pipeline, and monitoring setup.

### Cross-Cutting Concerns

8. **[Cross-cutting Concepts](08_crosscutting_concepts.md)**
   Security (OAuth2/OIDC), persistence (JPA/Panache), API design, validation, logging, monitoring, and testing strategies.

9. **[Architecture Decisions](09_architecture_decisions.md)**
   12 ADRs documenting significant decisions: Vertical Slice Architecture, Quarkus, Keycloak, BPMN, React, S3, Kafka, and more.

### Quality and Risks

10. **[Quality Requirements](10_quality_scenarios.md)**
    Quality scenarios for performance (< 3s startup), security (multi-tenant isolation), scalability (100+ users), and reliability (99.5% uptime).

11. **[Technical Risks and Debt](11_technical_risks.md)**
    Current risks (BPMN complexity, database bottleneck), technical debt (test coverage), and mitigation strategies.

12. **[Glossary](12_glossary.md)**
    Domain terms (Bommel, Verein, e.V., ZugFerd), technical terms (Vertical Slice, Panache, JWT), and acronyms.

---

## 🎯 Quick Start

**For Business Stakeholders:**
- Start with [Introduction and Goals](01_introduction.md) for system overview
- Read [System Context](03_context.md) to understand external integrations

**For Developers:**
- Review [Solution Strategy](04_solution_strategy.md) for key decisions
- Study [Building Block View](05_building_blocks.md) for code organization
- Reference [Cross-cutting Concepts](08_crosscutting_concepts.md) for patterns

**For Operations:**
- Check [Deployment View](07_deployment_view.md) for infrastructure
- Review [Quality Requirements](10_quality_scenarios.md) for SLOs
- Monitor [Technical Risks](11_technical_risks.md) for operational concerns

---

## 🚀 Key Features

### Organization Management
- Self-service organization creation via BPMN workflow
- Automatic Keycloak user provisioning
- Multi-tenant data isolation
- Member role management

### Budget Management (Bommel Trees)
- Hierarchical budget structures with unlimited depth
- Tree navigation with recursive queries
- Move operations with cycle detection
- Budget allocation and tracking

### Document Processing
- AI-powered document analysis (invoices, receipts)
- ZugFerd electronic invoice parsing
- Direct S3 upload with presigned URLs
- Financial semantic tagging with ML
- Automatic transaction creation

### Financial Transactions
- Transaction recording and categorization
- Link transactions to documents
- Trade party management (vendors, suppliers)
- Category-based expense tracking

---

## 📊 Architecture Principles

1. **Vertical Slice Architecture** - Organize by business capability, not technical layers
2. **API-First Design** - All functionality exposed through well-documented REST APIs
3. **Security by Default** - Every endpoint protected, multi-tenant isolation enforced
4. **Cloud-Native** - Container-first design optimized for Kubernetes
5. **Event-Driven** - Kafka for asynchronous communication where appropriate
6. **Test Automation** - Comprehensive testing: unit, integration, contract (Pact)
7. **Observability** - Prometheus metrics, structured logging, Grafana dashboards
8. **Standards-Based** - Jakarta EE, MicroProfile, OAuth2/OIDC, OpenAPI

---

## 📖 Related Documentation

### Internal Resources
- [Backend Vertical Slice Implementation](../backend-vertical-slice-implementation-summary.md) - Complete migration details
- [Backend Structure Analysis](../backend-structure-analysis.md) - Original structure and issues
- [Domain Relationships](../backend-domain-relationships.md) - Entity relationship diagrams
- [Vertical Slice Plan](../backend-vertical-slice-plan.md) - Migration strategy

### External Resources
- [Quarkus Documentation](https://quarkus.io/guides/) - Framework guides
- [Keycloak Documentation](https://www.keycloak.org/documentation) - Authentication setup
- [Arc42 Template](https://arc42.org) - Documentation structure
- [Vertical Slice Architecture](https://jimmybogard.com/vertical-slice-architecture/) - Architectural pattern

---

## 🤝 Contributing to Documentation

To improve or update this documentation:

1. **Fork the repository** and create a feature branch
2. **Edit Markdown files** in `/docs` directory
3. **Follow arc42 structure** - maintain consistency across chapters
4. **Use Mermaid diagrams** for visual documentation (supported by GitHub)
5. **Cross-reference** between chapters where appropriate
6. **Open a pull request** with clear description of changes

### Documentation Standards
- Use present tense ("The system uses..." not "The system will use...")
- Include code examples where helpful
- Keep diagrams up-to-date with implementation
- Update glossary for new terms
- Reference ADRs for significant decisions

---

## 📅 Documentation Status

**Version:** 1.0
**Last Updated:** 2025-11-12
**Status:** ✅ Complete
**Next Review:** 2025-02-12

### Completeness

| Chapter | Status | Completeness |
|---------|--------|--------------|
| 01 - Introduction | ✅ Complete | 100% |
| 02 - Constraints | ✅ Complete | 100% |
| 03 - Context | ✅ Complete | 100% |
| 04 - Solution Strategy | ✅ Complete | 100% |
| 05 - Building Blocks | ✅ Complete | 100% |
| 06 - Runtime View | ✅ Complete | 100% |
| 07 - Deployment | ✅ Complete | 100% |
| 08 - Cross-cutting | ✅ Complete | 100% |
| 09 - Decisions | ✅ Complete | 100% |
| 10 - Quality | ✅ Complete | 100% |
| 11 - Risks | ✅ Complete | 100% |
| 12 - Glossary | ✅ Complete | 100% |

---

## 🎓 Learning Path

**Recommended reading order for new team members:**

1. [Introduction](01_introduction.md) - Understand what Hopps does and why
2. [Glossary](12_glossary.md) - Learn domain terminology (Bommel, Verein, e.V.)
3. [Solution Strategy](04_solution_strategy.md) - Grasp key architectural decisions
4. [Building Blocks](05_building_blocks.md) - Explore code organization and structure
5. [Runtime View](06_runtime_view.md) - See how the system behaves
6. [Cross-cutting Concepts](08_crosscutting_concepts.md) - Learn development patterns
7. [Deployment View](07_deployment_view.md) - Understand infrastructure
8. [Architecture Decisions](09_architecture_decisions.md) - Learn why we chose this path

---

For detailed architecture information, start reading from **[Chapter 1: Introduction and Goals](01_introduction.md)**.

**Happy exploring the Hopps architecture!** 🏗️

