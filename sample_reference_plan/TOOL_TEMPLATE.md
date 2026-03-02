# CyTrust — Tool Implementation Template

**Reference Implementation:** Port Scanner (`frontend/src/components/PortScanner/`, `backend/controllers/scanController.js`)

Every tool in CyTrust must follow this template for consistency. Copy the patterns below when building or reworking a tool.

---

## 1. Backend Structure

Each tool needs these files:

```
backend/
├── controllers/
│   └── toolNameController.js    # Business logic, job management
├── routes/
│   └── toolNameRoutes.js        # Express route definitions
├── models/
│   └── toolNameModel.js         # Mongoose schema
└── utils/
    └── toolNameTypes.js          # (optional) Config/types for the tool
```

### 1.1 Route File Template

```javascript
// backend/routes/toolNameRoutes.js
const express = require('express');
const {
  getToolTypes,        // GET config/metadata (if applicable)
  startScan,           // POST start async job
  getScanStatus,       // GET poll job status
  cancelScan,          // POST cancel job
  getResultById,       // GET single result
  getHistory,          // GET list of past results
  getMetrics,          // GET aggregated stats (if applicable)
} = require('../controllers/toolNameController');

const router = express.Router();

// Standard endpoint pattern (replace 'toolname' with actual):
router.get('/toolname/types', getToolTypes);
router.post('/toolname/scan', startScan);
router.get('/toolname/status/:jobId', getScanStatus);
router.post('/toolname/cancel/:jobId', cancelScan);
router.get('/toolname/results/:id', getResultById);
router.get('/toolname/history', getHistory);
router.get('/toolname/metrics', getMetrics);

module.exports = router;
```

### 1.2 Controller Template (Async Job Pattern)

