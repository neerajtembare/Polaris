# Project Polaris — Architecture Decision Log (ADL)

## Purpose

This document records major architectural decisions made during Polaris planning and development.

Each decision includes:

- **Context**: What situation prompted this decision?
- **Decision**: What did we decide?
- **Rationale**: Why this choice over alternatives?
- **Consequences**: What are the tradeoffs?
- **Revisit If**: When should we reconsider?

The goal is to prevent architectural drift and preserve reasoning over time.

---

# ADR-001: Backend Technology

## Context

Polaris requires:
- Structured architecture for maintainability
- Clear separation of concerns
- AI integration capability
- Local-first execution
- Future SaaS potential

## Decision

Use **Node.js + TypeScript + Fastify** with layered architecture.

## Rationale

- **Fastify over Express:**  
  - 5x faster (~75k req/s vs ~15k req/s)
  - First-class TypeScript support
  - Built-in schema validation
  - Native async/await error handling
  - Compatible with most Express middleware via adapters
- Strong ecosystem for web APIs
- TypeScript provides type safety
- JavaScript consistency with React frontend
- Easy migration to cloud later

## Consequences

- Slightly different API patterns than Express
- Some middleware needs fastify adapters
- Must use `@fastify/cors`, `@fastify/helmet` instead of direct express middleware

## Revisit If

- AI orchestration becomes significantly complex (consider Python)
- Performance bottlenecks emerge
- Fastify compatibility issues arise

---

# ADR-002: Database Choice (MVP)

## Context

Single-user local-first system needs persistent storage.

## Decision

Use **SQLite** for MVP.

## Rationale

- Zero configuration
- File-based simplicity
- Suitable for single-user local usage
- Easy to backup (copy file)
- ACID compliant
- Easy migration to PostgreSQL later

## Consequences

- Limited concurrency (acceptable for single-user)
- Must implement log compaction to prevent file growth
- Not suitable for multi-user scaling

## Revisit If

- Cloud sync implemented
- Multi-device concurrent writes required
- Dataset exceeds SQLite practical limits

---

# ADR-002b: ORM Choice (Prisma)

## Context

Need database access layer. Options:
- Raw SQL
- Knex (query builder)
- Prisma (schema-first ORM)
- TypeORM / Sequelize

## Decision

Use **Prisma** for database access.

## Rationale

- **Type safety**: Auto-generated types from schema
- **Schema-first**: Single source of truth for data model
- **Developer experience**: Intuitive query API, excellent autocomplete
- **Migrations**: Auto-generated, declarative
- **Prisma Studio**: Visual database browser for debugging
- **Single codebase**: Schema → types → client all in sync
- **SQLite support**: Full support, easy switch to PostgreSQL

**Why not Knex?**
- Manual type definitions (error-prone)
- More verbose queries
- No schema-first approach
- More SQL knowledge required

## Consequences

- Schema changes require `prisma migrate dev`
- Prisma Client regeneration on schema change
- Slight abstraction overhead (acceptable)
- Learning curve for Prisma-specific patterns

## Revisit If

- Raw SQL performance needed
- Prisma limitations block functionality
- Complex queries require raw SQL escape hatches

---

# ADR-003: Activities vs Tasks

## Context

Original design used "tasks" with checkbox completion. User workflows indicate need for:
- Tracking accumulated progress (not just done/not done)
- Flexible value types (quantity, duration, completion)
- Activity logging (retrospective) not just planning

## Decision

Replace **Tasks** with **Activities** that have flexible value types.

## Rationale

- "Read 20 pages" is a contribution, not a task
- "Saved ₹500" has numeric value that accumulates
- "Studied 1 hour" is duration-based
- "Went for a walk" is completion-only
- This model supports progress tracking toward goals

## Consequences

- More complex data model
- Progress calculation is computed, not stored
- UI must handle multiple activity types

## Revisit If

- Users find the model confusing
- Simple checkbox tasks are frequently needed

