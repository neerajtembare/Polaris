# CyTrust — Decisions & Standards

**Created:** March 2, 2026  
**Status:** Active — all new development must follow these decisions

---

## Architecture Decisions

| # | Decision | Choice | Rationale | Date |
|---|----------|--------|-----------|------|
| 1 | UI Framework | **React Bootstrap + Recharts** | ~50KB vs MUI ~300KB+, proven in Port Scanner, simpler API, clean professional look | Mar 2, 2026 |
| 2 | Work Approach | **Tool-by-tool, vertical** | Complete each tool (backend → frontend → cleanup → test) before moving to next | Mar 2, 2026 |
| 3 | Dev Workflow | **Local-first, Docker for integration** | nodemon gives sub-second reload vs 30-60s Docker rebuilds | Mar 2, 2026 |
| 4 | File Structure | **Per-tool directories** | Isolate each tool, share only true utilities | Mar 2, 2026 |
| 5 | Async Pattern | **Shared jobManager utility** | Extract Port Scanner's Map-based job pattern for reuse | Mar 2, 2026 |
| 6 | FACT Firmware | **Separate Docker container, deferred** | 50GB+ disk, HTML-scraping needs full rewrite | Mar 2, 2026 |
| 7 | Prowler / Cloud CLIs | **Separate container, deferred** | Keep backend image lean (~1GB vs ~4GB+) | Mar 2, 2026 |
| 8 | Auth System | **Bypassed until pre-production** | Focus on tool functionality first | Mar 2, 2026 |
| 9 | Dep Scanner + Cert-C | **Remove entirely** | Dep scanner has exposed API key; Cert-C has unclear value | Mar 2, 2026 |
| 10 | Charting Library | **Recharts only** | Remove chart.js / react-chartjs-2 after migration | Mar 2, 2026 |
| 11 | Icon Library | **react-icons only** | Covers FontAwesome, Material, Feather, etc. in one package. Remove @fortawesome, lucide-react, @mui/icons-material | Mar 2, 2026 |
| 12 | State Management | **useState/useEffect hooks** | No Redux, no Context API (except future auth). Keep it simple | Mar 2, 2026 |
| 13 | API Calls | **axios** | Already used everywhere, consistent with Port Scanner | Mar 2, 2026 |
| 14 | Database Driver | **Mongoose only** | Eliminate dual-driver pattern (Mongoose + native MongoClient) | Mar 2, 2026 |
| 15 | CSS Approach | **Dedicated .css files + Bootstrap classes** | No inline styles, no CSS-in-JS, no Tailwind | Mar 2, 2026 |
| 16 | Dependencies | **Audit & update per-tool** | Run `npm audit` + `npm outdated` when reworking each tool. Fix vulnerabilities and replace unmaintained packages inline — don't defer | Mar 2, 2026 |

---

## Forbidden Libraries & Patterns

These MUST NOT be used in any new code. Existing usage will be removed as each tool is reworked.

### Forbidden UI Libraries
- `@mui/material` — too heavy, inconsistent with Bootstrap
- `@mui/icons-material` — use `react-icons` instead
- `@emotion/react`, `@emotion/styled` — MUI dependency, not needed
- `antd` (Ant Design) — not in project, keep it that way
- `chakra-ui` — not in project, keep it that way
- Tailwind CSS — conflicts with Bootstrap

### Forbidden Patterns
- **Inline styles** — use CSS classes instead of `style={{ ... }}`
- **CSS-in-JS** — no `styled()`, no `sx` prop, no `makeStyles()`
- **Mixed UI libraries** — every component must use React Bootstrap exclusively
- **Native MongoDB driver** for new code — use Mongoose
- **`spawnSync`** — blocks the event loop, always use async `spawn`
- **Hardcoded URLs** — always use centralized config (`frontend/src/config/api.js`)
- **Hardcoded secrets** — use `process.env` for API keys, JWT secrets, passwords
- **String interpolation in shell commands** — use spawn argument arrays
- **Outdated/vulnerable packages** — never leave a known-vulnerable dep in place when reworking a tool; update or replace it immediately

---

## Tool Priority Order

Work on tools in this order (easiest/most-working first):

| Order | Tool | Estimated Days | Status |
|:-----:|------|:--------------:|--------|
| 0 | Foundation (config, startup script, backend fixes) | 1-2 | Not started |
| 1 | Port Scanner | 0.5 | Not started |
| 2 | SBOM Generator | 1 | Not started |
| 3 | Certificate Scanner | 1 | Not started |
| 4 | Shodan | 1-2 | Not started |
| 5 | Web Scanner (Wapiti) | 3-4 | Not started |
| 6 | OS Scanner (LinEnum) | 2-3 | Not started |
| 7 | Script Execution + Devices | 3-4 | Not started |
| 8 | Cloud Scanner (Prowler) | 4-5 | Not started |
| 9 | FACT Firmware | 4-5 | Not started |
| 10 | Cleanup & Removal | 1 | Not started |

---

## Version Control Strategy

- Each tool = one or more focused commits
- Commit message format: `[ToolName] description of change`
  - Example: `[WebScanner] Convert MUI to Bootstrap, add async job tracking`
  - Example: `[Foundation] Create centralized API config, startup script`
- Never commit broken tools — each commit should be a working state
- Tag milestones: `v0.1-foundation`, `v0.2-port-scanner`, etc.
