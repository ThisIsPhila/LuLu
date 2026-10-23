#!/usr/bin/env node
// UTF-8

/**
 * Spec Linter: validates privacy and profile-specific requirements for feature specs.
 *
 * Usage: node scripts/validate-spec.cjs path/to/spec.md
 */
const fs = require("fs");
const path = require("path");

const specPath = process.argv[2];
if (specPath === "--help") { console.log("Usage: node .sdd/scripts/validate-spec.cjs path/to/spec.md"); process.exit(0); }

if (!specPath) {
  console.error("❌ Missing spec file path. Usage: node scripts/validate-spec.cjs path/to/spec.md");
  process.exit(1);
}

const resolvedPath = path.resolve(specPath);

if (!fs.existsSync(resolvedPath)) {
  console.error(`❌ Spec file not found: ${resolvedPath}`);
  process.exit(1);
}

const content = fs.readFileSync(resolvedPath, "utf8");
const fileName = path.basename(resolvedPath).toLowerCase();

// Determine active profile
let activeProfile = "general";
const profilePath = path.join(process.cwd(), ".sdd", ".profile");
if (fs.existsSync(profilePath)) {
  activeProfile = fs.readFileSync(profilePath, "utf8").trim().toLowerCase();
}

console.log(`🔍 Linting spec: ${path.relative(process.cwd(), resolvedPath)} (Profile: ${activeProfile})`);

// Classify by canonical filename first, then by a specific artifact heading.
// The old `/requirements/i.test(content)` and `/design/i.test(content)` checks
// classified almost every design as requirements (designs naturally discuss
// requirements), forcing the requirements-only privacy section onto design.md.
const isRequirements =
  fileName.includes("requirements") || /^##[^\n]*\bRequirements\b/im.test(content);
const isDesign =
  fileName.includes("design") || /^##[^\n]*\bDesign (Overview|Specification)\b/im.test(content);

