# CyTrust Tool Fix & Deployment Readiness Plan

## Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| UI Library | **React Bootstrap + Recharts** | Lighter (~50KB vs ~300KB), simpler, proven in Port Scanner (gold standard) |
| Work approach | **Tool-by-tool, vertical** | Complete each tool fully before moving to next — testable increments |
| Dev workflow | **Local-first with startup script** | Fast iteration via nodemon, Docker only for integration testing |
| File structure | **Per-tool directories** | Isolate tools, share only utilities (config, jobManager, formatters) |
| Async pattern | **Extract common jobManager** | Reuse Port Scanner's Map-based job pattern for Wapiti, Prowler, etc. |
| FACT | **Separate Docker container, deferred** | Heavy setup overhead, HTML-scraping integration needs full rewrite |
| Prowler / Cloud CLIs | **Separate container, deferred** | Keeps main backend lean (~1GB vs ~4GB+) |
| Auth | **Leave bypassed** until pre-production | Focus on tool functionality first |
| Dep Scanner + Cert-C | **Remove** | Marked for removal, dep scanner has exposed API key |

---

## Current State Summary

### What's Working
- **Port Scanner** — Async job-based, React Bootstrap UI, gold standard ✅
- **SBOM Generator** — Best architecture (service layer pattern), syft in Docker ✅
- **Certificate Scanner** — Multi-engine Python scripts + certigo, mostly working ✅
- **Database** — Unified to CyTrust DB, collections renamed ✅
- **Sidebar** — Clean architecture, 25+ tools accessible ✅

### What's Broken / Needs Work
- **~110 hardcoded `localhost:5001/5000` URLs** across ~45 frontend files — BLOCKER for Docker
- **No `frontend/src/config/` directory**, no `.env` files
- **21 files use MUI**, 20 use Bootstrap — inconsistent UI
- **3 icon libraries** + **2 charting libraries** — bloat
- **Web Scanner** — Runs Wapiti twice (JSON + HTML), no async, command injection risk
- **Cloud Scanner** — `spawnSync` blocks entire server, wrong path (`backend/backend/output`), no CLIs in Docker
- **FACT Firmware** — URL points to itself (port 5001), HTML scraping, service commented out
- **OS Scanner** — 50% commented-out code, stderr marks execution as "Failed"
- **Script Execution** — Command injection, path traversal, plaintext passwords, 286-line monolith
- **Auth completely bypassed** — `isAuthenticated = true` hardcoded in App.js
- **Backend package.json** has frontend deps (`@mui/*`, `@emotion/*`, `lucide-react`)
- **factController.js line 7** — `FACT_API_URL = 'http://localhost:5001'` (points to itself)
- **cloudscancontroller.js line 7** — `'../backend/output'` resolves to `backend/backend/output`
- **authMiddleware.js** — JWT secret hardcoded as `'jwtsecret'`
- **depcontroller.js** — NVD API key exposed in source code
- **Sidebar width mismatch** — App.js uses 260px, CSS uses 280px

---

## Execution Plan

### Step 0: Foundation (1-2 days) — BLOCKER, do first

This is the one "horizontal" task before going vertical per tool.

#### 0.1 Centralized API Config
- [ ] Create `frontend/src/config/api.js`:
  ```javascript
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';
  const API_URL = `${API_BASE_URL}/api`;
  export { API_BASE_URL, API_URL };
  ```
- [ ] Create `frontend/src/config/index.js` for clean re-exports
- [ ] Test import works: `import { API_URL } from '../config'`

#### 0.2 Environment Files
- [ ] Create `frontend/.env.development`: `REACT_APP_API_URL=http://localhost:5001`
- [ ] Create `frontend/.env.example` for documentation
- [ ] Add `.env` to `frontend/.gitignore`

#### 0.3 Startup Script (`cytrust.sh`)
- [ ] Create root `cytrust.sh` with interactive menu:
  1. Run locally (nodemon + react dev server)
  2. Run in Docker (docker-compose up)
  3. Run Docker dev (with dev overrides + hot reload)
  4. Stop all
  5. Build Docker (--no-cache)
  6. Reset DB
  0. Exit
