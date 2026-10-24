# LuLu — Product, Frontend & Brand Direction Update

## Purpose of This Handoff

This is a context and direction update for the existing LuLu development workspace.

We have been developing the product vision, exploring frontend design through Lovable/v0, and refining LuLu's visual identity in a separate design discussion.

This document brings those developments into the implementation workspace.

**Continue from the current project state. Preserve existing work and incorporate the updated intentions into ongoing development.**

The accompanying design images are creative references. The selected frontend implementation, once available, will provide the concrete interface and component structure for integration.

## 1. Product Vision

LuLu is a mobile-first journal and storybook application with an intelligent, deliberately activated privacy experience.

The vision is to let people document their experiences naturally while LuLu can transform sensitive writing into coherent alternative narratives.

The ordinary application must be genuinely useful independently of its privacy capabilities.

People can write, organise, search, edit and revisit journal entries or stories as they would in a conventional writing application.

The privacy functionality becomes active only when deliberately invoked, either by entering the protected experience or choosing to convert an existing entry.

Within that experience, the user writes normally. LuLu handles the recognition and transformation work automatically.

### Contextual and narrative transformation

A key correction to the earlier project descriptions is that LuLu's intelligence extends beyond replacing personally identifiable information.

Consider an original account describing how David arrived at the writer's home at a particular time and threatened the writer.

LuLu might transform the representation into:

**“John came to the Nest at Blue Moon and threatened her.”**

Several transformations are represented here:

- David becomes John, preserving a consistent alternative identity.
- Home becomes the Nest, creating an alternative place reference.
- A particular time becomes Blue Moon, providing a contextual alternative.
- The writer's first-person perspective becomes third-person narration: “I” becomes “her”.

The last transformation is significant.

**LuLu supports narrative distancing, including changes in grammatical perspective, while retaining the relationships, actions and underlying meaning of an event.**

This capability is central to the storybook concept and to the intended privacy experience.

### Natural writing and feedback

Users should not have to write in disguised language.

They compose their experiences in their own words.

When protected processing is active, LuLu recognises relevant information and progressively transforms the representation.

Subtle animations and contextual indicators help the user observe what has been recognised, associated or changed.

The user can correct an association, change an alias or link a reference to an existing person or place when they choose.

These corrections are available without making the user responsible for managing every transformation.

The original context remains recoverable through the authorised protected experience, including private identity mappings.

The intended architecture emphasises device-local processing, with the web application serving as the immediate implementation and demonstration platform.

## 2. Product Experience

LuLu has two connected modes of operation.

### Ordinary experience

A complete journal/storybook product.

Writing, reading, editing, organisation and retrieval function normally. The privacy engine does not continuously process everything entered into the application.

The ordinary experience should remain useful, approachable and believable on its own.

### Protected experience

A deliberately accessed environment supporting natural writing, intelligent contextual transformation, private associations and retrieval of original meaning.

The product vision includes passkey-based access and the ability to transform existing entries.

The transition between these experiences is an important part of the product's interaction design.

The longer-term vision also includes a reusable privacy capability within the broader KHÔRA ecosystem. The immediate implementation remains focused on LuLu.

## 3. Frontend Design Direction

We have moved into frontend design exploration using Lovable/v0.

The immediate frontend is **mobile-first**, delivered through the web and conceived with future iOS and Android applications in mind.

Our recent design references establish a more neutral and broadly welcoming visual direction than the earlier pearlescent explorations.

### Preferred visual character

- Predominantly black, white and carefully balanced greys.
- Typography-led hierarchy and refined editorial composition.
- Strong spatial rhythm, alignment and proportion.
- Minimalism achieved through restraint and deliberate control.
- Playful but mature tactile interactions.
- Subtle depth, shadow and material qualities where appropriate.
- Cohesive component styling and thoughtfully designed interaction states.
- Distinctive composition rather than generic dashboard conventions.

The references include Swiss-inspired editorial layouts, restrained mobile interfaces, neo-skeuomorphic component kits, literary journal treatments and refined reading interfaces.

The desired outcome is a cohesive, recognisable product design system with substantial attention to typography, geometry and component craftsmanship.

### Inclusivity and language

LuLu should welcome users across age groups, genders and backgrounds.

The frontend should accommodate multilingual use, including South African languages, and support different linguistic expressions and writing conventions.

### Appearance themes