```javascript
// backend/controllers/toolNameController.js
const { spawn } = require('child_process');
const ToolResult = require('../models/toolNameModel');
const { isValidObjectId } = require('mongoose');

// ─── In-Memory Job Store ─────────────────────────────────────
const jobs = new Map();

// Auto-cleanup: remove completed/failed jobs older than 1 hour
setInterval(() => {
  const now = Date.now();
  for (const [jobId, job] of jobs.entries()) {
    const age = now - new Date(job.startTime).getTime();
    if (['completed', 'failed', 'cancelled'].includes(job.status) && age > 3600000) {
      jobs.delete(jobId);
    }
  }
}, 300000); // every 5 minutes

// ─── Job ID Generator ────────────────────────────────────────
function generateJobId(prefix = 'job') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ─── Start Scan ──────────────────────────────────────────────
const startScan = async (req, res) => {
  try {
    const { scanName, target, /* other params */ } = req.body;

    // 1. Validate input
    if (!scanName || !target) {
      return res.status(400).json({ error: 'Scan name and target are required' });
    }

    // 2. Check for duplicate scan name
    const existing = await ToolResult.findOne({ scanName });
    if (existing) {
      return res.status(400).json({ error: 'Scan name already exists. Please choose a different name.' });
    }

    // 3. Create job
    const jobId = generateJobId('toolname');
    jobs.set(jobId, {
      status: 'starting',
      progress: 0,
      scanName,
      target,
      result: null,
      error: null,
      startTime: new Date(),
      estimatedTime: 300, // seconds
      process: null,
      logs: []
    });

    // 4. Return jobId immediately
    res.status(200).json({
      jobId,
      message: 'Scan started. Use this jobId to check progress.'
    });

    // 5. Execute in background (after response sent)
    executeScan(jobId);
  } catch (err) {
    console.error('Error starting scan:', err);
    res.status(500).json({ error: 'Failed to start scan' });
  }
};

// ─── Background Execution ────────────────────────────────────
async function executeScan(jobId) {
  const job = jobs.get(jobId);
  if (!job) return;

  try {
    job.status = 'running';
    job.logs.push({ timestamp: new Date().toISOString(), message: 'Scan started', type: 'info' });

    // Build command arguments (NEVER use string interpolation for shell commands)
    const args = ['--arg1', job.target, '--output', 'json'];
    const scanProcess = spawn('tool-binary', args);

    // Store process reference for cancellation
    job.process = scanProcess;

    let stdout = '';
    let stderr = '';

    scanProcess.stdout.on('data', (data) => {
      stdout += data.toString();
      // Parse progress if tool outputs it
    });

    scanProcess.stderr.on('data', (data) => {
      stderr += data.toString();
      // Parse progress from stderr if applicable (like nmap)
      const progressMatch = stderr.match(/(\d+)%/);
      if (progressMatch) {
        job.progress = Math.min(95, parseInt(progressMatch[1]));
      }
    });

    scanProcess.on('close', async (code) => {
      if (job.status === 'cancelled') return; // already handled

      if (code === 0) {
        try {
          // Parse output and save to DB
          const parsedResult = JSON.parse(stdout);
          const savedResult = await new ToolResult({
            scanName: job.scanName,
            target: job.target,
            result: parsedResult,
            status: 'completed',
            timestamp: new Date()
          }).save();

          job.status = 'completed';
          job.progress = 100;
          job.result = { id: savedResult._id, ...parsedResult };
          job.logs.push({ timestamp: new Date().toISOString(), message: 'Scan completed successfully', type: 'success' });
        } catch (parseErr) {
          job.status = 'failed';
          job.error = 'Failed to parse scan results';
          job.logs.push({ timestamp: new Date().toISOString(), message: parseErr.message, type: 'error' });
        }
      } else {
        job.status = 'failed';
        job.error = stderr || `Process exited with code ${code}`;
        job.logs.push({ timestamp: new Date().toISOString(), message: job.error, type: 'error' });
      }
    });

    scanProcess.on('error', (err) => {
      job.status = 'failed';
      job.error = `Failed to start process: ${err.message}`;
      job.logs.push({ timestamp: new Date().toISOString(), message: job.error, type: 'error' });
    });

  } catch (err) {
    job.status = 'failed';
    job.error = err.message;
  }
}

// ─── Get Scan Status ─────────────────────────────────────────
const getScanStatus = (req, res) => {
  const { jobId } = req.params;
  const job = jobs.get(jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  const elapsedTime = Math.round((Date.now() - new Date(job.startTime).getTime()) / 1000);

  res.json({
    jobId,
    status: job.status,
    progress: job.progress,
    scanName: job.scanName,
    estimatedTime: job.estimatedTime,
    elapsedTime,
    result: job.result,
    error: job.error,
    logs: job.logs
  });
};

// ─── Cancel Scan ─────────────────────────────────────────────
const cancelScan = (req, res) => {
  const { jobId } = req.params;
  const job = jobs.get(jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  if (job.status !== 'running' && job.status !== 'starting') {
    return res.status(400).json({
      error: `Cannot cancel scan in ${job.status} state`,
      status: job.status
    });
  }

  // Kill the process
  if (job.process) {
    job.process.kill('SIGTERM');
  }
  job.status = 'cancelled';
  job.logs.push({ timestamp: new Date().toISOString(), message: 'Scan cancelled by user', type: 'warning' });

  res.json({
    success: true,
    message: 'Scan cancelled successfully',
    jobId,
    status: 'cancelled'
  });
};

// ─── Get Result by ID ────────────────────────────────────────
const getResultById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    const result = await ToolResult.findById(id);
    if (!result) {
      return res.status(404).json({ error: 'Result not found' });
    }

    res.json(result);
  } catch (err) {
    console.error('Error fetching result:', err);
    res.status(500).json({ error: 'Failed to fetch result' });
  }
};

// ─── Get History ─────────────────────────────────────────────
const getHistory = async (req, res) => {
  try {
    const results = await ToolResult.find()
      .sort({ timestamp: -1 })
      .limit(50)
      .select('scanName target status timestamp');

    res.json(results);
  } catch (err) {
    console.error('Error fetching history:', err);
    res.status(500).json({ error: 'Failed to fetch scan history' });
  }
};

// ─── Get Metrics ─────────────────────────────────────────────
const getMetrics = async (req, res) => {
  try {
    const totalScans = await ToolResult.countDocuments();
    const successfulScans = await ToolResult.countDocuments({ status: 'completed' });
    const failedScans = await ToolResult.countDocuments({ status: 'failed' });

    res.json({ totalScans, successfulScans, failedScans });
  } catch (err) {
    console.error('Error fetching metrics:', err);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
};

module.exports = {
  startScan,
  getScanStatus,
  cancelScan,
  getResultById,
  getHistory,
  getMetrics
};
```

### 1.3 Model Template