---

# ADR-004: Flexible Goal Hierarchy

## Context

Original design enforced 5-level hierarchy: Vision → Year → Month → Week → Day.

User feedback: "Not every goal needs all levels. Sometimes I just want a goal with sub-goals."

## Decision

Use **flexible hierarchy** with optional parent_id instead of rigid levels.

## Rationale

- Not everyone plans at all 5 levels
- Hierarchy depth should be user choice
- `timeframe` becomes a grouping hint, not a structural constraint
- Simpler for users, simpler to implement

## Consequences

- No guaranteed hierarchy structure
- Progress rollup works at any depth
- UI groups by timeframe (long/medium/short) instead of rigid levels

## Revisit If

- Users need more structured hierarchy
- Analytics require consistent levels

---

# ADR-005: Soft Delete Policy

## Context

Polaris generates behavioral dataset over time. Deleting data destroys history.

## Decision

Implement **soft delete** via `is_deleted` flag. Hard delete only for system compaction.

## Rationale

- Preserve historical analysis context
- Allow restore functionality
- Maintain data integrity for AI analysis
- Prevent accidental data loss

## Consequences

- All queries must filter `is_deleted = 0`
- Database grows slightly larger
- Need archive view for deleted items

## Revisit If

- Storage constraints require aggressive pruning
- GDPR/privacy requirements demand hard delete

---

# ADR-006: AI as Suggestion Layer

## Context

AI could theoretically modify database directly.

## Decision

AI **cannot directly mutate state**. User confirmation required before any DB writes.

## Rationale

- Prevent hallucination damage
- Maintain system integrity
- Improve testability
- Reduce AI coupling
- User stays in control

## Consequences

- More UX steps (preview → confirm → save)
- Requires preview modals
- AI endpoints return suggestions, not actions

## Revisit If

- Confidence scoring becomes reliable enough
- User explicitly opts into auto-save

---

# ADR-007: Provider-Agnostic AI Adapter

## Context

User hasn't tested local LLMs yet. Cloud APIs (OpenAI, Claude) have better quality but aren't local-first.

## Decision

Build **provider-agnostic AI adapter** from day 1.

```typescript
interface AIProvider {
  name: string;
  isAvailable(): Promise<boolean>;
  complete(options): Promise<AIResponse>;
}
```

## Rationale

- Start with cloud APIs for faster development
- Swap to Ollama when prompts are validated
- Test with mock provider
- Avoid rewriting AI integration later

## Consequences

- Slight abstraction overhead
- Must maintain multiple adapters
- Configuration complexity

## Revisit If

- Only one provider is ever used
- Abstraction adds no value

---

# ADR-008: Computed Progress (Not Stored)

## Context

Goal progress could be stored in database or computed on demand.

## Decision

Progress is **computed from activities**, not stored in goals table.

## Rationale

- Single source of truth (activities)
- No sync issues between stored progress and actual activities
- AI/user can't accidentally corrupt progress
- Simpler data model

## Consequences

- Every progress display requires calculation
- Need efficient queries for summing activities
- May need caching for large datasets

## Revisit If

- Performance issues with large activity counts
- Need real-time progress updates

---

# ADR-009: Event Sourcing for Behavioral Data

## Context

AI behavioral analysis needs historical context. Simple CRUD loses history.

## Decision

Implement **append-only event log** for all mutations.

## Rationale

- Enables AI pattern detection
- Supports future undo/audit features
- Preserves full history
- Works as training data for AI

## Consequences

- Database growth (need compaction strategy)
- Write overhead on every mutation
- Complex to query for some use cases

## Revisit If

- Storage becomes problematic
- Events aren't used for AI

---

# ADR-010: No Auto-Recurring Engine (MVP)

## Context

Recurring activities add significant complexity (schedules, exceptions, catch-up logic).

## Decision

No automatic recurring system in MVP. Add in Phase 3 as AI-suggested recurrence.

