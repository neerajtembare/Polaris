# CyTrust — Directory Structure Standard

**Target directory structure for the fully-reworked application.**

---

## 1. Root Structure

```
cytrust_docker/
├── Plan/                        # Standards, templates, decisions (this folder)
│   ├── DECISIONS.md
│   ├── TOOL_TEMPLATE.md
│   ├── ERROR_HANDLING_GUIDE.md
│   ├── DATA_STORAGE_GUIDE.md
│   ├── NAMING_CONVENTIONS.md
│   ├── DIRECTORY_STRUCTURE.md
│   └── EXECUTION_PLAN.md
│
├── docs/                        # Architecture docs, analysis, history
│   ├── Architecture&tools/
│   ├── docker_docs/
│   ├── outdated_docs/
│   └── system-mapping/
│
├── backend/                     # Node.js + Express API server
├── frontend/                    # React SPA
│
├── docker-compose.yml           # Production Docker config
├── docker-compose.dev.yml       # Development overrides
├── cytrust.sh                   # Startup script (to create)
├── .env.example                 # Root env template
├── package.json                 # Root convenience scripts
└── README.md
```

---

## 2. Backend Structure

The backend uses a **co-located, per-tool directory** pattern. Each tool owns a
self-contained directory that holds its controller, routes, model, and any
tool-specific support files (Python scripts, shell scripts, config). Shared
infrastructure (middleware, utilities) lives in common directories.

This mirrors the frontend structure and matches the tool-by-tool development
workflow — when you're working on the Web Scanner, everything you need is in
`backend/webScanner/`.

```
backend/
├── server.js                    # Express app setup, route registration, DB connection
├── package.json
├── Dockerfile
├── nodemon.json
│
├── portScanner/                 # ✅ Port Scanner (gold standard)
│   ├── scanController.js        #   Business logic, async job tracking
│   ├── scanRoutes.js            #   Route definitions
│   ├── scanModel.js             #   Mongoose schema → 'portScanResults'
│   ├── scanTypes.js             #   Scan type configurations
│   ├── scanUtils.js             #   Output parser utilities
│   └── scanResults/             #   Scan report output files
│
├── webScanner/                  # Web Scanner (Wapiti)
│   ├── webScannerController.js
│   ├── webScannerRoutes.js
│   ├── webScanModel.js          #   → 'webScanResults'
│   └── reports/                 #   Wapiti report files (was WebScanResultReports/)
│
├── certScanner/                 # Certificate Scanner
│   ├── certScannerController.js
│   ├── certScannerRoutes.js
│   ├── certScanModel.js         #   → 'certScanResults'
│   └── python/                  #   Python analysis scripts
│       ├── scan_cert.py
│       ├── extract_certigo_info.py
│       ├── analyze_signature_null.py
│       ├── merge_cert_results.py
│       └── categorize_cert_results.py
│
├── Sbom_Generator/              # ✅ SBOM Generator (already structured this way)
│   ├── sbomGenController.js
│   ├── sbomRoutes.js
│   ├── sbomModel.js             #   → 'sbomResults'
│   └── ...
│
├── shodan/                      # Shodan Scanner
│   ├── shodanController.js
│   ├── shodanRoutes.js
│   └── shodanModel.js           #   → 'shodanScans'
│
├── osScanner/                   # OS Scanner / LinEnum
│   ├── linEnumController.js
│   ├── linEnumRoutes.js
│   ├── linEnumModel.js          #   → 'linEnumResults'
│   └── scripts/                 #   Shell scripts deployed to remote devices
│       ├── linux_user_info.sh
│       ├── linux_software_info.sh
│       ├── linux_services_info.sh
│       └── ...
│
├── scriptExecution/             # Script Execution Engine
│   ├── executionController.js
│   ├── executionRoutes.js
│   ├── executionModel.js        #   → 'executionResults'
│   ├── scriptController.js      #   Script CRUD
│   ├── scriptRoutes.js
│   └── scriptModel.js           #   → 'scriptDefinitions'
│
├── cloudScanner/                # Cloud Scanner (Prowler)
│   ├── cloudscanController.js
│   ├── cloudScanRoutes.js
│   ├── cloudScanModel.js        #   → 'cloudScanResults'
│   └── output/                  #   Prowler output files
│
├── firmwareAnalysis/            # FACT Firmware (deferred)
│   ├── factController.js
│   ├── factRoutes.js
│   └── factModel.js
│
├── devices/                     # Device Management
│   ├── deviceController.js
│   ├── deviceRoutes.js
│   ├── deviceModel.js           #   → 'devices'
│   └── pingController.js        #   Device ping
│
├── auth/                        # Authentication (deferred until pre-production)
│   ├── authController.js
│   ├── authRoutes.js
│   └── userModel.js             #   → 'users'
│
├── reports/                     # Report Generation
│   ├── reportController.js
│   └── reportRoutes.js
│
├── middleware/                   # Shared Express middleware
│   ├── authMiddleware.js        #   JWT authentication
│   └── errorMiddleware.js       #   Global error handler (to create)
│
├── utils/                       # Shared utilities (used by 2+ tools)
│   ├── jobManager.js            #   Reusable async job tracking (to create)
│   └── validators.js            #   Input validation helpers (to create)
│
├── uploads/                     # User-uploaded files (gitignored)
└── output/                      # General output files (gitignored)
```