```javascript
// backend/models/toolNameModel.js
const mongoose = require('mongoose');

const toolResultSchema = new mongoose.Schema({
  scanName:  { type: String, required: true },
  target:    { type: String, required: true },
  scanType:  { type: String },
  command:   { type: String },
  status:    { type: String, default: 'completed', enum: ['completed', 'failed', 'partial'] },
  result:    { type: mongoose.Schema.Types.Mixed },  // tool-specific output
  startTime: { type: Date },
  endTime:   { type: Date },
  duration:  { type: Number },  // seconds
  timestamp: { type: Date, default: Date.now }
});

// Explicitly name the collection (third argument)
const ToolResult = mongoose.model('ToolResult', toolResultSchema, 'toolResults');
module.exports = ToolResult;
```

### 1.4 Register Routes in server.js

```javascript
// In backend/server.js — add near existing route registrations
const toolNameRoutes = require('./routes/toolNameRoutes');
app.use('/api', toolNameRoutes);
```

---

## 2. Frontend Structure

Each tool gets its own directory:

```
frontend/src/components/
└── ToolName/
    ├── ToolName.js          # Router component (sub-routes)
    ├── DashboardPage.js     # Overview, metrics, recent scans
    ├── ScanPage.js          # Configure + start scan, progress tracking
    ├── ResultsPage.js       # View individual scan results
    ├── ToolName.css         # Shared styles for all pages
    ├── DashboardPage.css    # (optional) Page-specific styles
    ├── ScanPage.css         # (optional) Page-specific styles
    └── ResultsPage.css      # (optional) Page-specific styles
```

### 2.1 Router Component Template

```jsx
// frontend/src/components/ToolName/ToolName.js
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardPage from './DashboardPage';
import ScanPage from './ScanPage';
import ResultsPage from './ResultsPage';

const ToolName = () => {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="dashboard" />} />
      <Route path="dashboard" element={<DashboardPage />} />
      <Route path="scan" element={<ScanPage />} />
      <Route path="results/:scanId" element={<ResultsPage />} />
    </Routes>
  );
};

export default ToolName;
```

### 2.2 Register in App.js

```jsx
// In frontend/src/App.js
import ToolName from './components/ToolName/ToolName';

// Inside <Routes>:
<Route path="/tool-name/*" element={<ToolName />} />
```

### 2.3 Dashboard Page Template

```jsx
// frontend/src/components/ToolName/DashboardPage.js
import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Button, Table, Alert, Badge } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { API_URL } from '../../config';
import './ToolName.css';

const DashboardPage = () => {
  const navigate = useNavigate();
  const [scans, setScans] = useState([]);
  const [metrics, setMetrics] = useState({ totalScans: 0, successfulScans: 0, failedScans: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [historyRes, metricsRes] = await Promise.all([
        axios.get(`${API_URL}/toolname/history`),
        axios.get(`${API_URL}/toolname/metrics`)
      ]);
      setScans(historyRes.data);
      setMetrics(metricsRes.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <div className="text-center p-5"><div className="spinner-border" /></div>;
  if (error) return <Alert variant="danger">{error}</Alert>;

  return (
    <div className="tool-dashboard p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Tool Name Dashboard</h2>
        <Button variant="primary" onClick={() => navigate('/tool-name/scan')}>
          <i className="fas fa-plus me-2" />New Scan
        </Button>
      </div>

      {/* Stats Cards */}
      <Row className="mb-4">
        <Col md={4}>
          <Card className="stat-card">
            <Card.Body>
              <h6 className="text-muted">Total Scans</h6>
              <h3>{metrics.totalScans}</h3>
            </Card.Body>
          </Card>
        </Col>
        {/* More stat cards */}
      </Row>

      {/* Recent Scans Table */}
      <Card>
        <Card.Header><h5>Recent Scans</h5></Card.Header>
        <Card.Body>
          <Table striped hover responsive>
            <thead>
              <tr>
                <th>Scan Name</th>
                <th>Target</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {scans.map(scan => (
                <tr key={scan._id}>
                  <td>{scan.scanName}</td>
                  <td>{scan.target}</td>
                  <td><Badge bg={scan.status === 'completed' ? 'success' : 'danger'}>{scan.status}</Badge></td>
                  <td>{new Date(scan.timestamp).toLocaleString()}</td>
                  <td>
                    <Link to={`/tool-name/results/${scan._id}`}>
                      <Button size="sm" variant="outline-primary">View</Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </div>
  );
};

export default DashboardPage;
```

### 2.4 Scan Page Template (with Polling)