- [ ] Add prerequisite checks (MongoDB running, Docker daemon, env vars)
- [ ] Handle `.env` file creation from `.env.example` if missing

#### 0.4 Backend Quick Fixes
- [ ] Fix `factController.js` line 7: use `process.env.FACT_API_URL || 'http://localhost:5000'`
- [ ] Fix `cloudscancontroller.js` line 7: change `'../backend/output'` to `'../output'`
- [ ] Remove frontend deps from `backend/package.json` (`@mui/*`, `@emotion/*`, `lucide-react`, `react-select`)
- [ ] Move JWT secret to env var in `authMiddleware.js`

#### 0.5 Extract Common Job Manager
- [ ] Create `backend/utils/jobManager.js` — extract Map-based job tracking from scanController.js
- [ ] Standardize: job states (starting, running, completed, failed, cancelled), cleanup timer, status endpoint pattern
- [ ] Refactor Port Scanner's scanController.js to use it (validate it works)
- [ ] Will reuse for Wapiti, Prowler, LinEnum reworks

#### 0.6 Verify Docker
- [ ] `docker-compose build` completes without errors
- [ ] `docker-compose up -d` — all 3 services healthy
- [ ] Frontend loads at http://localhost:3000
- [ ] API calls reach backend (check Network tab)

---

### Per-Tool Work: Checklist Template

For EACH tool below, follow this order:
1. **Backend logic** — fix bugs, add async if needed, security fixes
2. **Frontend** — convert MUI → Bootstrap if needed, fix URLs, improve UX
3. **Dependency audit** — check for outdated/vulnerable packages used by this tool; update or replace
4. **Cleanup** — remove dead/backup files, consolidate to per-tool directory if fragmented
5. **Test locally** — `npm start` both sides, full workflow test
6. **Test in Docker** — `docker-compose up`, full workflow test
7. **Commit** — clean git commit with tool name

> **Dependency audit note:** When reworking a tool, run `npm audit` and `npm outdated`
> for both frontend and backend. If a tool-specific package is vulnerable or
> unmaintained, replace or update it at the same time. Don't defer dependency
> fixes — handle them while the tool is already open for changes.

---

### Step 1: Port Scanner (0.5 days)

**Status:** Gold standard, just needs URL fixes + Docker verification.

- [ ] Replace hardcoded URLs in:
  - `PortScanner/ScanPage.js` (1 occurrence)
  - `PortScanner/DashboardPage.js` (3 occurrences)
  - `PortScanner/ResultsPage.js` (3 occurrences)
  - `PortScanner/CombinedResultsPage.js` (1 occurrence)
  - `Portscanner.js` (legacy, 3 occurrences)
  - `ScanResults.js` (4 occurrences)
  - `Reports.js` (3 occurrences)
- [ ] Verify all 9+ scan types work in Docker (Quick Discovery, Top 1000, Vuln, OS Detection, etc.)
- [ ] Verify Smart Pentest 4-phase workflow works
- [ ] Verify report generation (HTML view + download)
- [ ] **Decision:** Remove legacy `Portscanner.js` if fully superseded by `PortScanner/` directory

---

### Step 2: SBOM Generator (1 day)

**Status:** Best architecture, minimal fixes needed.

- [ ] Replace hardcoded URLs in:
  - `services/sbomService.js` (1 occurrence)
  - `services/licensePolicyService.js` (1 occurrence)
- [ ] Verify `syft` runs correctly inside Docker container
- [ ] Test upload ZIP → CycloneDX output
- [ ] Test upload ZIP → SPDX output
- [ ] Verify license policy categorization works
- [ ] Review if any UI fixes needed (already uses Bootstrap)

---

### Step 3: Certificate Scanner (1 day)

**Status:** Mostly working, uses mix of MUI and Bootstrap.

- [ ] Replace hardcoded URLs in:
  - `CertScanner/DashboardPage.js` (1)
  - `CertScanner/UploadPage.js` (1)
  - `CertScanner/ResultsPage.js` (1)
  - `CertScanner/CertCard.js` (1)
  - `CertScanner/CertRowView.js` (1)
