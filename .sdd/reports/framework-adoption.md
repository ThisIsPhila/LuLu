# Framework adoption — 2026-10-23

Owner authorized setup, learning from existing consumers, private GitHub creation and commit; explicitly requested this before the first spec.

## Sources reviewed

- Confessions phase 009 Device Sync & Account Recovery requirements: user stories, passkey proof, ephemeral exchange, merge and recovery. Historical highest-role-wins requirement conflicts with current host-role-preserving source; archive is context, not current implementation truth.
- Confessions phase 013 Firestore Parity & Rules Hardening design/tasks: canonical data contracts, decisions, dependency sequence, security-rule matrix, cross-device validation, deploy order and rollback.
- Smart Trader phase 042 Canonical Data Foundation requirements/design/tasks: explicit ownership, typed contracts, observed versus estimated evidence, failure states, requirement/design/task links, task dependencies and verification inputs/expected results. This is the standard of specificity to adapt, not a source of LuLu domain requirements.

## Installation

Framework source revision: 20642e42c9f63f4e93bfbc56c849eabc092ce787; framework and visual version 2.2.0. Local clone in .sdd-framework is ignored; installed scripts, templates, rules, root skills and agent pointers are committed. Full-stack+devsecops supplies web/API templates and security design discipline without selecting the product stack.

Both core and optional visual workspace are installed for LuLu only. Source consumers were read, not modified. No spec or application implementation is authorized by this setup record.

## Verification

Core doctor and skills validation pass. Visual production build passes; all 39 visual unit/integration tests pass. Local workspace started on loopback port 3456 and opened for LuLu. No application phase exists.

The bundled visual lockfile included DOMPurify 3.4.16 with a critical advisory. LuLu’s ignored local clone was updated compatibly to 3.4.17; no shared framework source was modified. The exact lockfile patch is preserved in ../evidence/setup/visual-security.patch. Two low advisories remain through Mermaid/KaTeX; fixing via npm requires a major Mermaid upgrade and is deferred rather than silently changing framework compatibility.