### Key Principles — Backend

1. **Co-located tool directories** — controller, routes, model, and support files all live together per tool
2. **Each tool directory is self-contained** — deleting a directory + removing one line from `server.js` cleanly removes a tool
3. **Shared utils are truly shared** — only code used by 2+ tools goes in `middleware/` or `utils/`
4. **Migrate per-tool, not all-at-once** — move files into the new structure only when reworking that tool
5. **Tool-specific output/reports** stay inside the tool directory (e.g., `portScanner/scanResults/`, `webScanner/reports/`)
6. **No dead files** — remove unused scripts, backups, test files

---

## 3. Frontend Structure

```
frontend/
├── src/
│   ├── App.js                   # Route definitions, layout wrapper
│   ├── App.css                  # Global styles
│   ├── index.js                 # React entry point
│   │
│   ├── config/                  # ✨ Centralized configuration (to create)
│   │   ├── api.js               #   API_BASE_URL, API_URL exports
│   │   └── index.js             #   Clean re-exports
│   │
│   ├── components/
│   │   ├── Header.js            # Top navigation bar
│   │   ├── Dashboard.js         # Main application dashboard
│   │   │
│   │   ├── Sidebar/             # Navigation sidebar
│   │   │   ├── Sidebar.js
│   │   │   ├── MenuItem.js
│   │   │   ├── MobileToggle.js
│   │   │   ├── index.js
│   │   │   ├── config/          #   Menu item definitions
│   │   │   └── hooks/           #   Sidebar-specific hooks
│   │   │
│   │   ├── PortScanner/         # ✅ Gold standard structure
│   │   │   ├── PortScanner.js   #   Router (sub-routes)
│   │   │   ├── DashboardPage.js #   Dashboard view
│   │   │   ├── ScanPage.js      #   Scan configuration + execution
│   │   │   ├── ResultsPage.js   #   Individual scan results
│   │   │   ├── CombinedResultsPage.js
│   │   │   ├── PortScanner.css  #   Shared styles
│   │   │   ├── DashboardPage.css
│   │   │   └── ResultsPage.css
│   │   │
│   │   ├── WebScanner/          # (Restructure from flat files)
│   │   │   ├── WebScanner.js
│   │   │   ├── DashboardPage.js
│   │   │   ├── ScanPage.js
│   │   │   ├── ResultsPage.js
│   │   │   └── WebScanner.css
│   │   │
│   │   ├── CertScanner/         # Already has directory structure
│   │   │   ├── CertScanner.js
│   │   │   ├── UploadPage.js
│   │   │   ├── ResultsPage.js
│   │   │   ├── DashboardPage.js
│   │   │   ├── CertCard.js
│   │   │   ├── CertRowView.js
│   │   │   └── CertDetailsModal.js
│   │   │
│   │   ├── SBOMGenerator/       # Already has directory structure
│   │   │   ├── SBOMGenerator.js
│   │   │   ├── UploadPage.js
│   │   │   ├── ResultsPage.js
│   │   │   ├── DashboardPage.js
│   │   │   └── LicensePolicyPage.js
│   │   │
│   │   ├── Shodan/              # (Restructure from shodan.js + ShodanResults.js)
│   │   │   ├── Shodan.js
│   │   │   ├── ScanPage.js
│   │   │   ├── ResultsPage.js
│   │   │   └── Shodan.css
│   │   │
│   │   ├── OSScanner/           # (Restructure from OSScanner.js + LinEnum/)
│   │   │   ├── OSScanner.js
│   │   │   ├── ScanPage.js
│   │   │   ├── ResultsPage.js
│   │   │   └── OSScanner.css
│   │   │
│   │   ├── ScriptExecution/     # (Consolidate 5+ fragmented files)
│   │   │   ├── ScriptExecution.js
│   │   │   ├── LibraryPage.js
│   │   │   ├── ExecutionPage.js
│   │   │   ├── ResultsPage.js
│   │   │   └── ScriptExecution.css
│   │   │
│   │   ├── DeviceManager/       # (Restructure from AddDevices + ShowDevices)
│   │   │   ├── DeviceManager.js
│   │   │   ├── DeviceList.js
│   │   │   ├── AddDevice.js
│   │   │   └── DeviceManager.css
│   │   │
│   │   ├── CloudScanner/        # (Consolidate 7+ files)
│   │   │   ├── CloudScanner.js
│   │   │   ├── DashboardPage.js
│   │   │   ├── ScanPage.js
│   │   │   ├── ResultsPage.js
│   │   │   └── CloudScanner.css
│   │   │
│   │   ├── FirmwareAnalysis/    # (Restructure from 3 flat files)
│   │   │   ├── FirmwareAnalysis.js
│   │   │   ├── UploadPage.js
│   │   │   ├── ResultsPage.js
│   │   │   └── FirmwareAnalysis.css
│   │   │
│   │   ├── Auth/                # (Future — when auth is re-enabled)
│   │   │   ├── Login.js
│   │   │   └── Register.js
│   │   │
│   │   └── shared/              # Truly reusable components
│   │       ├── ResultsTable.js
│   │       ├── SeverityBox.js
│   │       └── VulnerabilityModal.js
│   │
│   └── services/                # API service abstractions (optional)
│       ├── sbomService.js
│       ├── licensePolicyService.js
│       └── linEnumService.js
│
├── public/
│   ├── index.html
│   └── favicon.ico
│
├── .env.development             # (to create)
├── .env.example                 # (to create)
├── package.json
└── Dockerfile
```