// 1. General checks (Privacy & Security Model check for requirements files)
if (isRequirements) {
  const PRIVACY_SECTION_PATTERN = /privacy & security model/i;
  const PII_YES_CHECKBOX = /\[x\]\s*Yes/i;
  const PII_YES_VALUE = /:\s*Yes\b(?!\s*\/)/i;
  const MASKING_CONTROL_PATTERNS = [
    /\[[xX]\]\s*Uses\s+`packages\/privacy-guard`/i,
    /\[[xX]\]\s*Encryption Required/i,
  ];

  const hasPrivacySection = PRIVACY_SECTION_PATTERN.test(content);
  if (!hasPrivacySection) {
    console.error("❌ Spec is missing 'Privacy & Security Model' section.");
    process.exit(1);
  }

  // Detect PII risk by allowing either a checked checkbox ("[x] Yes") or a plain "PII Risk: Yes" value.
  const piiLineMatch = content.match(/pii\s*risk[^\n]*/i);
  const piiIsYes =
    piiLineMatch &&
    (PII_YES_CHECKBOX.test(piiLineMatch[0]) || PII_YES_VALUE.test(piiLineMatch[0]));

  // Capture only the Masking Strategy section up to the next Markdown heading.
  const maskingSection = content.match(/masking strategy[\s\S]*?(?=\n##|\n#(?:\s|$)|$)/i);
  // Require at least one masking control (privacy guard or encryption) to be checked when PII is Yes.
  const hasMaskingChecked =
    maskingSection &&
    MASKING_CONTROL_PATTERNS.some((pattern) => pattern.test(maskingSection[0]));

  if (piiIsYes && !hasMaskingChecked) {
    console.error("❌ PII risk marked as 'Yes' but no masking strategy is checked.");
    process.exit(1);
  }
}

// 2. Profile-Specific checks: devsecops
if (activeProfile.includes("devsecops")) {
  const isSecurityReq = fileName.includes("security-requirements") || fileName.includes("security_requirements") || /security requirements/i.test(content);
  const isSecurityDesign = fileName.includes("security-design") || fileName.includes("security_design") || /security design/i.test(content);

  if (isSecurityReq) {
    if (!/threat surface summary/i.test(content)) {
      console.error("❌ Security Requirements spec is missing 'Threat Surface Summary' section.");
      process.exit(1);
    }
  }

  if (isSecurityDesign) {
    if (!/threat model/i.test(content)) {
      console.error("❌ Security Design spec is missing 'Threat Model' section.");
      process.exit(1);
    }
    if (!/risk assessment/i.test(content)) {
      console.error("❌ Security Design spec is missing 'Risk Assessment' section.");
      process.exit(1);
    }
    if (!/security checklist/i.test(content)) {
      console.error("❌ Security Design spec is missing 'Security Checklist' section.");
      process.exit(1);
    }
  }
}

// 3. Profile-Specific checks: mlops
if (activeProfile.includes("mlops")) {
  const isMLDesign = fileName.includes("model-design") || fileName.includes("model_design") || /ml model design/i.test(content) || /model design/i.test(content);

  if (isMLDesign && isDesign) {
    if (!/dataset/i.test(content)) {
      console.error("❌ ML Model Design spec is missing 'Dataset' section.");
      process.exit(1);
    }
    if (!/experiment tracking/i.test(content)) {
      console.error("❌ ML Model Design spec is missing 'Experiment Tracking' section.");
      process.exit(1);
    }
    if (!/model performance/i.test(content)) {
      console.error("❌ ML Model Design spec is missing 'Model Performance' section.");
      process.exit(1);
    }
  }
}

// 4. Base Profile: web
if (activeProfile.includes("web")) {
  const isWebDesign = fileName.includes("component-design") || fileName.includes("component_design") || /component design/i.test(content);

  if (isWebDesign && isDesign) {
    if (!/component overview/i.test(content)) {
      console.error("❌ Web Component Design spec is missing 'Component Overview' section.");
      process.exit(1);
    }
    if (!/component specification/i.test(content) && !/props\/inputs/i.test(content)) {
      console.error("❌ Web Component Design spec is missing 'Component Specification' or 'Props/Inputs' section.");
      process.exit(1);
    }
    if (!/accessibility/i.test(content)) {
      console.error("❌ Web Component Design spec is missing 'Accessibility' section.");
      process.exit(1);
    }
  }
}

// 5. Base Profile: mobile
if (activeProfile.includes("mobile")) {
  const isMobileDesign = fileName.includes("screen-design") || fileName.includes("screen_design") || /screen design/i.test(content);

  if (isMobileDesign && isDesign) {
    if (!/screen overview/i.test(content)) {
      console.error("❌ Mobile Screen Design spec is missing 'Screen Overview' section.");
      process.exit(1);
    }
    if (!/screen layout/i.test(content)) {
      console.error("❌ Mobile Screen Design spec is missing 'Screen Layout' section.");
      process.exit(1);
    }
    if (!/states & navigation/i.test(content) && !/navigation/i.test(content)) {
      console.error("❌ Mobile Screen Design spec is missing 'States & Navigation' section.");
      process.exit(1);
    }
  }
}

// 6. Base Profile: api
if (activeProfile.includes("api") || activeProfile.includes("full-stack")) {
  const isApiDesign = fileName.includes("api-design") || fileName.includes("api_design") || /api design/i.test(content);

  if (isApiDesign && isDesign) {
    if (!/overview/i.test(content)) {
      console.error("❌ API Design spec is missing 'Overview' section.");
      process.exit(1);
    }
    if (!/endpoints/i.test(content)) {
      console.error("❌ API Design spec is missing 'Endpoints' section.");
      process.exit(1);
    }
    if (!/security/i.test(content)) {
      console.error("❌ API Design spec is missing 'Security' section.");
      process.exit(1);
    }
  }
}

// 7. Base Profile: cli
if (activeProfile.includes("cli")) {
  const isCliDesign = fileName.includes("command-design") || fileName.includes("command_design") || /command design/i.test(content);

  if (isCliDesign && isDesign) {
    if (!/purpose/i.test(content)) {
      console.error("❌ CLI Command Design spec is missing 'Purpose' section.");
      process.exit(1);
    }
    if (!/usage/i.test(content)) {
      console.error("❌ CLI Command Design spec is missing 'Usage' section.");
      process.exit(1);
    }
    if (!/arguments & flags/i.test(content) && !/flags/i.test(content)) {
      console.error("❌ CLI Command Design spec is missing 'Arguments & Flags' section.");
      process.exit(1);
    }
  }
}

// 8. Base Profile: monorepo
if (activeProfile.includes("monorepo")) {
  const isMonorepoDesign = fileName.includes("package-design") || fileName.includes("package_design") || /package design/i.test(content);

  if (isMonorepoDesign && isDesign) {
    if (!/package overview/i.test(content)) {
      console.error("❌ Monorepo Package Design spec is missing 'Package Overview' section.");
      process.exit(1);
    }
    if (!/public api/i.test(content)) {
      console.error("❌ Monorepo Package Design spec is missing 'Public API' section.");
      process.exit(1);
    }
    if (!/dependencies/i.test(content)) {
      console.error("❌ Monorepo Package Design spec is missing 'Dependencies' section.");
      process.exit(1);
    }
  }
}

// 9. Modifier: devops
if (activeProfile.includes("devops")) {
  const isDevopsDesign = fileName.includes("pipeline-design") || fileName.includes("pipeline_design") || /pipeline design/i.test(content) || fileName.includes("infrastructure");

  if (isDevopsDesign && isDesign) {
    if (!/pipeline stages/i.test(content) && !/stage/i.test(content) && !/infrastructure/i.test(content)) {
      console.error("❌ DevOps Pipeline Design spec is missing 'Pipeline Stages' or 'Infrastructure' section.");
      process.exit(1);
    }
    if (!/deployment strategy/i.test(content)) {
      console.error("❌ DevOps Pipeline Design spec is missing 'Deployment Strategy' section.");
      process.exit(1);
    }
    if (!/secrets management/i.test(content) && !/secrets/i.test(content)) {
      console.error("❌ DevOps Pipeline Design spec is missing 'Secrets Management' section.");
      process.exit(1);
    }
  }
}

console.log("✅ Spec passed all profile-aware validation checks.");
