# Accessibility Checklist (WCAG 2.1 AA)

Use this checklist for every feature/component to ensure accessibility compliance.

---

## ⌨️ Keyboard Navigation

- [ ] All interactive elements (buttons, links, inputs) accessible via `Tab` key
- [ ] Logical tab order (follows visual flow)
- [ ] `Shift+Tab` for reverse navigation
- [ ] Keyboard shortcuts don't conflict with screen readers
- [ ] Focus is never trapped (users can exit all modals/menus)
- [ ] `Enter` and `Space` activate buttons
- [ ] Arrow keys navigate within menus/lists
- [ ] `Esc` closes modals/menus

---

## 🔊 Screen Reader Support

- [ ] All images have `alt` text (or `alt=""` for decorative images)
- [ ] Form inputs have associated `<label>` elements
- [ ] ARIA labels for icon-only buttons (`aria-label="Close menu"`)
- [ ] ARIA landmarks (`role="navigation"`, `role="main"`, etc.)
- [ ] Dynamic content updates announced (`aria-live` regions)
- [ ] Loading states announced ("Loading..." with `aria-live="polite"`)
- [ ] Error messages announced immediately (`aria-live="assertive"`)

---

## 👁️ Focus Indicators

- [ ] Visible focus outline on all interactive elements
- [ ] Focus outline has sufficient contrast (3:1 minimum)
- [ ] Focus outline not removed with CSS (`outline: none` forbidden)
- [ ] Custom focus styles are clear and consistent

---

## 🎨 Color & Contrast

- [ ] Text has 4.5:1 contrast ratio (3:1 for large text 18pt+)
- [ ] Interactive elements (buttons, inputs) have 3:1 contrast
- [ ] Information not conveyed by color alone (use icons/text too)
- [ ] Links distinguishable from surrounding text (not just by color)

---

## 📝 Semantic HTML

- [ ] Proper heading hierarchy (`<h1>` → `<h2>` → `<h3>`, no skipping)
- [ ] Use `<button>` for buttons (not `<div>` with click handlers)
- [ ] Use `<a>` for links (not `<button>` for navigation)
- [ ] Lists use `<ul>`/`<ol>` and `<li>`
- [ ] Forms use `<form>`, `<label>`, `<input>`,`<select>`
- [ ] Tables use `<table>`,`<th>`, `<td>` with `scope` attributes

---

## 📱 Responsive & Zoom

- [ ] Content reflows properly at 200% zoom
- [ ] No horizontal scrolling at 320px viewport width
- [ ] Text is resizable without breaking layout
- [ ] Touch targets are at least 44x44px (mobile)

---

## ⚠️ Error Handling

- [ ] Form validation errors clearly identified
- [ ] Error messages associated with fields (`aria-describedby`)
- [ ] Error summary at top of form (for screen reader users)
- [ ] Success messages announced

---

## 🎥 Media

- [ ] Videos have captions/subtitles
- [ ] Audio content has transcripts
- [ ] Auto-playing media can be paused
- [ ] No flashing content (risk of seizures)

---

## 🧪 Testing

### Manual Testing
- [ ] Navigate entire page using only keyboard
- [ ] Test with screen reader (VoiceOver on Mac, NVDA on Windows)
- [ ] Zoom to 200% and verify layout
- [ ] Test in grayscale (color-blind simulation)

### Automated Testing
- [ ] Run axe DevTools or similar tool
- [ ] Fix all Critical and Serious issues
- [ ] Address Moderate issues where possible

---

## 📚 Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [axe DevTools](https://www.deque.com/axe/devtools/)
