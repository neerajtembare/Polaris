# Polaris — GitHub Copilot Instructions

This file is automatically read by GitHub Copilot. Follow these rules for all code generation.

## Project Identity

Polaris is a **personal activity tracker with AI coaching potential**.
- NOT a todo app
- NOT a habit tracker  
- Activities contribute TOWARD goals with accumulated values

## Tech Stack (Non-Negotiable)

| Layer | Technology | Notes |
|-------|------------|-------|
| Backend | Node.js + TypeScript + **Fastify** | NOT Express |
| ORM | **Prisma** | NOT Knex, NOT raw SQL |
| Database | SQLite | Local-first |
| Frontend | React + TypeScript + Vite | NOT Next.js |
| State | TanStack Query + Zustand | NOT Redux |
| Styling | Tailwind CSS | NOT styled-components |

## Directory Structure

```
polaris/
├── apps/
│   ├── backend/           # Fastify API
│   │   ├── src/
│   │   │   ├── routes/    # Route definitions
│   │   │   ├── controllers/
│   │   │   ├── services/  # Business logic
│   │   │   ├── lib/       # Prisma client
│   │   │   └── types/
│   │   └── prisma/        # Schema + migrations
│   └── frontend/          # React app
│       └── src/
│           ├── components/
│           ├── pages/
│           ├── hooks/
│           ├── services/
│           └── stores/
└── packages/
    └── shared/            # Shared types
```

## Coding Standards

### TypeScript
- Strict mode enabled
- No `any` types (use `unknown` if needed)
- Prefer interfaces over types for objects
- Export types from dedicated type files

### Naming Conventions
```typescript
// Files: kebab-case
goal.service.ts
activity.controller.ts
use-goals.ts

// Functions/Variables: camelCase
const goalService = new GoalService();
function calculateProgress() {}

// Types/Interfaces/Classes: PascalCase
interface Goal {}
class GoalService {}
type ActivityType = 'quantity' | 'duration' | 'completion';

// Constants: SCREAMING_SNAKE_CASE
const MAX_RETRY_COUNT = 3;
const DEFAULT_PAGE_SIZE = 20;
```

### Fastify Routes
```typescript
// Always use async handlers
// Always use schema validation
// Always return typed responses

app.post<{ Body: CreateGoalInput; Reply: GoalResponse }>(
  '/goals',
  { schema: createGoalSchema },
  async (request, reply) => {
    const goal = await goalService.create(request.body);
    return reply.status(201).send({ success: true, data: goal });
  }
);
```

### Prisma Usage
```typescript
// Always use Prisma Client, never raw SQL
// Always filter soft-deleted records
// Always include necessary relations

const goals = await prisma.goal.findMany({
  where: { isDeleted: false },
  include: { activities: true },
  orderBy: { createdAt: 'desc' }
});
```

### React Components
```typescript
// Functional components only
// Props interface above component
// Destructure props in signature

interface GoalCardProps {
  goal: Goal;
  onEdit: (id: string) => void;
}

export function GoalCard({ goal, onEdit }: GoalCardProps) {
  // Component logic
}
```

## MUST DO

- [ ] Add file header comment explaining purpose
- [ ] Add JSDoc to exported functions
- [ ] Use Zod for validation schemas
- [ ] Handle errors explicitly (never swallow)
- [ ] Log errors before throwing
- [ ] Use `date-fns` for date operations
- [ ] Include `is_deleted: false` in all queries

## MUST NOT DO

- [ ] Don't use `any` type
- [ ] Don't use `var` (use `const` or `let`)
- [ ] Don't mutate state directly
- [ ] Don't write raw SQL
- [ ] Don't skip validation
- [ ] Don't hardcode URLs or secrets
- [ ] Don't add features not in scope
- [ ] Don't change existing patterns without reason
- [ ] Don't install new dependencies without asking

## Response Format (API)

```typescript
// Success
{ success: true, data: T }

// Success with pagination
{ success: true, data: T[], meta: { total, page, limit } }

// Error
{ success: false, error: { code: string, message: string, details?: object } }
```

## File Header Template

Every new file should start with:

```typescript
/**
 * @file [filename]
 * @description [Brief description of what this file does]
 * @module [module path]
 * 
 * @dependencies
 * - [List key dependencies]
 * 
 * @relatedFiles
 * - [List related files]
 */
```

## Before You Code

1. Check if similar code exists (don't duplicate)
2. Read the relevant documentation
3. Understand the data model
4. Plan the implementation approach
5. Ask if scope is unclear

## Phase Awareness

Current phase: **Phase 0/1 (Foundation + MVP)**

**Default landing page:** Dashboard

Do NOT implement:
- AI features (Phase 3)
- Recurrence system (Phase 3)
- Pattern detection (Phase 4)
- Cloud sync (Phase 5)

## Source of Truth Hierarchy

When documents conflict, higher-ranked wins:
1. `.github/copilot-instructions.md` — enforced by tooling
2. `10_api_contract.md` — definitive API spec
3. `04_data_model.md` — definitive schema
4. `12_implementation_checklist.md` — build plan
5. `03_sdd.md` — architecture reference
6. All other docs — context/strategy

## Documentation References

Before implementing, read:
- `12_implementation_checklist.md` - What to build
- `04_data_model.md` - Database schema
- `10_api_contract.md` - API specifications
- `03_sdd.md` - Architecture details
