# Hopps Architecture Documentation

Welcome to the comprehensive architecture documentation for the **Hopps** platform!

## 📖 About This Documentation

This documentation follows the **[arc42](https://arc42.org)** template, a proven structure for communicating software architecture. It provides complete insights into:

- System goals and requirements
- Architecture decisions and their rationale
- Building blocks and component structure
- Runtime behavior and deployment
- Quality attributes and technical risks

## 🚀 Quick Access

### For New Team Members
Start here to understand the system:
1. [Introduction and Goals](01_introduction.md) - What is Hopps and why?
2. [Building Block View](05_building_blocks.md) - How is the system structured?
3. [Glossary](12_glossary.md) - Important terms and concepts

### For Developers
Essential reading for implementation:
1. [Solution Strategy](04_solution_strategy.md) - Key technical decisions
2. [Building Blocks](05_building_blocks.md) - Code organization (Vertical Slices!)
3. [Cross-cutting Concepts](08_crosscutting_concepts.md) - Security, APIs, testing
4. [Architecture Decisions](09_architecture_decisions.md) - ADRs explaining "why"

### For Architects
High-level views and strategic information:
1. [System Context](03_context.md) - External dependencies and boundaries
2. [Solution Strategy](04_solution_strategy.md) - Strategic technology choices
3. [Architecture Decisions](09_architecture_decisions.md) - All ADRs
4. [Quality Scenarios](10_quality_scenarios.md) - Non-functional requirements
5. [Technical Risks](11_technical_risks.md) - What to watch out for

### For Operations/DevOps
Deployment and runtime information:
1. [Deployment View](07_deployment_view.md) - Kubernetes, Docker Compose, CI/CD
2. [Runtime View](06_runtime_view.md) - System behavior and flows
3. [Cross-cutting Concepts](08_crosscutting_concepts.md) - Logging, monitoring, config

## 📚 Complete Chapter Index

| Chapter | Title | Focus |
|---------|-------|-------|
| [01](01_introduction.md) | **Introduction and Goals** | Requirements, stakeholders, success criteria |
| [02](02_architecture_constraints.md) | **Architecture Constraints** | Technical, organizational, and regulatory limits |
| [03](03_context.md) | **System Scope and Context** | Business and technical boundaries |
| [04](04_solution_strategy.md) | **Solution Strategy** | Key decisions and approaches |
| [05](05_building_blocks.md) | **Building Block View** | Static structure (Vertical Slices!) |
| [06](06_runtime_view.md) | **Runtime View** | Dynamic behavior and scenarios |
| [07](07_deployment_view.md) | **Deployment View** | Infrastructure and deployment |
| [08](08_crosscutting_concepts.md) | **Cross-cutting Concepts** | Security, APIs, testing, etc. |
| [09](09_architecture_decisions.md) | **Architecture Decisions** | ADRs with rationale |
| [10](10_quality_scenarios.md) | **Quality Requirements** | Performance, security, scalability |
| [11](11_technical_risks.md) | **Risks and Technical Debt** | What could go wrong |
| [12](12_glossary.md) | **Glossary** | Terms and acronyms |

## 🎯 Key Highlights

### Technology Stack
- **Backend:** Quarkus 3.19.2 (Java 21)
- **Frontend:** React (SPA + Mobile)
- **Authentication:** Keycloak
- **Database:** PostgreSQL
- **Storage:** AWS S3
- **Messaging:** Apache Kafka
- **Orchestration:** Kubernetes/Helm

### Architecture Patterns
- **Vertical Slice Architecture** (Backend)
- **Microservices** (4 specialized services)
- **BPMN Orchestration** (Kogito)
- **Event-Driven** (Kafka)
- **Multi-tenant** (Organization isolation)

### Key Features
- ✅ Organization/Association management
- ✅ Member management with Keycloak
- ✅ Hierarchical budget structure (Bommel tree)
- ✅ AI-powered document analysis
- ✅ Invoice/Receipt processing (ZugFerd)
- ✅ Transaction recording and categorization

## 🔍 Documentation Statistics

- **Total Pages:** 12 main chapters + index
- **Total Lines:** ~8,754 lines
- **Total Size:** ~213 KB
- **Diagrams:** 50+ Mermaid diagrams
- **Code Examples:** Throughout all chapters
- **Completeness:** 100% (all arc42 sections covered)

## 🛠️ How to Use This Documentation

### Reading Online (GitHub Pages)
Visit: `https://[your-username].github.io/hopps/`

**Features:**
- ✨ **Custom sidebar navigation** - Easy access to all 12 chapters
- 🎨 **Hopps brand colors** - Purple theme (#9955CC) matching the application
- 📊 **Mermaid diagrams** - All diagrams render automatically
- 🔍 **Syntax highlighting** - Code blocks with proper highlighting
- 📱 **Responsive design** - Works on desktop, tablet, and mobile

### Reading Locally
1. Clone the repository
2. Install dependencies: `cd docs && bundle install`
3. Start server: `bundle exec jekyll serve`
4. Open http://localhost:4000/hopps/ in your browser

See [DEVELOPMENT.md](DEVELOPMENT.md) for detailed local development instructions.

### Theme Customization
The documentation uses a custom Jekyll theme with:
- **Layout:** `_layouts/default.html` (sidebar navigation)
- **Styles:** `assets/css/style.css` (Hopps purple color scheme)
- **Font:** Reddit Sans (matching application)

### Contributing
To improve this documentation:
1. Edit the Markdown files in `/docs/`
2. Follow the arc42 template structure
3. Include Mermaid diagrams where helpful
4. Submit a pull request

## 📖 arc42 Template

This documentation follows [arc42](https://arc42.org), the most widely used template for software architecture documentation. It's:
- ✅ **Pragmatic** - Use only what you need
- ✅ **Technology-agnostic** - Works for any system
- ✅ **Proven** - Used by thousands of projects
- ✅ **Free and open** - No license fees

## 🌟 Documentation Principles

This documentation follows these principles:
1. **Current** - Reflects the actual system (Vertical Slice Architecture)
2. **Comprehensive** - Covers all important aspects
3. **Visual** - Diagrams for complex concepts
4. **Actionable** - Code examples and configurations
5. **Cross-referenced** - Easy navigation between topics
6. **Living** - Updated with system changes

## 📅 Last Updated

**Date:** 2025-11-12
**Version:** 1.0.0
**Status:** Complete

---

## Quick Links

- [GitHub Repository](https://github.com/[your-org]/hopps)
- [arc42 Template](https://arc42.org)
- [Issue Tracker](https://github.com/[your-org]/hopps/issues)

---

Start reading: [Chapter 1: Introduction and Goals →](01_introduction.md)