- [ ] Convert MUI → Bootstrap in: `CertCard.js`, `ResultsPage.js`, `CertRowView.js`, `CertDetailsModal.js`
- [ ] Verify Python scripts (`scan_cert.py`, `extract_certigo_info.py`, `analyze_signature_null.py`, `merge_cert_results.py`, `categorize_cert_results.py`) run in Docker
- [ ] Verify `certigo` binary works in Docker
- [ ] Test with valid, expired, expiring, and self-signed certificates
- [ ] Test error handling (invalid ZIP, empty ZIP, non-cert files)

---

### Step 4: Shodan (1-2 days)

**Status:** Functional if API key set, uses MUI.

- [ ] Replace hardcoded URLs in:
  - `shodan.js` (1)
  - `ShodanResults.js` (2)
- [ ] Convert MUI → Bootstrap in both files
- [ ] Verify `SHODAN_API_KEY` env var flows from docker-compose → backend → controller
- [ ] Test with a real IP query
- [ ] Verify results saved to MongoDB and displayed
- [ ] Test error handling (invalid IP, bad API key, rate limiting)
- [ ] Consider: Shodan uses native MongoDB driver (`connectDB`) — evaluate if should migrate to Mongoose for consistency

---

### Step 5: Web Scanner / Wapiti (3-4 days) ← Most impactful rework

**Status:** Runs Wapiti twice, synchronous, command injection risk.

#### Backend:
- [ ] Fix "runs twice" bug — single Wapiti execution with both JSON + HTML output
- [ ] Fix command injection vulnerability — properly escape/sanitize URL and module inputs
- [ ] Implement async job tracking using shared `jobManager.js`:
  - [ ] `POST /api/webscanner/scan` → returns `{ jobId }` immediately
  - [ ] `GET /api/webscanner/status/:jobId` → returns status, progress, logs
  - [ ] `POST /api/webscanner/cancel/:jobId` → kills Wapiti process
- [ ] Parse Wapiti JSON output into structured vulnerability data
- [ ] Store results in MongoDB with proper schema

#### Frontend:
- [ ] Replace hardcoded URLs in:
  - `WebScanner.js` (2)
  - `WebScanResults.js` (2)
  - `WebScannerDashboard.js` (3)
  - `WebScannerVulnDetails.js` (1)
- [ ] Convert all 4 files from MUI → Bootstrap
- [ ] Add polling-based scan progress (like Port Scanner)
- [ ] Add cancel button
- [ ] Improve results display: vulnerability table with filters, severity badges

#### Consider:
- [ ] Restructure into `components/WebScanner/` directory (router + pages)
- [ ] Or keep flat if scope is limited

---

### Step 6: OS Scanner / LinEnum (2-3 days)

**Status:** 50% commented-out code, stderr = failure bug.

#### Backend:
- [ ] Remove all commented-out duplicate code (~250 lines)
- [ ] Fix: stderr output should NOT auto-mark execution as "Failed" (many valid commands write to stderr)
- [ ] Fix cancel endpoint (currently a stub — "acknowledge only")
- [ ] Consider adding async job tracking for multi-device scans
- [ ] Verify Scanner/ scripts are included in Docker image

#### Frontend:
- [ ] Replace hardcoded URLs in:
  - `LinenumResultsPage.js` (1)
  - `services/linEnumService.js` (1 — already uses env var fallback, update to config)
- [ ] Convert `OSScanner.js` from MUI → Bootstrap (has 320px margin issue per UI audit)
- [ ] Verify `LinEnum.js` already uses Bootstrap correctly
- [ ] Fix the 320px margin issue flagged in UI audit

#### Testing:
- [ ] Verify SSH works from Docker container to a test target
- [ ] Test each of the 10 scan parts (user info, software, services, network, etc.)
- [ ] Test with unreachable device, wrong credentials

---

### Step 7: Script Execution + Device Management (3-4 days)

**Status:** Security vulnerabilities, monolithic code.

#### Backend — Security (CRITICAL):
- [ ] Sanitize all shell command inputs in `executionController.js` — prevent command injection
- [ ] Encrypt stored device passwords (at minimum `crypto.createCipheriv`)
- [ ] Fix path traversal in script file handling
- [ ] Break up the 286-line monolithic execution function

