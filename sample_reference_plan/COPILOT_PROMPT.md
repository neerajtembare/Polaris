# CyTrust — Tool Rework Prompt

**Copy this prompt and replace `[TOOL_NAME]` before feeding it to Copilot.**

---

## The Prompt

```
I'm working on the CyTrust cybersecurity platform. I need to rework the **[TOOL_NAME]** tool to make it production-ready, bug-free, and consistent with the project's standards.

## Project Context

CyTrust is a Docker-based cybersecurity tool suite with:
- **Backend:** Node.js + Express on port 5001, Python 3.10 base image
- **Frontend:** React 18 SPA on port 3000
- **Database:** MongoDB 6 (database name: "CyTrust")
- **Docker:** 3 services (backend, frontend, mongo)

## Standards & Plan Files

Before making ANY changes, read these files in `/Plan/` for standards and context:

1. **Plan/DECISIONS.md** — What libraries/patterns to use and what's forbidden. READ THIS FIRST.
2. **Plan/TOOL_TEMPLATE.md** — Copy-paste code templates for backend (controller, routes, model) and frontend (router, pages, CSS). Follow these patterns exactly.
3. **Plan/EXECUTION_PLAN.md** — The per-tool checklist and priority order. Find [TOOL_NAME] and follow its specific checklist.
4. **Plan/DIRECTORY_STRUCTURE.md** — Target file/folder layout. Each tool gets its own directory on both backend and frontend.
5. **Plan/ERROR_HANDLING_GUIDE.md** — HTTP status codes, error response shapes, try/catch patterns.
6. **Plan/DATA_STORAGE_GUIDE.md** — Mongoose schema conventions, collection naming, data flow.
7. **Plan/NAMING_CONVENTIONS.md** — File names, variables, routes, CSS classes, git commits.
8. **Plan/ENVIRONMENT_AND_DEPLOYMENT.md** — Local vs Docker differences, environment variables, file paths, external tool dependencies.

## Per-Tool Checklist (follow this order)

1. **Read the Plan files** listed above to understand the standards
2. **Analyze the current state** — read all existing files for [TOOL_NAME] (controller, routes, model, frontend components) and identify every bug, hardcoded URL, security issue, and deviation from standards
3. **Backend logic** — fix bugs, add async job tracking if missing (use jobManager pattern from TOOL_TEMPLATE.md), fix security issues (command injection, path traversal, hardcoded secrets), convert spawnSync → spawn
4. **Move to per-tool directory** — co-locate controller + routes + model + support files into `backend/[toolName]/`, update server.js imports
5. **Frontend** — convert MUI → React Bootstrap (if this tool uses MUI), replace ALL hardcoded `localhost:5001` URLs with `import { API_URL } from '../../config'`, structure as `components/[ToolName]/` directory with Router + Pages pattern
6. **Dependency audit** — run `npm audit` and `npm outdated`, update/replace any vulnerable or outdated packages used by this tool
7. **Cleanup** — remove dead code, backup files, commented-out blocks, unused imports
8. **Test locally** — verify full workflow works with `npm start` on both backend and frontend
9. **Test in Docker** — verify full workflow works with `docker-compose up`

## Critical Rules

- **UI:** React Bootstrap + Recharts ONLY. No MUI, no chart.js, no Ant Design.
- **Icons:** react-icons ONLY. No @fortawesome, no lucide-react, no @mui/icons-material.
- **URLs:** NEVER hardcode localhost. Always `import { API_URL } from '../../config'`
- **Async:** NEVER use spawnSync. Use spawn with async job tracking (Map-based pattern).
- **Security:** NEVER interpolate user input into shell commands. Use spawn with argument arrays. NEVER hardcode API keys or secrets.
- **Database:** Mongoose only. No native MongoClient. Explicit collection names as 3rd arg.
- **CSS:** Dedicated .css files + Bootstrap classes. No inline styles, no CSS-in-JS.
- **Errors:** Always wrap async controller functions in try/catch. Return consistent JSON: `{ success, data/error, message }`.
- **File structure:** Backend = `backend/[toolName]/` directory. Frontend = `frontend/src/components/[ToolName]/` directory.

## Gold Standard Reference

The **Port Scanner** is the reference implementation:
- Backend: `backend/controllers/scanController.js` — async job Map, spawn pattern, proper error handling
- Frontend: `frontend/src/components/PortScanner/` — Router + Pages, React Bootstrap, proper config imports

Study Port Scanner's patterns and replicate them for [TOOL_NAME].

## What to Report

After completing the rework, provide:
1. List of files created/modified/deleted
2. Bugs fixed (with before/after)
3. Security issues resolved
4. Any remaining issues or concerns
5. Testing instructions for both local and Docker
```

---

## Quick-Reference: Tool Names

Replace `[TOOL_NAME]` with the actual tool name from this list:

| Tool | Backend Location (current) | Frontend Location (current) |
|------|---------------------------|----------------------------|
| Port Scanner | `controllers/scanController.js` | `components/PortScanner/` |
| SBOM Generator | `Sbom_Generator/` | `components/SBOMGenerator/` |
| Certificate Scanner | `CertScanner/` + `controllers/certScannerController.js` | `components/CertScanner/` |
| Shodan | `controllers/shodanController.js` | `components/shodan.js` + `ShodanResults.js` |
| Web Scanner | `controllers/webscannerController.js` | `components/WebScanResults.js` + others |
| OS Scanner | `controllers/linEnumController.js` | `components/OSScanner.js` + `LinEnum/` |
| Script Execution | `controllers/executionController.js` + `scriptController.js` | `components/ScriptExecution*.js` |
| Cloud Scanner | `controllers/cloudscancontroller.js` | `components/CloudScanner*.js` |
| FACT Firmware | `controllers/factController.js` | `components/FACT*.js` |
| Device Manager | `controllers/deviceController.js` | `components/AddDevices.js` + `ShowDevices.js` |

---

## Usage Tips

1. **One tool at a time** — don't try to fix multiple tools in one session
2. **Start with the Plan files** — make Copilot read them before touching any code
3. **Verify the current state first** — have Copilot list all files for the tool and identify issues before writing code
4. **Incremental commits** — commit after each tool is fully working
5. **If something is unclear** — the Plan files are the source of truth; ask Copilot to re-read the specific Plan file
