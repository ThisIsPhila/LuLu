# Component Design - [Component Name]

**Feature:** [Feature/Epic Name]  
**Created:** [Date]  
**Status:** 📝 DRAFT  
**Approved:** Pending

---

## 🎯 Component Overview

**Purpose:** [What this component does and why it exists]

**User-Facing:** [Yes/No - Is this component visible to end users?]

**Reusability:** [Reusable / Feature-Specific / One-off]

---

## 📋 Component Specification

### Component Hierarchy

```
[ParentComponent]
├── [ThisComponent]
│   ├── [ChildComponent1]
│   └── [ChildComponent2]
```

### Props/Inputs

| Prop Name | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `propName` | `string` | Yes | - | Description of what this prop does |
| `onClick` | `function` | No | `undefined` | Click handler callback |

### State/Data

| State Variable | Type | Initial Value | Description |
|----------------|------|---------------|-------------|
| `isLoading` | `boolean` | `false` | Loading state for async operations |
| `data` | `Array<T>` | `[]` | Fetched data |

### Events/Callbacks

| Event Name | Parameters | When Triggered | Description |
|------------|------------|----------------|-------------|
| `onSubmit` | `(data: FormData)` | Form submission | Emitted when form is submitted |

---

## 🎨 Visual Design

### Layout

```
┌─────────────────────────────────────┐
│  [ComponentName]                    │
│  ┌───────────────────────────────┐  │
│  │  Header Section               │  │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │  Content Area                 │  │
│  └───────────────────────────────┘  │
│  [Action Button]                    │
└─────────────────────────────────────┘
```

### Styling

- **Colors:** [Primary, Secondary, Accent colors]
- **Typography:** [Font family, sizes, weights]
- **Spacing:** [Margins, padding]
- **Responsive:** [Breakpoints and behavior]

---

## 🔄 Interaction Patterns

### User Flows

1. **Flow 1 - [Action Name]:**
   - User clicks [element]
   - Component validates [data]
   - Shows [feedback]
   - Emits [event]

2. **Flow 2 - [Another Action]:**
   - [Steps]

### State Transitions

```
[Initial State] → (User Action) → [Loading State] → (Success/Error) → [Final State]
```

---

## 🧪 Component Behavior

### Success Cases

- WHEN user inputs valid data THEN component SHALL validate and emit success event
- WHEN data loads successfully THEN component SHALL display content

### Error Cases

- WHEN validation fails THEN component SHALL show error message
- WHEN API call fails THEN component SHALL display error state with retry option

### Edge Cases

- WHEN no data available THEN component SHALL show empty state
- WHEN user is offline THEN component SHALL show offline indicator

---

## ♿ Accessibility (WCAG 2.1 AA)

- [ ] **Keyboard Navigation:** All interactive elements accessible via Tab/Shift+Tab
- [ ] **Screen Reader:** ARIA labels for all interactive elements
- [ ] **Focus Indicators:** Visible focus states
- [ ] **Color Contrast:** 4.5:1 for text, 3:1 for interactive elements
- [ ] **Semantic HTML:** Proper HTML5 elements (button, nav, main, etc.)

---

## 📱 Responsive Design

| Breakpoint | Behavior |
|------------|----------|
| Mobile (< 640px) | Stack layout vertically |
| Tablet (640-1024px) | Two-column layout |
| Desktop (> 1024px) | Full multi-column layout |

---

## 🔗 Dependencies

**Parent Components:**
- `[ParentComponent]` - [How it's used]

**Child Components:**
- `[ChildComponent]` - [Purpose]

**External Dependencies:**
- `[Library Name]` - [Why it's needed]

---

## 🧪 Testing Strategy

### Unit Tests
- Prop validation
- State management
- Event emissions

### Integration Tests
- Parent/child communication
- API interaction

### Visual Regression Tests
- Screenshots for each state (loading, success, error, empty)

---

## ✅ Approval Checkpoint

**🛑 STOP - DO NOT PROCEED TO IMPLEMENTATION WITHOUT APPROVAL**

**Please confirm:**
1. Component hierarchy makes sense?
2. Props/state are sufficient?
3. Accessibility requirements clear?
4. Visual design approved?

**Respond with:**
- ✅ "Approved - proceed to Implementation"
- 🔄 "I have changes..."
- ❓ "I have questions..."
