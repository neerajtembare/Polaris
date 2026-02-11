# Project Polaris — Architecture Decision Log (ADL)

## Purpose

This document records major architectural decisions made during Polaris development.

Each decision includes:

- Context
- Decision
- Rationale
- Consequences
- Future Revisit Conditions

The goal is to prevent architectural drift and preserve reasoning over time.

---

# ADR-001: Backend Technology

## Context

Polaris requires:

- Structured architecture
- Clear separation of layers
- AI integration capability
- Local-first execution
- Future SaaS potential

## Decision

Use Node.js backend with structured Express-style architecture.

## Rationale

- Strong ecosystem.
- Clean REST API design.
- Flexible migration to cloud later.
- Clear separation of controllers/services/repositories.
- JavaScript consistency with frontend.

## Consequences

- Must manage async patterns carefully.
- Need strict schema validation for AI outputs.
- Must avoid event loop blocking.

## Revisit If

- AI orchestration becomes significantly complex.
- Python ML ecosystem becomes required.

---

# ADR-002: Database Choice (MVP)

## Context

Single-user local-first system.

## Decision

Use SQLite for MVP.

## Rationale

- Zero configuration.
- File-based simplicity.
- Suitable for single-user local usage.
- Easy migration to Postgres later.
- ACID compliance.

## Consequences

- Limited concurrency.
- Not suitable for multi-user scaling.
- Must implement log compaction to prevent file growth.

## Revisit If

- Cloud sync implemented.
- Multi-device concurrent writes required.

---

# ADR-003: Relational Model Over Document Model

## Context

System involves hierarchical goals, task relationships, logs, analytics.

## Decision

Use relational schema with explicit tables.

## Rationale

- Strong referential integrity.
- Efficient rollup queries.
- Clear migration path.
- Easier analytical queries.

## Consequences

- Requires migrations.
- Slightly more rigid than document store.

## Revisit If

- Highly dynamic schema needed.
- Plugin system requires document-heavy storage.

---

# ADR-004: Soft Delete Policy

## Context

Polaris generates behavioral dataset over time.

## Decision

Implement soft delete via is_deleted flag.

## Rationale

- Preserve historical analysis.
- Allow restore functionality.
- Maintain data integrity.
- Prevent accidental data loss.

## Consequences

- Queries must always filter is_deleted.
- Database grows slightly larger.

## Revisit If

- Storage constraints require aggressive pruning.

---

# ADR-005: AI Invocation Model

## Context

AI could be automatic or manual.

## Decision

AI is manual-trigger only (MVP).

## Rationale

- Prevent user irritation.
- Avoid performance unpredictability.
- Maintain deterministic core.
- Simplify orchestration logic.

## Consequences

- Less “magical” UX.
- Requires user engagement.

## Revisit If

- AI reliability proven.
- Performance optimized.
- User desires proactive suggestions.

---

# ADR-006: AI as Suggestion Layer

## Context

AI can theoretically modify database.

## Decision

AI cannot directly mutate state.

User confirmation required before DB writes.

## Rationale

- Prevent hallucination damage.
- Maintain system integrity.
- Improve testability.
- Reduce AI coupling.

## Consequences

- Slightly more UX steps.
- Requires preview modal.

## Revisit If

- Confidence scoring becomes reliable.

---

# ADR-007: Layered Backend Architecture

## Context

Need maintainable, scalable backend.

## Decision

Use structured layers:

Routes → Controllers → Services → Repositories → DB

## Rationale

- Separation of concerns.
- Easier testing.
- Scalable design.
- Resume-grade architecture.

## Consequences

- Slight overhead in boilerplate.
- Requires discipline.

## Revisit If

- Project scope drastically shrinks.

---

# ADR-008: Event Logging System

## Context

Behavioral dataset is core differentiator.

## Decision

Implement append-only event log table.

## Rationale

- Enables AI analysis.
- Enables behavioral tracking.
- Provides audit trail.

## Consequences

- DB growth.
- Requires compaction strategy.

## Revisit If

- Log storage becomes heavy.

---

# ADR-009: No Auto-Recurring Engine (MVP)

## Context

Recurring tasks add complexity.

## Decision

No automatic recurring system in MVP.

## Rationale

- Reduce scope.
- Avoid edge-case explosion.
- Keep deterministic system simple.

## Consequences

- Manual duplication required.
- Slight UX friction.

## Revisit If

- Core stable and demand arises.

---

# ADR-010: Local-First Constraint

## Context

Privacy and independence are key values.

## Decision

MVP must work fully offline.

## Rationale

- Full data sovereignty.
- No cloud cost.
- No API dependency.

## Consequences

- AI limited by local hardware.
- No multi-device sync initially.

## Revisit If

- SaaS pivot pursued.

---

# ADR-011: Insight Persistence

## Context

AI analysis may evolve over time.

## Decision

Persist raw prompt + raw response + parsed output.

## Rationale

- Enables reproducibility.
- Enables model comparison.
- Enables prompt refinement.
- Enables longitudinal behavior tracking.

## Consequences

- Slight DB growth.
- Requires storage discipline.

## Revisit If

- Storage constraints extreme.

---

# ADR-012: Flexible Milestone-Based Development

## Context

Project is personal but serious.

## Decision

Use milestone-based roadmap instead of time-based.

## Rationale

- Quality over speed.
- Prevent burnout.
- Maintain architectural integrity.

## Consequences

- Slower visible progress.
- Requires discipline.

---

# Final Note

The Architecture Decision Log is a living document.

New ADR entries must be added when:

- Changing database engine
- Introducing sync
- Introducing auth
- Changing AI invocation model
- Modifying core hierarchy design

Polaris evolves through explicit decisions, not silent drift.