#### Backend — Logic:
- [ ] Improve script execution flow
- [ ] Add proper error handling and logging
- [ ] Consider async job tracking for multi-device execution

#### Frontend:
- [ ] Replace hardcoded URLs in:
  - `Execution.js` (4)
  - `ExecutionResults.js` (3)
  - `ShowScripts.js` (3)
  - `ManageScripts.js` (4)
  - `AddScriptForm.js` (1)
  - `AddDevices.js` (1)
  - `ShowDevices.js` (3)
- [ ] Convert MUI → Bootstrap: `ShowScripts.js`, `ManageScripts.js`, `AddDevices.js`, `AddScriptForm.js`, `ShowDevices.js`
- [ ] Improve device management UI (currently stores passwords in plaintext — at minimum hide in UI)

#### Testing:
- [ ] Test script CRUD (create, read, update, delete)
- [ ] Test execution on single device via SSH
- [ ] Test execution on multiple devices
- [ ] Verify results storage and display

---

### Step 8: Cloud Scanner / Prowler (4-5 days) — Deferred, needs separate container

**Status:** `spawnSync` blocks server, wrong paths, no CLIs in Docker, hardcoded file mappings.

#### Architecture Decision:
- [ ] Create `docker-compose.cloud.yml` with dedicated cloud-scanner container
- [ ] Install AWS CLI, GCP SDK, Azure CLI, Prowler in that container
- [ ] Connect to main backend via internal Docker network
- [ ] OR: Install CLIs in main backend Dockerfile (simpler but +3GB image size)

#### Backend:
- [ ] Change `spawnSync` → async `spawn` in `cloudscancontroller.js`
- [ ] Fix path: `'../backend/output'` → `'../output'`
- [ ] Remove hardcoded scan-to-file mappings in `cloudscanresultController.js` — make dynamic
- [ ] Fix command injection in `awscontroller.js` and `azureController.js`
- [ ] Add async job tracking (Prowler scans take 10-30+ minutes)
- [ ] Consider consolidating 5 cloud controllers into 1 unified controller

#### Frontend:
- [ ] Replace hardcoded URLs in:
  - `cloudscan.js` (9)
  - `Cloudscannerresults.js` (7)
  - `gcpScan.js` (6)
  - `GcpDashboard.js` (4)
  - `GcpScanresults.js` (1)
  - `gcpScriptexecution.js` (4)
  - `GcpScriptResults.js` (1)
- [ ] Convert MUI → Bootstrap: `gcpScan.js`, `Cloudsecuritydashboard.js`, `gcpScriptexecution.js`, `GcpScanresults.js`, `GcpDashboard.js`, `cloudscan.js`
- [ ] Fix GCP Scanner -950px margin issue

#### Testing:
- [ ] Test with valid AWS credentials
- [ ] Test with valid GCP credentials
- [ ] Test compliance report generation
- [ ] Verify async scanning doesn't block server

---

### Step 9: FACT Firmware Analysis (4-5 days) — Deferred, separate container

**Status:** URL points to itself, HTML scraping, FACT service commented out.

#### Architecture:
- [ ] Create `docker-compose.fact.yml` as separate stack
- [ ] Deploy FACT Core container (50GB+ disk requirement)
- [ ] Connect via Docker network to main backend

#### Backend:
- [ ] Rewrite `factController.js` to use FACT's REST API (not HTML scraping)
- [ ] Fix URL: use `process.env.FACT_API_URL`
- [ ] Implement proper file upload to FACT
- [ ] Implement analysis polling with reasonable timeout
- [ ] Parse FACT JSON results

#### Frontend:
- [ ] Replace hardcoded URLs in:
  - `services/factService.js` (4 occurrences at `localhost:5000`)
  - `FirmwareResults.js` (1)
  - `AnalysisResult.js` (1)
- [ ] Improve upload UX (progress, large file handling)

---

### Step 10: Cleanup & Removal (1 day)

