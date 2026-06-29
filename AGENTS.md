# AGENT PHILOSOPHY

This repository is AI-first.

The expectation is that the AI completes features, not plans them.

Do not create placeholder implementations.

Do not create TODO files.

Do not generate empty classes, interfaces, or screens.

Do not leave work for another AI agent unless an external dependency makes completion impossible.

Every task should end with working functionality.

---

# BUILD PRINCIPLES

- Inspect the existing project before making changes.
- Prefer modifying existing code over replacing it.
- Keep the project buildable after every change.
- Complete one feature before beginning another.
- Never intentionally introduce technical debt.
- Reduce duplication whenever encountered.

---

# CLI FIRST

Always use framework tooling before manually writing boilerplate.

Examples include:

- Ionic CLI
- Capacitor CLI
- Rails generators
- npm create
- npm install
- bundle add
- bundle exec
- Android tooling

Never manually recreate something that an official CLI or generator can build.

---

# DEPENDENCIES

Prefer mature, well-maintained open-source libraries.

Do not reinvent functionality that is already solved by stable libraries.

Install dependencies through package managers.

Keep dependencies updated.

Remove unused packages.

---

# CODE QUALITY

Every project must include:

- ESLint
- Prettier
- TypeScript strict mode
- RuboCop (Rails)
- Brakeman (Rails)
- import/order rules
- formatting scripts
- lint scripts

Code must pass all configured linters before considering work complete.

---

# TESTING

Testing is mandatory.

Every feature requires automated tests.

Maintain high code coverage.

Tests should verify behavior rather than implementation.

Run the complete test suite before finishing work.

Failures are fixed immediately rather than ignored.

---

# IMPLEMENTATION STANDARD

Features are considered complete only when they:

- compile
- run
- integrate with the application
- are tested
- pass linting
- pass type checking
- are production quality

Avoid mock implementations unless they are exclusively for automated tests.

---

# MOBILE FIRST

The application targets Ionic + Capacitor.

Design for Android first while keeping the architecture portable.

Optimize for:

- battery usage
- memory usage
- offline operation
- touch interaction
- filesystem performance

---

# SECURITY

Security is a feature.

Default to secure implementations.

Never disable encryption for convenience.

Never store secrets in source code.

Never log sensitive information.

Validate all external input.

---

# PRIVACY

The application is privacy-first.

Shared files remain encrypted during transfer.

Shared strings remain encrypted during transfer.

Only the intended recipient can decrypt shared content.

The Rails API is limited to transient coordination metadata and must not store transferred content.

---

# WORKFLOW

For every task:

1. Inspect the existing project.
2. Generate framework code using CLI tools.
3. Install required dependencies.
4. Implement the feature completely.
5. Integrate with existing code.
6. Add automated tests.
7. Run linting.
8. Run type checking.
9. Run the test suite.
10. Fix all failures before continuing.

Never skip validation.

---

# PROJECT EXPECTATIONS

The repository should always remain in a working state.

New code should improve the project.

Refactor when appropriate.

Remove obsolete code.

Keep documentation synchronized with implementation.

Prefer production-ready solutions over prototypes.

Deliver complete, maintainable, production-quality functionality.
