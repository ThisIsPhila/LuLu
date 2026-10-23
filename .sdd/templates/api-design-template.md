# API Design - [Service/Feature Name]

**Service:** [Name]  
**Created:** [Date]  
**Status:** 📝 DRAFT

---

## 🎯 Overview
- **Purpose:** [What this API provides]
- **Consumers:** [Who uses it]
- **Auth Model:** [JWT/OAuth/API Key/etc.]

---

## 🧭 Endpoints

### [METHOD] /path
**Description:** [What it does]

**Request:**
- Headers: [Auth headers]
- Params: [Query/path params]
- Body: [Schema]

**Response:**
- Status: [200/201/etc.]
- Body: [Schema]

**Errors:**
- [400] [Reason]
- [401] [Reason]
- [500] [Reason]

---

## 🔒 Security
- Authentication requirement
- Authorization rules (roles/permissions)
- Rate limiting policy

---

## 🧪 Testing Strategy
- Unit tests for handlers
- Integration tests for critical endpoints
- Contract tests for schema changes

---

## ✅ Approval Checkpoint

**🛑 STOP - DO NOT PROCEED TO IMPLEMENTATION WITHOUT APPROVAL**

**Please respond with:**
- ✅ "Approved"
- 🔄 "I have changes..."
- ❓ "I have questions..."
