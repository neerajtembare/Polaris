# CyTrust — Naming Conventions

**Consistent naming across the entire codebase.**

---

## 1. File Naming

### Backend Files

| Type | Convention | Example |
|------|-----------|---------|
| Controllers | `camelCase` + `Controller.js` | `scanController.js`, `webScannerController.js` |
| Routes | `camelCase` + `Routes.js` | `scanRoutes.js`, `webScannerRoutes.js` |
| Models | `camelCase` + `Model.js` | `scanModel.js`, `webScanModel.js` |
| Utilities | `camelCase` + `.js` | `scanTypes.js`, `jobManager.js` |
| Middleware | `camelCase` + `.js` | `authMiddleware.js` |

### Frontend Files

| Type | Convention | Example |
|------|-----------|---------|
| Component directories | `PascalCase` | `PortScanner/`, `WebScanner/`, `CertScanner/` |
| Page components | `PascalCase` + `Page.js` | `ScanPage.js`, `DashboardPage.js`, `ResultsPage.js` |
| Router components | `PascalCase` + `.js` | `PortScanner.js`, `WebScanner.js` |
| CSS files | Match JS file name | `PortScanner.css`, `DashboardPage.css` |
| Service files | `camelCase` + `Service.js` | `sbomService.js`, `linEnumService.js` |
| Config files | `camelCase` + `.js` | `api.js`, `index.js` |

### General Rules

- **No spaces in file names** — use camelCase or PascalCase
- **No special characters** — only letters, numbers, dots, hyphens
- **Be descriptive** — `scanController.js` not `sc.js`
- **Consistent suffixes** — always `Controller`, `Routes`, `Model`, `Page`, `Service`

---

## 2. Variable & Function Naming

### JavaScript (Both Backend & Frontend)

| Type | Convention | Example |
|------|-----------|---------|
| Variables | `camelCase` | `scanName`, `ipAddress`, `isLoading` |
| Functions | `camelCase` | `startScan()`, `fetchResults()`, `handleSubmit()` |
| Constants | `UPPER_SNAKE_CASE` | `API_URL`, `SCAN_TYPES`, `MAX_RETRIES` |
| React components | `PascalCase` | `ScanPage`, `DashboardPage` |
| React state | `camelCase` with `set` prefix | `[scans, setScans]`, `[isLoading, setIsLoading]` |
| Booleans | `is/has/should` prefix | `isLoading`, `hasError`, `shouldRefresh` |
| Event handlers | `handle` prefix | `handleStartScan`, `handleCancel`, `handleChange` |
| Fetch functions | `fetch` prefix | `fetchScans`, `fetchMetrics`, `fetchResults` |

### CSS Classes

| Context | Convention | Example |
|---------|-----------|---------|
| Component wrapper | `kebab-case` | `tool-dashboard`, `scan-page`, `results-page` |
| Element classes | `kebab-case` | `stat-card`, `log-entry`, `scan-table` |
| State modifiers | `kebab-case` prefix | `log-info`, `log-error`, `status-running` |
| Bootstrap overrides | Standard Bootstrap names | `mb-3`, `p-4`, `d-flex` |

---

## 3. URL & Route Naming

### API Endpoints (Backend)

| Convention | Example |
|-----------|---------|
| Prefix: `/api/` | All routes start with `/api/` |
| Resource name: `kebab-case` | `/api/port-scanner/`, `/api/web-scanner/` |
| Actions: noun-based | `/api/scan`, `/api/scan-types`, `/api/scan-history` |
| Parameters: `:camelCase` | `/api/scan-status/:jobId`, `/api/scan-results/:id` |
| HTTP methods convey action | `POST /scan` (create), `GET /scan-status/:id` (read) |

**Standard endpoint set for each tool:**
```
POST /api/toolname/scan           → Start scan
GET  /api/toolname/status/:jobId  → Poll job status
POST /api/toolname/cancel/:jobId  → Cancel scan
GET  /api/toolname/results/:id    → Get result
GET  /api/toolname/history        → List results
GET  /api/toolname/metrics        → Get stats
```

### Frontend Routes (App.js)

| Convention | Example |
|-----------|---------|
| `kebab-case` | `/port-scanner`, `/web-scanner`, `/cert-scanner` |
| Wildcard for nested | `/port-scanner/*` |
| Sub-routes (inside tool) | `dashboard`, `scan`, `results/:scanId` |

**Resulting full paths:**
```
/port-scanner/dashboard
/port-scanner/scan
/port-scanner/results/abc123
/web-scanner/dashboard
/web-scanner/scan
/cert-scanner/upload
```

---

## 4. MongoDB Naming

### Collections

| Convention | Example |
|-----------|---------|
| `camelCase`, plural | `portScanResults`, `webScanResults`, `scriptDefinitions` |

### Schema Fields

| Convention | Example |
|-----------|---------|
| `camelCase` | `scanName`, `ipAddress`, `scanType`, `startTime` |
| Timestamps | `timestamp`, `createdAt`, `updatedAt` |
| Booleans | `isActive`, `hasVulnerabilities` |
| Counts | `openPortCount`, `totalFindings` |
| References | Use descriptive names, not `data` or `info` |

### Model Names

| Convention | Example |
|-----------|---------|
| `PascalCase`, singular | `PortScanResult`, `WebScanResult`, `ScriptDefinition` |

---

## 5. Environment Variables

| Convention | Example |
|-----------|---------|
| `UPPER_SNAKE_CASE` | `MONGO_URI`, `SHODAN_API_KEY`, `JWT_SECRET` |
| Prefixed for frontend | `REACT_APP_API_URL`, `REACT_APP_FACT_URL` |
| Descriptive | `FACT_API_URL` not `FACT_URL` or `URL2` |

---

## 6. Git & Version Control

### Commit Messages

Format: `[Scope] Short description`

```
[Foundation] Create centralized API config
[PortScanner] Fix hardcoded URLs, verify Docker
[WebScanner] Convert MUI to Bootstrap, add async
[Cleanup] Remove dependency scanner and Cert-C
```

### Branch Naming

```
feature/tool-name-fix        # Working on a specific tool
fix/hardcoded-urls           # Bug fix
cleanup/remove-dep-scanner   # Removing code
```

---

## 7. Import Order

Follow this order in every file, with blank lines between groups:

```javascript
// 1. Node.js built-ins
const path = require('path');
const { spawn } = require('child_process');

// 2. Third-party packages
const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');

// 3. Internal modules (models, utils, config)
const ToolResult = require('../models/toolNameModel');
const { API_URL } = require('../config');

// 4. (Frontend only) CSS
import './ToolName.css';
```

---

## 8. Anti-Patterns to Avoid

| Don't | Do Instead |
|-------|-----------|
| `data`, `info`, `stuff` as variable names | Descriptive: `scanResults`, `portData`, `deviceList` |
| `handleClick`, `handleClick2`, `handleClick3` | `handleStartScan`, `handleCancel`, `handleDelete` |
| `temp`, `tmp`, `foo`, `bar` | Real names even for temporary variables |
| `component1.js`, `page2.js` | `ScanPage.js`, `ResultsPage.js` |
| `utils.js` (generic catch-all) | `scanUtils.js`, `formatters.js`, `validators.js` |
| Mixed naming: `get_data`, `getData`, `GetData` | Pick `camelCase` for functions, always |
| Abbreviations: `mgr`, `ctrl`, `svc` | Full words: `manager`, `controller`, `service` |
