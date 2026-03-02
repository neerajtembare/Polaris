# Polaris — Quick Start Prompts

Copy-paste these prompts to start AI sessions effectively.

---

## New Session Initializer

Use this at the start of every coding session:

```markdown
# Polaris Development Session

## Context Load
Read these files to understand the project:
1. `.github/copilot-instructions.md` - Project rules (MUST READ)
2. `SESSION_STATE.md` - Current progress
3. `12_implementation_checklist.md` - Task list

## Current Status
[Copy from SESSION_STATE.md]

## This Session Goals
- [ ] [Specific task 1]
- [ ] [Specific task 2]

## Rules Reminder
- Plan before coding
- Add file headers and JSDoc comments
- Follow existing patterns
- Update checklist when done
- Commit after each logical unit

Please confirm you understand the context and scope before we proceed.
```

---

## Task Implementation Prompt

Use this when starting a specific feature:

```markdown
## Task: [Feature Name]

### Reference Docs
- Checklist item: [X.Y.Z from 12_implementation_checklist.md]
- API spec: [relevant section from 10_api_contract.md]
- Data model: [relevant section from 04_data_model.md]

### Requirements
[Paste requirements from checklist]

### Instructions
1. Output your implementation plan FIRST
2. Wait for my approval
3. Implement with proper comments
4. Show verification checklist when done
5. Update 12_implementation_checklist.md

Do NOT start coding until I approve the plan.
```

---

## Context Recovery Prompt

Use when AI seems to lose track:

```markdown
STOP - Context seems lost.

Please re-read these files:
1. `.github/copilot-instructions.md`
2. `SESSION_STATE.md`

Then answer:
1. What project is this?
2. What tech stack are we using?
3. What phase are we in?
4. What were we working on?

Do not continue until you confirm understanding.
```

---

## End Session Prompt

Use at the end of every session:

```markdown
## Session Wrap-Up

Please provide:

### Summary
- What was completed
- What files were created/modified
- Any deviations from plan

### Checklist Updates
- Which items should be marked complete

### SESSION_STATE.md Updates
- New session log entry
- Any new active decisions
- Updated current progress

### Next Session Should
- [ ] First priority
- [ ] Second priority
- [ ] Any blockers to address

### Commit Messages
Suggest commit message(s) for this session's work.
```

---

## Debugging Prompt

Use when something isn't working:

```markdown
## Debug Session

### Problem
[Describe what's wrong]

### Expected Behavior
[What should happen]

### Actual Behavior
[What's happening]

### Already Tried
[What you've attempted]

### Relevant Files
[List files that might be involved]

---

Please:
1. Analyze the likely cause
2. Propose a fix with explanation
3. Show exactly what to change
4. Explain why this fixes it

Do NOT make changes until I approve.
```

---

## Code Review Prompt

Use to have AI review existing code:

```markdown
## Code Review Request

### File(s) to Review
[List files]

### Focus Areas
- [ ] Following project conventions
- [ ] Error handling
- [ ] Type safety
- [ ] Performance concerns
- [ ] Security issues
- [ ] Missing edge cases

### Questions
[Any specific concerns]

Please review and provide:
1. Issues found (with severity)
2. Suggested improvements
3. Good patterns worth keeping
```

---

## Refactoring Prompt

Use when improving existing code:

```markdown
## Refactoring Task

### Target
[File or function to refactor]

### Reason
[Why refactoring is needed]

### Constraints
- Keep public API unchanged
- Maintain all existing functionality
- Add tests if missing

### Instructions
1. Show current issues
2. Propose refactoring approach
3. Get approval
4. Implement incrementally
5. Verify behavior unchanged
```

---

## Quick Commands

Single-line prompts for common needs:

```
"Show me the implementation plan for [feature]"

"What's the current status of milestone [X.Y]?"

"Review [file] for project convention compliance"

"Add proper JSDoc comments to [file]"

"What should I work on next according to the checklist?"

"Summarize what we did this session"

"What files would need to change for [feature]?"

"Is [approach] aligned with the project architecture?"
```

---

## Emergency Reset

When things go completely wrong:

```markdown
## Full Reset

Something went wrong. Let's reset.

1. Please forget our previous conversation context
2. Read `.github/copilot-instructions.md` fresh
3. Read `SESSION_STATE.md` for current progress
4. Tell me what you understand about:
   - The project (Polaris)
   - The tech stack
   - Current phase and status
5. DO NOT make any changes until we re-establish context

This is a clean slate. Let's be methodical.
```
