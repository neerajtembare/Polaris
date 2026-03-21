# Polaris — AI Development Protocol

## Purpose

This document defines **how** to work with AI assistants (GitHub Copilot, Claude, etc.) to implement Polaris. Follow this protocol to prevent context loss, ensure consistency, and maintain quality.

---

# Session Protocol

## Starting a New Session

Every coding session should begin with context establishment:

### Step 1: State Current Progress

```markdown
Current Status:
- Phase: [0/1/2/3]
- Last completed: [milestone number and name]
- Currently working on: [specific task]
- Blockers: [any issues]
```

### Step 2: Load Context

Ask the AI to read these files (in order):
1. `.github/copilot-instructions.md` - Project rules
2. `12_implementation_checklist.md` - What to build
3. Relevant section of `04_data_model.md` - If touching database
4. Relevant section of `10_api_contract.md` - If building API

### Source of Truth Hierarchy

When documents conflict, higher-ranked wins:
1. `.github/copilot-instructions.md` — enforced by tooling
2. `10_api_contract.md` — definitive API spec
3. `04_data_model.md` — definitive schema
4. `12_implementation_checklist.md` — build plan
5. `03_sdd.md` — architecture reference
6. All other docs — context/strategy

### Step 3: Define Session Scope

Be explicit about what you want:

```markdown
This session scope:
- [ ] Task 1: [specific deliverable]
- [ ] Task 2: [specific deliverable]

NOT in scope:
- [Things to avoid]
```

### Step 4: Confirm Understanding

Ask AI to summarize:
- What it will build
- What files it will create/modify
- What approach it will take

Only proceed if summary is correct.

---

# Implementation Protocol

## For Each Feature/Task

### Phase 1: Plan (Before Coding)

AI must output:

```markdown
## Implementation Plan: [Feature Name]

### What I'm Building
[1-2 sentence description]

### Files to Create
- `path/to/file.ts` - [purpose]
- `path/to/file.ts` - [purpose]

### Files to Modify
- `path/to/file.ts` - [what changes]

### Dependencies Required
- [dependency] - [why needed]

### Approach
1. [Step 1]
2. [Step 2]
3. [Step 3]

### Potential Risks
- [Risk 1 and mitigation]

### Questions (if any)
- [Clarifying question]
```

**Do not proceed to coding until plan is approved.**

### Phase 2: Implement (With Comments)

Every file should have:

```typescript
/**
 * @file goal.service.ts
 * @description Handles all goal-related business logic including CRUD,
 *              progress calculation, and event logging.
 * 
 * @implements
 * - Goal creation with validation
 * - Goal updates with event logging
 * - Soft delete
 * - Progress calculation from activities
 * 
 * @dependencies
 * - prisma: Database client
 * - events.service: Event logging
 * 
 * @usedBy
 * - goal.controller.ts
 * - dashboard.service.ts
 */
```

Every function should have:

```typescript
/**
 * Creates a new goal after validation.
 * 
 * @param data - Goal creation input
 * @returns Created goal with generated ID
 * @throws ValidationError if title is empty
 * 
 * @example
 * const goal = await goalService.create({
 *   title: "Read 12 books",
 *   targetValue: 12,
 *   targetUnit: "books"
 * });
 */
export async function create(data: CreateGoalInput): Promise<Goal> {
  // Implementation
}
```

### Phase 3: Verify (After Coding)

After each implementation:

```markdown
## Verification: [Feature Name]

### Created Files
- [x] `path/to/file.ts` - [status: complete]

### Modified Files
- [x] `path/to/file.ts` - [what changed]

### Tests
- [ ] Compiles without errors
- [ ] Lint passes
- [ ] Manual test: [how to test]

### Checklist Update
- [x] Item X.Y.Z marked complete in 12_implementation_checklist.md

### Next Steps
- [What should be done next]
```

---

# Code Quality Rules

## Mandatory Checks Before Committing

```bash
# Must pass:
npm run typecheck    # No TypeScript errors
npm run lint         # No ESLint errors
npm run build        # Builds successfully
```

## Comment Density Guidelines

