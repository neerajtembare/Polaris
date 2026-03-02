# CyTrust — Data Storage Guide

**How data flows through the system, how to define schemas, and MongoDB conventions.**

---

## 1. Database Architecture

| Setting | Value |
|---------|-------|
| Database engine | MongoDB 6 |
| Database name | `CyTrust` |
| Connection driver | **Mongoose** (the ONLY driver to use) |
| Connection var | `MONGO_URI` environment variable |
| Default local URI | `mongodb://localhost:27017/CyTrust` |
| Docker URI | `mongodb://mongo:27017/CyTrust` |
| External port (Docker) | `27018` (maps to internal `27017`) |

### Connection Setup

All database access goes through Mongoose configured in `server.js`:

```javascript
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/CyTrust');
```

**Do NOT use the native MongoDB driver (`MongoClient`).** Some legacy code uses `backend/utils/db.js` with `MongoClient` — this will be migrated to Mongoose.

---

## 2. Collection Naming

### Rules

1. **camelCase** — e.g., `portScanResults`, `webScanResults`
2. **Pluralized** — always plural nouns: `results`, `scripts`, `devices`
3. **Explicitly set** — always pass the third argument to `mongoose.model()`:
   ```javascript
   // ✅ CORRECT — explicit collection name
   mongoose.model('PortScanResult', schema, 'portScanResults');
   
   // ❌ WRONG — Mongoose auto-pluralizes inconsistently
   mongoose.model('PortScanResult', schema);  // creates 'portscanresults'
   ```

### Current Collections

| Collection Name | Model Name | Tool | File |
|----------------|------------|------|------|
| `portScanResults` | `PortScanResult` | Port Scanner | `models/scanModel.js` |
| `webScanResults` | `WebScanResult` | Web Scanner | `models/webScanModel.js` |
| `certScanResults` | `CertScanResult` | Certificate Scanner | (to confirm) |
| `sbomResults` | `SBOMResult` | SBOM Generator | (to confirm) |
| `shodanScans` | `ShodanScan` | Shodan | (to create — currently uses native driver) |
| `cloudScanResults` | `CloudScanResult` | Cloud Scanner | (to confirm) |
| `linEnumResults` | `LinEnumResult` | OS Scanner | (to confirm) |
| `firmwareResults` | `FirmwareResult` | FACT | (to confirm) |
| `scriptDefinitions` | `ScriptDefinition` | Script Manager | (to confirm) |
| `executionResults` | `ExecutionResult` | Script Execution | (to confirm) |
| `devices` | `Device` | Device Manager | (to create — currently uses native driver) |
| `users` | `User` | Auth | `models/userModel.js` |

---

## 3. Mongoose Schema Standards

### 3.1 Schema Template

```javascript
const mongoose = require('mongoose');

const toolResultSchema = new mongoose.Schema({
  // ─── Required Fields (every result must have these) ───
  scanName:  { type: String, required: true },
  target:    { type: String, required: true },   // IP, URL, file name, etc.
  scanType:  { type: String },                   // tool-specific scan variant
  
  // ─── Execution Metadata ───────────────────────────────
  command:    { type: String },                  // actual command executed
  status:     { type: String, default: 'completed', enum: ['completed', 'failed', 'partial'] },
  startTime:  { type: Date },
  endTime:    { type: Date },
  duration:   { type: Number },                  // seconds
  
  // ─── Results (tool-specific) ──────────────────────────
  result:     { type: mongoose.Schema.Types.Mixed },  // flexible for each tool
  
  // ─── Timestamps ───────────────────────────────────────
  timestamp:  { type: Date, default: Date.now }
});

// Always explicitly name the collection
const ToolResult = mongoose.model('ToolResult', toolResultSchema, 'toolResults');
module.exports = ToolResult;
```

### 3.2 Common Schema Patterns

**Nested objects with known structure:**
```javascript
// Define sub-schemas for known structures
result: {
  hosts: [{
    ip: String,
    hostname: String,
    openPorts: [{
      port: Number,
      protocol: String,
      service: String,
      version: String,
      state: String
    }]
  }]
}
```

**Flexible/unknown structure:**
```javascript
// Use Mixed for tool outputs that vary
result: { type: mongoose.Schema.Types.Mixed }
```

**Enums:**
```javascript
status: { type: String, enum: ['completed', 'failed', 'partial'], default: 'completed' }
severity: { type: String, enum: ['critical', 'high', 'medium', 'low', 'info'] }
```

### 3.3 Schema Rules

1. **Always set `required: true`** on fields that must exist (scanName, target)
2. **Always set defaults** where sensible (`timestamp: Date.now`, `status: 'completed'`)
3. **Use enums** for fields with known value sets
4. **Use Number, not String** for numeric data (port numbers, durations, scores)
5. **Use Date, not String** for timestamps
6. **Never store passwords in plaintext** — use `bcryptjs` or `crypto`
7. **Never store raw API keys** — use environment variables at runtime