## Rationale

- Reduce scope
- Avoid edge-case explosion
- Let AI detect patterns instead of manual configuration
- Keep deterministic system simple

## Consequences

- Manual duplication required for repeating activities
- Slight UX friction for daily habits

## Revisit If

- Core stable and user demand arises
- AI pattern detection works well

---

# ADR-011: Local-First with Optional Cloud AI

## Context

Privacy is important, but local LLMs may not meet quality bar.

## Decision

Core system is **local-first** (SQLite, no internet required). AI can use cloud or local providers.

## Rationale

- Full data sovereignty
- No cloud cost for core features
- AI quality flexibility
- User chooses privacy vs quality tradeoff

## Consequences

- AI limited by provider choice
- No multi-device sync initially
- Cloud AI requires internet

## Revisit If

- SaaS pivot pursued
- User wants sync

---

# ADR-012: PWA-Ready from Phase 1

## Context

User wants mobile access eventually. Full mobile app is expensive.

## Decision

Build **responsive web app** with PWA foundations from day 1.

## Rationale

- One codebase for desktop and mobile
- Installable on mobile
- Offline capability possible
- Lower cost than native mobile

## Consequences

- Must design responsive from start
- Some mobile features limited (notifications)
- Service worker complexity

## Revisit If

- PWA limitations become blocking
- Native mobile becomes necessary

---

# ADR-013: Layered Backend Architecture

## Context

Need maintainable, testable backend.

## Decision

Use strict layers: **Routes → Controllers → Services → Prisma Client → DB**

No separate Repository layer — Prisma Client already provides type-safe, abstracted database access. Adding a Repository would be unnecessary indirection for a single-database, solo-developer project.

## Rationale

- Separation of concerns
- Each layer testable independently
- Clear responsibilities
- Scalable design
- Prisma Client acts as the data access layer
- Resume-grade architecture

## Consequences

- Boilerplate overhead
- Requires discipline to maintain boundaries

## Revisit If

- Project scope drastically shrinks
- Overhead outweighs benefits

---

# ADR-014: Milestone-Based Development

## Context

Personal project with flexible timeline. Need to maintain momentum and quality.

## Decision

Use **milestone-based roadmap** instead of time-based deadlines.

## Rationale

- Quality over speed
- Prevent burnout
- Maintain architectural integrity
- Each milestone is usable

## Consequences

- Slower visible progress
- Requires discipline
- No external deadlines

## Revisit If

- External deadlines emerge
- Faster delivery needed

---

# ADR-015: Insight Persistence with Full Context

## Context

AI analysis may evolve over time. Need to compare and improve.

## Decision

Persist **raw prompt + raw response + parsed output** for every AI insight.

## Rationale

- Enables reproducibility
- Enables model comparison
- Enables prompt refinement
- Enables longitudinal tracking

## Consequences

- Storage growth
- Requires discipline

## Revisit If

- Storage constraints extreme
- Historical analysis not valuable

---

# ADR-016: TypeScript Throughout

## Context

Need consistent language across stack for solo developer efficiency.

## Decision

Use **TypeScript** for both backend and frontend.

## Rationale

- Type safety catches errors early
- Shared types between frontend/backend
- Better IDE support
- Industry standard

## Consequences

- Compilation step required
- Stricter coding
- Learning curve if unfamiliar

## Revisit If

- TypeScript overhead becomes blocking

---

# Future ADRs

New ADR entries must be added when:

- Changing database engine
- Introducing sync/auth
- Changing AI invocation model
- Modifying core data model
- Adding significant new feature area

---

# ADR Template

```markdown
# ADR-XXX: [Title]

## Context
[What situation prompted this decision?]

## Decision
[What did we decide?]

## Rationale
[Why this choice over alternatives?]

## Consequences
[What are the tradeoffs?]

## Revisit If
[When should we reconsider?]
```

---

**Polaris evolves through explicit decisions, not silent drift.**
