# Security Design - [Feature Name]

**Feature:** [Feature/Epic Name]  
**Security Level:** [Low / Medium / High / Critical]  
**Created:** [Date]  
**Status:** 📝 DRAFT  

---

## 🔒 Threat Model

### Assets
What needs protection:
- User data (PII, credentials)
- API keys and secrets
- Database contents

### Threats
Who might attack:
- External attackers (hackers)
- Malicious insiders
- Compromised dependencies

### Attack Vectors
How they could attack:
- SQL injection
- XSS (Cross-Site Scripting)
- CSRF (Cross-Site Request Forgery)
- Authentication bypass
- Dependency vulnerabilities

### Mitigations
How we prevent/detect/respond:
- Parameterized queries (SQL injection)
- Content Security Policy (XSS)
- CSRF tokens (CSRF)
- OAuth 2.0 + JWT (authentication)
- Dependency scanning (Snyk, Dependabot)

---

## 🎯 Risk Assessment

| Threat | Likelihood | Impact | Mitigation | Residual Risk |
|--------|------------|--------|------------|---------------|
| SQL injection | Medium | High | Parameterized queries | Low |
| XSS | Medium | Medium | CSP, input sanitization | Low |
| Leaked secrets | Low | Critical | Vault, no hardcoded secrets | Low |

---

## ✅ Security Checklist

- [ ] No hardcoded secrets or API keys
- [ ] All inputs validated and sanitized
- [ ] Authentication required for protected endpoints
- [ ] Authorization checks implemented
- [ ] HTTPS enforced
- [ ] Dependencies scanned for vulnerabilities
- [ ] Sensitive data encrypted at rest
- [ ] Security headers configured (CSP, HSTS, X-Frame-Options)

---

## ✅ Approval Checkpoint

**🛑 STOP - DO NOT PROCEED TO IMPLEMENTATION WITHOUT SECURITY APPROVAL**

**Respond with:**
- ✅ "Approved"
- 🔄 "Security concerns..."