```jsx
// frontend/src/components/ToolName/ScanPage.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Row, Col, Card, Form, Button, Alert, ProgressBar } from 'react-bootstrap';
import { API_URL } from '../../config';
import './ToolName.css';

const ScanPage = () => {
  const navigate = useNavigate();

  // Form state
  const [scanName, setScanName] = useState('');
  const [target, setTarget] = useState('');

  // Scan state
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [currentJobId, setCurrentJobId] = useState(null);
  const [logs, setLogs] = useState([]);

  // ─── Start Scan ────────────────────────────────────────
  const handleStartScan = async () => {
    setError('');
    setStatusMessage('');

    if (!scanName.trim() || !target.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      setScanning(true);
      setProgress(0);
      setLogs([]);

      const response = await axios.post(`${API_URL}/toolname/scan`, { scanName, target });
      const { jobId } = response.data;
      setCurrentJobId(jobId);
      setStatusMessage('Scan started...');
      pollStatus(jobId);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start scan');
      setScanning(false);
    }
  };

  // ─── Poll Status ────────────────────────────────────────
  const pollStatus = (jobId) => {
    const interval = setInterval(async () => {
      try {
        const { data } = await axios.get(`${API_URL}/toolname/status/${jobId}`);
        setProgress(data.progress);
        if (data.logs?.length > 0) setLogs(data.logs);

        if (data.status === 'completed') {
          clearInterval(interval);
          setScanning(false);
          setCurrentJobId(null);
          setStatusMessage('Scan completed!');
          // Navigate to results
          if (data.result?.id) {
            navigate(`/tool-name/results/${data.result.id}`);
          }
        } else if (data.status === 'failed' || data.status === 'cancelled') {
          clearInterval(interval);
          setScanning(false);
          setCurrentJobId(null);
          setError(data.error || `Scan ${data.status}`);
        } else {
          // running
          const remaining = Math.max(0, Math.round((data.estimatedTime - data.elapsedTime) / 60));
          setStatusMessage(remaining > 0
            ? `Scan in progress... ~${remaining} min remaining`
            : 'Scan in progress... finalizing results');
        }
      } catch {
        // Continue polling even on network error
      }
    }, 5000); // 5-second interval
  };

  // ─── Cancel Scan ─────────────────────────────────────────
  const handleCancel = async () => {
    if (!currentJobId) return;
    try {
      await axios.post(`${API_URL}/toolname/cancel/${currentJobId}`);
      setScanning(false);
      setProgress(0);
      setCurrentJobId(null);
      setStatusMessage('Scan cancelled.');
    } catch (err) {
      setError('Failed to cancel scan');
    }
  };

  // ─── Render ──────────────────────────────────────────────
  return (
    <div className="scan-page p-4">
      <h2 className="mb-4">New Scan</h2>

      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {statusMessage && !error && <Alert variant="info">{statusMessage}</Alert>}

      <Card>
        <Card.Body>
          <Form>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Scan Name</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter scan name"
                    value={scanName}
                    onChange={e => setScanName(e.target.value)}
                    disabled={scanning}
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Target</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter target (IP, URL, etc.)"
                    value={target}
                    onChange={e => setTarget(e.target.value)}
                    disabled={scanning}
                  />
                </Form.Group>
              </Col>
            </Row>

            {/* Tool-specific options go here */}

            {scanning && (
              <div className="mb-3">
                <ProgressBar now={progress} label={`${progress}%`} animated striped />
              </div>
            )}

            <div className="d-flex gap-2">
              {!scanning ? (
                <Button variant="primary" onClick={handleStartScan}>Start Scan</Button>
              ) : (
                <Button variant="danger" onClick={handleCancel}>Cancel Scan</Button>
              )}
            </div>
          </Form>
        </Card.Body>
      </Card>

      {/* Log viewer (optional) */}
      {logs.length > 0 && (
        <Card className="mt-3">
          <Card.Header>Scan Logs</Card.Header>
          <Card.Body style={{ maxHeight: '300px', overflow: 'auto' }}>
            {logs.map((log, i) => (
              <div key={i} className={`log-entry log-${log.type}`}>
                <small className="text-muted">{new Date(log.timestamp).toLocaleTimeString()}</small>
                {' '}{log.message}
              </div>
            ))}
          </Card.Body>
        </Card>
      )}
    </div>
  );
};

export default ScanPage;
```

### 2.5 Results Page Template

