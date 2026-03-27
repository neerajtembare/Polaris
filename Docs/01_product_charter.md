# Project Polaris — Product Charter

## 1. Vision

Polaris is a **personal activity tracker with AI coaching potential** — a system that bridges the gap between long-term ambitions and daily actions by tracking what you actually do, not just what you plan to do.

Unlike traditional to-do apps that focus on checkboxes, Polaris treats daily activities as **contributions toward meaningful goals**. Whether you're saving money, learning a skill, or building fitness habits, Polaris tracks your consistency, measures your progress, and (eventually) learns your patterns to help you stay on track.

Polaris is not a productivity toy. It is a personal execution system that evolves into an AI-assisted behavioral coach.

---

## 2. Core Problem

There is a structural disconnect between:

- **Long-term ambitions** (save ₹1L this year, learn Python, get fit)
- **Daily actions** (saved ₹500 today, studied 1 hour, walked 5km)
- **Progress visibility** (how am I actually doing?)
- **Behavioral patterns** (when do I succeed? when do I slip?)

Existing tools fail because they:

| Tool Type | Failure Mode |
|-----------|--------------|
| To-do apps | Focus on checkboxes, not accumulated progress |
| Goal trackers | Set goals but don't track daily contributions |
| Habit trackers | Track binary completion, not flexible effort |
| Budget apps | Great for money, but domain-specific |
| AI assistants | Generic advice, no personal context |

Polaris addresses this gap by combining **flexible goal tracking + activity logging + consistency metrics + AI pattern recognition**.

---

## 3. Core Value Proposition (USP)

### 3.1 Activity-Based Progress Tracking

Every daily action contributes to a goal:
- "Saved ₹500" → contributes to "Save ₹10,000 this month"
- "Ran 5km" → contributes to "Run 100km this quarter"
- "Studied Python for 1 hour" → contributes to "Upskill in Python"

Progress is **accumulated and visible**, not just checked off.

### 3.2 Flexible Metrics

Goals aren't always quantifiable. Polaris supports:
- **Quantitative goals**: Save ₹10,000 (target + numeric progress)
- **Time-based goals**: Study 8 hours/week (duration tracking)
- **Consistency goals**: Do yoga daily (days active, streaks)
- **Open-ended goals**: Learn Python (effort tracking, no fixed target)

### 3.3 AI Coaching Layer (Phase 3+)

A **Strategic AI Layer** that:
- Parses natural language input ("I saved ₹500 by skipping lunch")
- Suggests goal categorization for activities
- Detects behavioral patterns ("You save more on weekdays")
- Proposes morning plans based on history
- Identifies habits worth making recurring

The AI assists but **never autonomously controls execution**.

### 3.4 Local-First Architecture

- All core functionality works offline
- Data stored locally (SQLite)
- AI can run locally (Ollama) or via cloud API
- No mandatory cloud dependency
- Full data sovereignty

---

## 4. Product Principles

### 4.1 Activities Over Tasks
- The primary unit is an **activity** (something you did or plan to do)
- Activities have flexible values (duration, quantity, or just "completed")
- Activities accumulate toward goals

### 4.2 Flexible Hierarchy
- Goals can have sub-goals (optional depth)
- No rigid 5-level structure forced on users
- A goal can be long-term, medium-term, or short-term — user decides

### 4.3 Consistency Over Perfection
- Track effort and patterns, not just completion
- "You studied 6 hours this week vs 4 last week" is more useful than "task done/not done"
- Progress includes ups and downs — that's data, not failure

### 4.4 Deterministic Core
- All progress calculations, consistency metrics, and analytics are computed deterministically
- AI only generates suggestions
- AI cannot silently mutate the database

### 4.5 Explicit Acceptance
- All AI-generated actions require user confirmation
- AI suggestions are previewed, not auto-applied

### 4.6 Progressive Intelligence
- **Phase 1-2**: Manual logging and tracking
- **Phase 3**: AI-assisted input parsing and suggestions
- **Phase 4**: AI pattern detection and morning planning
- **Phase 5+**: Learned assistant that knows your rhythms

---

## 5. Target User

**Primary user:**
- Individual pursuing personal growth
- Values tracking progress, not just completing tasks
- Wants to see patterns in their behavior
- Prefers structured systems over ad-hoc notes
- Comfortable with desktop web apps (mobile PWA later)

**User mindset:**
- "I want to see that my daily efforts add up"
- "I want to know when I'm slipping before it's too late"
- "I want an AI that knows MY patterns, not generic advice"

**Not for (MVP):**
- Teams or collaboration use cases
- Users who just need a simple checkbox to-do list
- Users requiring mobile-first experience from day 1

---

## 6. Non-Goals (MVP Scope Boundaries)

Polaris will **NOT** include in MVP:

| Feature | Why Not |
|---------|---------|
| Team collaboration | Solo-first scope |
| Real-time multi-user | Adds complexity without value |
| Social features | Not aligned with private tracking |
| Cloud sync | Local-first core must be stable first |
| Automated recurring tasks | Recurrence is Phase 3+ (AI-suggested) |
| Financial ledger | Inspired by budget tracking, but not a finance app |
| Push notifications | Browser-based MVP limitation |
| Mobile app | PWA readiness built in, but not Phase 1 priority |
| AI features | Phase 3+ only |

---

## 7. Long-Term Potential

Once the core is stable, Polaris can support:

- **PWA for mobile** — log activities on the go
- **AI morning planning** — "Here's what I suggest for today"
- **Pattern detection** — "You always skip workouts on Mondays"
- **Smart recurrence** — "Want me to make this a weekly habit?"
- **Multi-model AI** — swap between local and cloud models
- **Data export/import** — full portability
- **Optional cloud sync** — multi-device access
- **Open-source release** — community-driven features

---

## 8. Success Criteria

Polaris is successful if:

- [ ] Used daily for 30 consecutive days without friction
- [ ] Provides clear visibility into goal progress
- [ ] Accurately tracks consistency metrics (hours, days active)
- [ ] Makes it easy to log activities (< 10 seconds per entry)
- [ ] Shows meaningful patterns in behavior (Phase 3+)
- [ ] Runs reliably without crashes or data loss
- [ ] Architecture supports AI integration when ready

---

## 9. Failure Conditions

Polaris fails if:

- The system becomes overcomplicated to use
- Logging activities feels like a chore
- Progress calculations are confusing or inaccurate
- Core features break frequently
- Scope creep prevents completion of Phase 1-2
- AI integration requires rewriting the core (architecture failure)

---

## 10. Guiding Philosophy

Polaris is not about productivity hacks or gamification.

It is about building a **personal system for intentional living** that:

- Treats daily actions as contributions toward meaningful goals
- Makes progress visible and patterns discoverable
- Uses AI to coach, not to control
- Maintains full ownership over personal data
- Evolves through disciplined, milestone-based engineering

**North Star Question:** "Am I making progress toward what matters?"

Polaris helps you answer that question with data, not just feelings.