We explored softer, pearlescent designs earlier.

Those remain interesting as optional themes that a user could select during onboarding or later in settings.

The **neutral monochrome direction is the current foundational design exploration**, while alternative themes can share the same underlying interface and interaction system.

### Design status

The visual references and neutral UI kits are explorations, not final specifications.

Lovable/v0 is being used to develop the frontend through its own design capabilities.

Once its implementation is available, inspect the actual result and use that as the basis for continued frontend integration.

## 4. Logo and Brand Identity

We have also completed an initial round of LuLu logotype exploration.

The existing generic serif wordmark is being reconsidered.

### Preferred direction: Logo Exploration 02

The leading direction is a **rounded, geometric LuLu logotype**.

Its appeal lies in the balance of:

- Minimalism and distinctive character.
- Neutrality and approachable playfulness.
- Clean construction and expressive letterform geometry.
- Strong recognisability without decorative excess.

The letterforms themselves provide personality.

This is the preferred direction for further refinement, rather than an approved final logo.

### Secondary direction: Logo Exploration 04

A quieter, minimalist sans-serif approach was the second preference.

It offers a more restrained typographic character and can inform the refinement of the preferred direction.

### Brand development sequence

The logotype is currently in the exploration and refinement stage.

Once the chosen lettering has been refined and approved, the broader brand kit can be developed around it, including typography, application icon, materials, spacing and identity applications.

The UI design system and brand identity should eventually form a cohesive whole.

## 5. Existing Engineering Context

LuLu is being developed alongside the existing Confessions infrastructure.

Confessions already has relevant Firebase configuration and implemented privacy/identity work that the workspace can inspect.

### Firebase

The existing Firebase project is on the **Blaze plan, with usage currently kept within the no-cost allowances**.

This is an important distinction.

The project already has configured infrastructure, so development should proceed with awareness of what exists rather than assuming a new backend must be created.

The intention is to share relevant infrastructure and capabilities while maintaining appropriate application boundaries.

The workspace should inspect the actual existing configuration and implementation to determine how best to integrate LuLu.

### OpenAI

OpenAI API credits are already available.

The project has explored the OpenAI Decisions API as an independently integrated decision-processing capability.

The privacy architecture envisages processing on the user's device, with external decision services playing a distinct role.

The objective is to develop a working product efficiently while allowing the agent to research and determine the technical implementation.

### Existing project context

The earlier Confessions privacy work, including passkey-based identity and device/account synchronisation, is relevant to LuLu.

The workspace should draw on the actual existing implementation and project knowledge rather than reconstructing those capabilities from assumptions.

## 6. Development Priorities

The immediate priority is to make meaningful progress towards a functioning LuLu application.

The frontend design work and existing backend infrastructure should converge into a coherent working product.

Prioritise the experiences that demonstrate what LuLu does:

1. Ordinary journal/storybook functionality.
2. Deliberate entry into protected writing.
3. Contextual and narrative transformation.
4. Observable recognition feedback and natural correction.
5. Continuity of aliases, contextual references and original meaning.
6. Integration with the existing infrastructure.

The workspace agent retains responsibility for investigating technical approaches, making detailed engineering decisions and implementing the solution.

This handoff expresses product intentions and design direction. It is not intended to pre-empt the agent's research with speculative constraints or unnecessary architectural prescriptions.

Maintain momentum through implementation and tangible results.

## 7. How to Use the Attached Design Material

The accompanying references include:

- Neutral monochrome design-system explorations.
- Earlier softer and pearlescent alternative themes.
- Logotype exploration sheets, particularly Directions 02 and 04.
- The frontend generated through Lovable/v0, when available.

Use these materials according to their current status.

The logotype is a preferred direction awaiting refinement.

The UI kits are exploratory visual references.

The Lovable/v0 frontend will become a concrete implementation reference once selected and reviewed.

## 8. Guiding Vision

LuLu combines the familiarity of an ordinary personal writing application with an intelligent, discreet private narrative experience.

Its intelligence allows people to write naturally while the application creates coherent alternative representations, including contextual identity changes and narrative distancing.

Its visual identity should be neutral, welcoming, distinctive and playful through considered design rather than decorative excess.

Its implementation should build on existing project capabilities and make efficient use of available infrastructure and credits.

**Continue the existing development process with this updated product, design and brand context, using your engineering expertise to turn the vision into a functioning application.**