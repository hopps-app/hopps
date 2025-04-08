# 🧭 Project Architecture Documentation

Welcome to the architecture documentation for our web application platform. This documentation follows the [arc42](https://arc42.org) template, which provides a structured way to communicate architecture decisions, system design, and technical rationale.

This system consists of:
- A **React-based Single Page Application (SPA)**
- Multiple **Quarkus-based microservices**
- Centralized authentication via **Keycloak**
- Deployments supported through **Docker Compose** and **Kubernetes with Helm Charts**

---

## 📚 Documentation Structure

Below you will find the complete arc42 documentation, divided into 12 sections:

1. [Introduction and Goals](01_introduction.md)  
   Defines the motivation, stakeholders, and primary goals of the system.

2. [Architecture Constraints](02_architecture_constraints.md)  
   Lists technical, organizational, and regulatory constraints that influenced the design.

3. [System Scope and Context](03_context.md)  
   Describes the system's boundaries and external interactions.

4. [Solution Strategy](04_solution_strategy.md)  
   Summarizes key design decisions and architectural strategies.

5. [Building Block View](05_building_blocks.md)  
   Explains the static structure and decomposition of the system.

6. [Runtime View](06_runtime_view.md)  
   Illustrates how the system behaves at runtime for key scenarios.

7. [Deployment View](07_deployment_view.md)  
   Describes the deployment architecture for Docker and Kubernetes.

8. [Crosscutting Concepts](08_crosscutting_concepts.md)  
   Covers topics like authentication, logging, monitoring, and configuration.

9. [Architecture Decisions](09_architecture_decisions.md)  
   Records significant decisions and their rationale using the ADR format.

10. [Quality Scenarios](10_quality_scenarios.md)  
    Defines quality attributes and scenarios to ensure maintainability and scalability.

11. [Technical Risks](11_technical_risks.md)  
    Highlights potential risks and their mitigations.

12. [Glossary](12_glossary.md)  
    A list of important domain-specific terms and acronyms.

---

## 🚀 Project Highlights

- **Modular microservices**: Built with [Quarkus](https://quarkus.io) for performance and fast startup.
- **Secure authentication**: Managed through [Keycloak](https://www.keycloak.org).
- **Modern frontend**: A React SPA communicates via RESTful APIs.
- **Flexible deployment**: Local with Docker Compose, scalable with Kubernetes and Helm.

---

## 🧩 How to Contribute

If you want to improve or update this documentation:
1. Fork the repository.
2. Edit the Markdown files in the `/docs` directory.
3. Open a pull request with your changes.

---

For detailed architecture, start reading from [Section 1: Introduction and Goals](01_introduction.md).