#### Remove Dependency Scanner:
- [ ] Delete frontend: `Depscanpage.js`, `Depresultpage.js`, `DepScanDetailPage.js`
- [ ] Delete backend: `depcontroller.js`, `deproutes.js`, `depmodel.js`
- [ ] Remove from `server.js` route imports
- [ ] Remove from `App.js` routes
- [ ] Remove from sidebar config
- [ ] **This removes the exposed NVD API key from source**

#### Remove Cert-C Analyzer:
- [ ] Delete `frontend/src/components/CertCAnalyzer/` directory
- [ ] Delete `backend/CertCAnalyzer/` directory
- [ ] Remove from `server.js`, `App.js`, sidebar config

#### General Cleanup:
- [ ] Delete backup files: `*.backup`, `*COPY.txt`, `random.txt`
- [ ] Fix sidebar width mismatch (App.js 260px vs CSS 280px)
- [ ] Remove unused frontend deps from `backend/package.json`
- [ ] Remove one of the duplicate charting libraries (keep Recharts, remove chart.js)
- [ ] Remove extra icon libraries (keep react-icons or FontAwesome, not both + lucide)
- [ ] Final `grep -r "localhost:5001\|localhost:5000" frontend/src/` → should return 0 results

---

### Auth & Production Hardening (Future — Pre-Deployment)

- [ ] Re-enable authentication in App.js
- [ ] Move JWT secret to `process.env.JWT_SECRET`
- [ ] Multi-stage frontend Dockerfile with nginx
- [ ] Create `frontend/nginx.conf` for SPA routing
- [ ] Production docker-compose with proper env var injection
- [ ] Health checks for all services
- [ ] Logging standardization

---

## Key Files Reference

| Purpose | File |
|---------|------|
| Frontend entry | `frontend/src/App.js` |
| Backend entry | `backend/server.js` |
| API config (to create) | `frontend/src/config/api.js` |
| Docker config | `docker-compose.yml` |
| Docker dev overrides | `docker-compose.dev.yml` |
| Backend Dockerfile | `backend/Dockerfile` |
| Frontend Dockerfile | `frontend/Dockerfile` |
| Port Scanner (template) | `frontend/src/components/PortScanner/` |
| UI Standards | `docs/PORT_SCANNER_UI_UX_IMPLEMENTATION_GUIDE.md` |
| UI Design System | `docs/UI_UX_STANDARDS_AND_DESIGN_SYSTEM.md` |
| Startup script (to create) | `cytrust.sh` |

## Hardcoded URL Inventory (110+ total)

| File | Count | Port |
|------|:-----:|:----:|
| `cloudscan.js` | 9 | 5001 |
| `Cloudscannerresults.js` | 7 | 5001 |
| `gcpScan.js` | 6 | 5001 |
| `AdminDashboard.js` | 5 | 5001 |
| `GcpDashboard.js` | 4 | 5001 |
| `gcpScriptexecution.js` | 4 | 5001 |
| `ManageScripts.js` | 4 | 5001 |
| `ScanResults.js` | 4 | 5001 |
| `Execution.js` | 4 | 5001 |
| `factService.js` | 4 | 5000 |
| `ShowScripts.js` | 3 | 5001 |
| `ShowDevices.js` | 3 | 5001 |
| `ExecutionResults.js` | 3 | 5001 |
| `Portscanner.js` | 3 | 5001 |
| `PortScanner/ResultsPage.js` | 3 | 5001 |
| `PortScanner/DashboardPage.js` | 3 | 5001 |
| `WebScannerDashboard.js` | 3 | 5001 |
| `Reports.js` | 3 | 5001 |
| All other files | 1-2 each | 5001 |

## MUI Files Needing Bootstrap Conversion (21 files)

`ShowScripts`, `ManageScripts`, `AddDevices`, `WebScannerVulnDetails`, `gcpScan`, `Cloudsecuritydashboard`, `shodan`, `ShodanResults`, `AddScriptForm`, `WebScanner`, `gcpScriptexecution`, `WebScanResults`, `ShowDevices`, `GcpScanresults`, `VulnerabilityModal`, `WebScannerDashboard`, `OSScanner`, `GcpDashboard`, `cloudscan`, `Portscanner` (legacy), CertScanner: `CertCard`, `ResultsPage`, `CertRowView`, `CertDetailsModal`
