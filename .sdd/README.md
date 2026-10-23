---
name: DevSecOps
type: modifier
description: Security-first development workflows
includes:
  - security-design-template.md
  - security-checklist.md
  - constitutional-amendment.md (Amendment: Security-First Development)
  - before-task_extends.md (adds security impact assessment)
  - security-requirements.md
examples:
  - web+devsecops - React app with XSS/CSRF protection
  - api+devsecops - Backend with OAuth, rate limiting, input validation
  - full-stack+devsecops - End-to-end security (frontend, backend, database)
---

# DevSecOps Modifier

The **DevSecOps** modifier adds security-first workflows to any base profile. It emphasizes threat modeling, security checklists, and compliance tracking.

## What You Get

**Added to your base profile:**

### Templates
- `security-design-template.md` - Threat modeling template
  - Assets (what needs protection)
  - Threats (who attacks, how)
  - Attack vectors (injection, XSS, CSRF, etc.)
  - Mitigations (how to prevent/detect/respond)
  - Risk assessment table
- `security-requirements.md` - OWASP/CWE compliance mapping

### Rules
- `security-checklist.md` - Pre-implementation security review
  - Input validation
  - Authentication/authorization
  - Secret management
  - Dependency scanning
- `before-task_extends.md` - Adds security impact assessment to before-task rules

### Constitution
- **Amendment: Security-First Development** (appended idempotently to `.sdd/constitution.md`)
  - Threat modeling required for design phase
  - Security checklist mandatory before implementation
  - Secrets never committed to version control
  - Dependencies scanned for vulnerabilities

## When to Use

- Handling sensitive data (PII, financial, healthcare)
- Building applications requiring compliance (GDPR, HIPAA, SOC 2)
- Deploying to production with security requirements
- Working in regulated industries

## Agent Detection

Agent will recommend this modifier when detecting:
- Security dependencies: `snyk`, `sonarqube`, `dependabot`, `owasp-dependency-check`
- Security configs: `.snyk`, `sonar-project.properties`
- Authentication libraries: `passport`, `oauth`, `jwt`
- Encryption libraries: `bcrypt`, `crypto`

## Composition Examples

- `web+devsecops` - React app with CSP, XSS protection
- `api+devsecops` - API with OAuth, rate limiting
- `mobile+devsecops` - Mobile app with secure storage, certificate pinning
- `full-stack+devsecops` - Complete security stack