---

## 4. Data Flow Architecture

### 4.1 Scan Lifecycle

```
User Input → POST /api/toolname/scan → Controller validates →
  ↓
Create in-memory job (Map) → Return jobId (200)
  ↓
Background: spawn process → stdout/stderr collected →
  ↓
Process completes → Parse output → Save to MongoDB →
  ↓
Update job: status='completed', result={ id: mongoId, ... }
  ↓
Frontend polls GET /api/toolname/status/:jobId →
  ↓
Sees status='completed' → GET /api/toolname/results/:id →
  ↓
Display results from MongoDB
```

### 4.2 What Goes Where

| Data Type | Storage | Why |
|-----------|---------|-----|
| Active job state (running scans) | In-memory `Map()` | Fast access, temporary |
| Completed scan results | MongoDB | Persistent, queryable |
| Scan configuration/metadata | MongoDB (with result) | Audit trail |
| Raw tool output (stdout) | Parse → MongoDB | Don't store raw text |
| Logs (scan progress) | In-memory `Map()` → cleared after 1hr | Temporary |
| Uploaded files (firmware, certs, etc.) | Filesystem (`uploads/`) | Too large for DB |
| Generated reports (HTML, PDF) | Filesystem | Served via express.static |
| User credentials | MongoDB (hashed) | Persistent |
| Device SSH passwords | MongoDB (encrypted) | Persistent, sensitive |
| API keys (Shodan, etc.) | Environment variables only | Never in DB or code |

### 4.3 File Storage Paths

```
backend/
├── uploads/             # User-uploaded files (certs, firmware, scripts)
│   ├── sbom/           #   SBOM uploads
│   ├── certs/          #   Certificate bundles
│   └── firmware/       #   Firmware binaries
├── output/              # Tool output files
│   └── {scanName}/     #   Per-scan output directory
├── scanResults/         # Port scanner reports
├── WebScanResultReports/  # Wapiti reports
└── cloudscanResults/    # Prowler output files
```

**Rules for file paths:**
- Use `path.resolve(__dirname, '../uploads')` — never `'../backend/uploads'`
- Use `scanName` to create per-scan subdirectories
- Clean up old upload files (they accumulate)
- Docker volumes: `uploads-data` and `scan_results` are persisted

---

## 5. Query Patterns

### 5.1 Fetching History (sorted, limited)

```javascript
const results = await Model.find()
  .sort({ timestamp: -1 })    // newest first
  .limit(50)                   // reasonable limit
  .select('scanName target status timestamp scanType');  // only needed fields
```

### 5.2 Fetching Single Result

```javascript
const { id } = req.params;
if (!isValidObjectId(id)) {
  return res.status(400).json({ error: 'Invalid ID format' });
}
const result = await Model.findById(id);
if (!result) {
  return res.status(404).json({ error: 'Result not found' });
}
res.json(result);
```

### 5.3 Metrics / Aggregation

```javascript
const totalScans = await Model.countDocuments();
const successfulScans = await Model.countDocuments({ status: 'completed' });
```

### 5.4 Filtered Queries

```javascript
// Build filter object dynamically
const filter = {};
if (req.query.scanType) filter.scanType = req.query.scanType;
if (req.query.target) filter.target = req.query.target;
if (req.query.status) filter.status = req.query.status;

const results = await Model.find(filter).sort({ timestamp: -1 });
```

### 5.5 Deleting Results

```javascript
const result = await Model.findByIdAndDelete(id);
if (!result) {
  return res.status(404).json({ error: 'Result not found' });
}
// Also clean up associated files if any
res.json({ message: 'Result deleted successfully' });
```

---

## 6. Migration: Native Driver → Mongoose

Some tools currently use the native MongoDB driver (`MongoClient` via `utils/db.js`). When reworking these tools:

1. Create a proper Mongoose model in `models/`
2. Replace `connectDB()` + `collection.insertOne()` with `Model.create()`
3. Replace `collection.find()` with `Model.find()`
4. Remove `utils/db.js` references once all tools are migrated
5. Test that data shape is compatible

```javascript
// ❌ OLD (native driver)
const { connectDB } = require('../utils/db');
const db = await connectDB();
const collection = db.collection('shodanScans');
await collection.insertOne({ scanName, result });
const scans = await collection.find().toArray();

// ✅ NEW (Mongoose)
const ShodanScan = require('../models/shodanModel');
await ShodanScan.create({ scanName, target, result });
const scans = await ShodanScan.find().sort({ timestamp: -1 });
```
