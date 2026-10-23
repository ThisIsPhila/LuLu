# Contributing to LuLu

SDD is already installed in this repository. Follow [AGENTS.md](AGENTS.md) and its existing [SDD onboarding](.sdd/AGENT_ONBOARDING.md); this document adds no separate agent workflow.

## Project orientation

- [Project explainer](docs/project-explainer.md)
- [Current product vision](.sdd/memory/product-vision.md)
- [Project context](.sdd/memory/project-context.md)

## New checkout

Accept the private repository invitation, then clone:

```sh
git clone https://github.com/ThisIsPhila/LuLu.git
cd LuLu
```

Git does not clone local hooks. Install the already-included hook on the new checkout:

```sh
bash .sdd/scripts/hooks.sh install
```

No framework reinstallation is needed. The optional local visual workspace setup is documented in [README.md](README.md).
