# Security Checklist

## 🔐 Before Implementation

- [ ] **Threat Model Created:** Identified assets, threats, attack vectors, mitigations
- [ ] **Security Design Approved:** Reviewed security-design-template.md
- [ ] **Secrets Management:** No hardcoded credentials, using environment variables/vault

---

## 🛡️ During Implementation

- [ ] **Input Validation:** All user inputs validated and sanitized
- [ ] **Authentication:** Proper auth checks on protected endpoints
- [ ] **Authorization:** Role-based access control implemented
- [ ] **SQL Injection:** Using parameterized queries/ORM
- [ ] **XSS Prevention:** Output encoding, CSP headers
- [ ] **CSRF Protection:** CSRF tokens on state-changing requests
- [ ] **Dependency Security:** No known vulnerabilities (run `npm audit` / `pip-audit`)

---

## ✅ Before Deployment

- [ ] **HTTPS Enforced:** All traffic over TLS
- [ ] **Security Headers:** CSP, HSTS, X-Frame-Options, X-Content-Type-Options
- [ ] **Secrets Scanned:** No secrets in git history (run `gitleaks` or `trufflehog`)
- [ ] **Penetration Testing:** Basic security testing completed
- [ ] **Logging:** Security events logged (failed auth, suspicious activity)

---

## 📋 Compliance (if applicable)

- [ ] **GDPR:** User consent, data deletion, privacy policy
- [ ] **HIPAA:** PHI encryption, access logs, audit trail
- [ ] **SOC 2:** Access controls, monitoring, incident response