```jsx
// frontend/src/components/ToolName/ResultsPage.js
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Row, Col, Card, Alert, Table, Badge, Button, Spinner, Tabs, Tab } from 'react-bootstrap';
import { API_URL } from '../../config';
import './ToolName.css';

const ResultsPage = () => {
  const { scanId } = useParams();
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('summary');

  useEffect(() => {
    if (scanId) fetchResults(scanId);
  }, [scanId]);

  const fetchResults = async (id) => {
    try {
      setIsLoading(true);
      const { data } = await axios.get(`${API_URL}/toolname/results/${id}`);
      setResults(data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <div className="text-center p-5"><Spinner animation="border" /></div>;
  if (error) return <Alert variant="danger">{error}</Alert>;
  if (!results) return <Alert variant="warning">No results found.</Alert>;

  return (
    <div className="results-page p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>{results.scanName}</h2>
        <Link to="/tool-name/dashboard">
          <Button variant="outline-secondary">Back to Dashboard</Button>
        </Link>
      </div>

      <Tabs activeKey={activeTab} onSelect={setActiveTab} className="mb-3">
        <Tab eventKey="summary" title="Summary">
          <Card>
            <Card.Body>
              <Row>
                <Col md={6}>
                  <p><strong>Target:</strong> {results.target}</p>
                  <p><strong>Scan Type:</strong> {results.scanType}</p>
                  <p><strong>Status:</strong> <Badge bg="success">{results.status}</Badge></p>
                </Col>
                <Col md={6}>
                  <p><strong>Date:</strong> {new Date(results.timestamp).toLocaleString()}</p>
                  <p><strong>Duration:</strong> {results.duration}s</p>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="results" title="Results">
          <Card>
            <Card.Body>
              {/* Tool-specific results table/display goes here */}
              <Table striped hover responsive>
                <thead>
                  <tr>
                    <th>Finding</th>
                    <th>Severity</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Map over results data */}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="details" title="Scan Details">
          <Card>
            <Card.Body>
              <p><strong>Command:</strong> <code>{results.command}</code></p>
              {/* Additional scan metadata */}
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>
    </div>
  );
};

export default ResultsPage;
```

---

## 3. CSS Template

```css
/* frontend/src/components/ToolName/ToolName.css */

/* Shared styles for all pages in this tool */

.tool-dashboard,
.scan-page,
.results-page {
  max-width: 1400px;
  margin: 0 auto;
}

.stat-card {
  transition: transform 0.2s;
  border: none;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.stat-card:hover {
  transform: translateY(-2px);
}

.log-entry {
  font-family: 'Courier New', monospace;
  font-size: 0.85rem;
  padding: 2px 0;
}

.log-info { color: #495057; }
.log-warning { color: #856404; }
.log-error { color: #721c24; }
.log-success { color: #155724; }
.log-phase { color: #004085; font-weight: bold; }
```

---

## 4. Sidebar Registration

Add the tool to `frontend/src/components/Sidebar/config/menuItems.js` (or wherever sidebar config lives):

```javascript
{
  label: 'Tool Name',
  icon: 'FaToolbox',     // react-icons name
  path: '/tool-name',     // matches App.js route
  // OR for nested items:
  children: [
    { label: 'Dashboard', path: '/tool-name/dashboard', icon: 'FaChartBar' },
    { label: 'New Scan', path: '/tool-name/scan', icon: 'FaPlus' },
  ]
}
```

---

## 5. Checklist: Building a New Tool

- [ ] Create `backend/models/toolNameModel.js` with Mongoose schema
- [ ] Create `backend/controllers/toolNameController.js` with async job pattern
- [ ] Create `backend/routes/toolNameRoutes.js` with standard endpoints
- [ ] Register routes in `backend/server.js`
- [ ] Create `frontend/src/components/ToolName/` directory
- [ ] Create `ToolName.js` (router), `DashboardPage.js`, `ScanPage.js`, `ResultsPage.js`
- [ ] Create `ToolName.css` with shared styles
- [ ] Register route in `frontend/src/App.js` with wildcard `/*`
- [ ] Add to sidebar config
- [ ] Use `import { API_URL } from '../../config'` — no hardcoded URLs
- [ ] Use React Bootstrap only — no MUI
- [ ] Use Recharts for charts — no chart.js
- [ ] Dependency audit — `npm audit` + `npm outdated`, update/replace vulnerable or outdated packages
- [ ] Test locally + in Docker