### Key Principles — Frontend

1. **Every tool gets its own directory** under `components/`
2. **Router component** at `ToolName/ToolName.js` — handles sub-routes
3. **Standard pages**: `DashboardPage.js`, `ScanPage.js` (or `UploadPage.js`), `ResultsPage.js`
4. **CSS co-located** — in the same directory as the JS files
5. **Shared components** go in `components/shared/` — only if used by 2+ tools
6. **Services** are optional — for tools with complex API interactions
7. **No flat component files** for tools — always use directories

---

## 4. Files to Remove

These files should be deleted as part of tool rework or cleanup:

### Deprecated Tools
```
frontend/src/components/Depscanpage.js          # Dep Scanner (remove)
frontend/src/components/Depresultpage.js         # Dep Scanner (remove)
frontend/src/components/DepScanDetailPage.js     # Dep Scanner (remove)
frontend/src/components/CertCAnalyzer/           # Cert-C (remove entire dir)
backend/controllers/depcontroller.js             # Dep Scanner (remove)
backend/routes/deproutes.js                      # Dep Scanner (remove)
backend/models/depmodel.js                       # Dep Scanner (remove)
backend/CertCAnalyzer/                           # Cert-C (remove entire dir)
```

### Legacy/Superseded Files
```
frontend/src/components/Portscanner.js           # Superseded by PortScanner/ dir
frontend/src/components/ScanResults.js           # Superseded by PortScanner/ResultsPage.js
```