| Code Type | Comment Requirement |
|-----------|---------------------|
| Service functions | JSDoc with @param, @returns, @throws |
| Controller handlers | Brief purpose comment |
| Complex logic | Inline comments explaining "why" |
| Type definitions | JSDoc on non-obvious fields |
| Constants | Comment explaining purpose |
| Workarounds | Comment with TODO or reason |

## Inline Comment Style

```typescript
// GOOD: Explains WHY
// Filter out deleted goals because soft delete preserves history
const activeGoals = goals.filter(g => !g.isDeleted);

// BAD: Explains WHAT (obvious from code)
// Filter goals
const activeGoals = goals.filter(g => !g.isDeleted);
```

---

# Recovery Protocol

## When Context is Lost

If AI seems to forget project context:

1. **Stop immediately** - Don't let it continue with wrong assumptions
2. **Re-establish context** - Point to `.github/copilot-instructions.md`
3. **Summarize decisions** - Remind of key decisions made this session
4. **Verify before proceeding** - Ask AI to confirm understanding

## When Stuck or Confused

```markdown
PAUSE: I need clarification on:

1. [Specific question]
2. [Specific question]

Before I proceed, please confirm:
- [Assumption 1]
- [Assumption 2]
```

## When Something Breaks

1. **Don't panic-fix** - Understand what broke first
2. **Git status** - Check what changed
3. **Rollback if needed** - `git checkout -- .` to reset
4. **Fix methodically** - One change at a time

---

# Progress Tracking

## After Each Session

Update `12_implementation_checklist.md`:
- Mark completed items with [x]
- Add notes on any deviations
- Note blockers for next session

## Commit Strategy

```bash
# Commit after each logical unit of work

# Format: type(scope): description
git commit -m "feat(goals): add goal creation service"
git commit -m "fix(activities): handle null goal_id correctly"
git commit -m "refactor(services): extract progress calculation"
git commit -m "docs(readme): update setup instructions"
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code change (no feature/fix)
- `docs`: Documentation
- `style`: Formatting (no code change)
- `test`: Adding tests
- `chore`: Maintenance

---

# AI Behavior Expectations

## AI Should

- Ask clarifying questions before assuming
- Plan before coding
- Implement incrementally (not everything at once)
- Explain decisions that aren't obvious
- Follow existing patterns in codebase
- Stop and ask if scope is unclear
- Add comments as specified
- Update checklist when done

## AI Should NOT

- Implement features outside current scope
- Change architectural decisions without discussion
- Add dependencies without explicit need
- Refactor working code without being asked
- Skip error handling
- Generate placeholder code with TODOs
- Make assumptions about business logic
- Deviate from established patterns

---

# Example Session Transcript

## Good Session

```
USER: Let's implement goal creation. We're in Phase 1, milestone 1.1.

AI: I'll read the context first.

[Reads copilot-instructions.md, implementation checklist, data model]

AI: Implementation Plan:

## Goal Creation

### What I'm Building
Goal creation endpoint with validation and event logging.

### Files to Create
- `src/services/goal.service.ts` - Business logic
- `src/controllers/goal.controller.ts` - HTTP handling
- `src/routes/goals.ts` - Route definitions
- `src/types/goal.ts` - Type definitions

### Approach
1. Define types first
2. Create service with Prisma queries
3. Create controller to handle requests
4. Wire up routes
5. Test with curl

Does this plan look correct?

USER: Yes, proceed.

AI: [Creates files with proper headers and comments]
AI: [Shows verification checklist]
AI: Done. I've marked item 1.1.2 as complete. Next is 1.1.3: Goal controller.
```

## Bad Session (Avoid This)

```
USER: Add goal stuff

AI: [Immediately starts generating code]
AI: [Creates 5 files without explanation]
AI: [Uses Express instead of Fastify]
AI: [Skips validation]
AI: [No comments]
AI: Done!

USER: This is all wrong...
```

---

# Quick Reference Card

## Session Start
```
1. State current progress
2. Load context files
3. Define session scope
4. Confirm AI understanding
```

## Each Task
```
1. Output implementation plan
2. Get approval
3. Implement with comments
4. Verify and update checklist
```

## Session End
```
1. Update checklist
2. Commit with semantic message
3. Note blockers for next session
```

## Emergency Commands
```
"STOP - you're going off track"
"Re-read copilot-instructions.md"
"Summarize what you think we're building"
"Show me your plan before coding"
```
