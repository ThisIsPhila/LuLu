# API Contract - [API Name]

**Feature:** [Feature/Epic Name]  
**Frontend:** [React/Vue/Angular Component]  
**Backend:** [Express/FastAPI/Django Endpoint]  
**Created:** [Date]  
**Status:** 📝 DRAFT  
**Approved:** Pending

---

## 🎯 Contract Overview

**Purpose:** Define the interface between frontend and backend for [feature description].

**API Type:** [REST / GraphQL / WebSocket / gRPC]

---

## 📋 Endpoint Specifications

### Endpoint 1: [Endpoint Name]

**Method:** `POST`  
**Path:** `/api/v1/[resource]`  
**Description:** [What this endpoint does]

#### Request

**Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer {token}"
}
```

**Body:**
```json
{
  "fieldName": "string",
  "nestedObject": {
    "id": "number"
  },
  "arrayField": ["string"]
}
```

**Schema:**
| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `fieldName` | `string` | Yes | Max 255 chars | Description |
| `nestedObject.id` | `number` | Yes | Positive integer | Resource ID |

#### Response

**Success (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "createdAt": "ISO8601 timestamp"
  }
}
```

**Error (400 Bad Request):**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "fieldName",
        "issue": "Required field missing"
      }
    ]
  }
}
```

---

## 🔐 Authentication & Authorization

- **Authentication:** JWT Bearer token required in `Authorization` header
- **Permissions:** User must have `[permission.name]` permission
- **Rate Limiting:** 100 requests per minute per user

---

## 📊 Error Codes

| Code | HTTP Status | Description | User Action |
|------|-------------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid input data | Fix input and retry |
| `UNAUTHORIZED` | 401 | Missing or invalid token | Re-authenticate |
| `FORBIDDEN` | 403 | Insufficient permissions | Contact administrator |
| `NOT_FOUND` | 404 | Resource not found | Verify resource ID |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests | Wait and retry |
| `SERVER_ERROR` | 500 | Internal server error | Retry or contact support |

---

## 🧪 Testing

### Backend Tests
- Unit tests for endpoint logic
- Validation tests for request schemas
- Error handling tests

### Frontend Tests
- API mocking for component tests
- Integration tests with mock server
- Error state handling

### Contract Tests
- Pact tests (consumer/provider)
- Schema validation tests

---

## ✅ Approval Checkpoint

**🛑 STOP - DO NOT PROCEED TO IMPLEMENTATION WITHOUT APPROVAL**

**Please confirm:**
1. Request/response schemas are correct?
2. Error codes cover all cases?
3. Authentication requirements clear?

**Respond with:**
- ✅ "Approved - proceed to Implementation"
- 🔄 "I have changes..."
- ❓ "I have questions..."