### Backup/Dead Files
```
frontend/src/components/LinEnum/LinEnum.js.backup
frontend/src/components/PortScanner/ScanPage.js.backup
frontend/src/components/WebScanResultsCOPY.txt
frontend/src/random.txt
frontend/src/components/random.txt               # (if exists)
```

### Backend Dead Files
```
backend/analyze-import-tool.js
backend/analyze-security-scripts.js
backend/clean-html-reports.js
backend/cleanup-scripts.js
backend/cleanup-spaced-scripts.js
backend/direct-fact-test.js
backend/import-scripts-direct.js
backend/import-scripts-updated.js
backend/import-scripts.js
backend/import-spacefree-scripts.js
backend/populate-cloud-scanner-data.js
backend/populate-enhanced-cloud-data.js
backend/populate-gcp-data.js
backend/populate-prowler-data.js
backend/populate-real-reports.js
backend/standardize-collections.js
backend/test_commit.txt
backend/test-fact-integration.js
backend/test-script-upload.js
backend/update-compliance-data.js
backend/update-comprehensive-compliance.js
backend/verify-scripts.js
backend/migrate-database.js
backend/IMPORT_TOOL_REVIEW.md
```

> **Note:** Review each file before deleting. Some may contain one-time migration scripts that have already been run. If unsure, move to a `backend/_archive/` directory first.

---

## 5. Migration Path

### Backend — Moving to co-located tool directories

When restructuring a backend tool from controllers/routes/models to its own directory:

1. **Create the tool directory** — `backend/toolName/`
2. **Move controller** — `controllers/toolController.js` → `toolName/toolController.js`
3. **Move routes** — `routes/toolRoutes.js` → `toolName/toolRoutes.js`
4. **Move model** — `models/toolModel.js` → `toolName/toolModel.js`
5. **Move support files** — Python scripts, shell scripts, output dirs into the tool dir
6. **Update `server.js` imports** — change require paths to new directory
7. **Update internal requires** — fix any cross-references within the moved files
8. **Delete old files** — only after confirming everything works
9. **Test** — verify all API endpoints still work

**Example: Web Scanner migration**
```
BEFORE:
  controllers/webScannerController.js
  routes/webScannerRoutes.js
  models/webScanModel.js
  WebScanResultReports/            ← output dir at backend root

AFTER:
  webScanner/
    webScannerController.js
    webScannerRoutes.js
    webScanModel.js
    reports/                       ← output dir co-located
```

In `server.js`, the import changes from:
```js
// Before
const webScannerRoutes = require('./routes/webScannerRoutes');

// After
const webScannerRoutes = require('./webScanner/webScannerRoutes');
```

### Frontend — Moving flat component files to tool directories

When restructuring a frontend tool from flat files to a directory:

1. **Create the new directory** — `components/ToolName/`
2. **Create the router component** — `ToolName.js` with sub-routes
3. **Move/rename pages** — existing files become `DashboardPage.js`, `ScanPage.js`, etc.
4. **Update imports** in `App.js` — change to new directory path
5. **Update sidebar config** — point to new routes
6. **Move CSS** — into the tool directory
7. **Delete old files** — only after confirming everything works
8. **Test** — verify all routes, links, and navigation work

**Example: Shodan migration**
```
BEFORE:
  components/shodan.js          → ScanPage logic
  components/ShodanResults.js   → ResultsPage logic

AFTER:
  components/Shodan/
    Shodan.js                   → Router
    ScanPage.js                 → Moved from shodan.js
    ResultsPage.js              → Moved from ShodanResults.js
    Shodan.css                  → New shared styles
```

### When to migrate

**Do NOT restructure everything upfront.** Migrate each tool when you're actively reworking it. This avoids a massive risky refactor and keeps every commit functional.
