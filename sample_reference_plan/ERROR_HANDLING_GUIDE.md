# CyTrust — Error Handling Guide

**Every tool MUST follow these error handling patterns for consistency.**  
**Reference:** Port Scanner implementation (`scanController.js`, `ScanPage.js`)

---

## 1. Backend Error Handling

### 1.1 HTTP Status Codes

Use these consistently across ALL controllers:

| Status | When to Use | Example |
|--------|-------------|---------|
| **200** | Success — data returned | `res.json(data)` |
| **201** | Resource created | After saving new scan result to DB |
| **400** | Client error — bad input | Missing required fields, invalid format, duplicate name |
| **404** | Not found | Job ID doesn't exist, scan result not in DB |
| **500** | Server error — unexpected failure | DB connection error, process crash |

### 1.2 Error Response Shape

**Always return errors as JSON objects with an `error` key:**

```javascript
// ✅ CORRECT — consistent shape
res.status(400).json({ error: 'Scan name and target are required' });
res.status(404).json({ error: 'Job not found' });
res.status(500).json({ error: 'Failed to start scan' });

// ❌ WRONG — inconsistent shapes
res.status(400).send('Bad request');                    // plain text
res.status(400).json({ message: 'Bad request' });      // 'message' key
res.status(400).json({ success: false, msg: '...' });  // different structure
res.status(400).json('Bad request');                    // string in JSON
```

### 1.3 Success Response Shape

**Return data directly — no wrapper object:**

```javascript
// ✅ CORRECT — direct data
res.json({ totalScans: 10, successfulScans: 8 });       // metrics
res.json([{ scanName: '...', target: '...' }]);          // array
res.json({ jobId: '...', message: 'Scan started' });     // job response

// ❌ WRONG — unnecessary wrappers
res.json({ success: true, data: { totalScans: 10 } });   // wrapper
res.json({ status: 'ok', results: [...] });               // wrapper
```

### 1.4 Validation Pattern

Validate at the top of every controller function, return early on failure:

```javascript
const startScan = async (req, res) => {
  try {
    const { scanName, target } = req.body;

    // 1. Required field validation
    if (!scanName || !target) {
      return res.status(400).json({ error: 'Scan name and target are required' });
    }

    // 2. Format validation
    if (scanName.length > 100) {
      return res.status(400).json({ error: 'Scan name must be 100 characters or less' });
    }

    // 3. Business rule validation
    const existing = await Model.findOne({ scanName });
    if (existing) {
      return res.status(400).json({ error: 'Scan name already exists. Please choose a different name.' });
    }

    // 4. MongoDB ID validation (for :id params)
    if (!isValidObjectId(id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    // ... proceed with logic
  } catch (err) {
    console.error('Error in startScan:', err);
    res.status(500).json({ error: 'Failed to start scan' });
  }
};
```

### 1.5 Try-Catch Pattern

**Every async controller function MUST have a top-level try-catch:**

```javascript
// ✅ CORRECT
const getHistory = async (req, res) => {
  try {
    const results = await Model.find().sort({ timestamp: -1 });
    res.json(results);
  } catch (err) {
    console.error('Error fetching history:', err);
    res.status(500).json({ error: 'Failed to fetch scan history' });
  }
};

// ❌ WRONG — unhandled promise rejection
const getHistory = async (req, res) => {
  const results = await Model.find();  // if this fails, server crashes
  res.json(results);
};
```

### 1.6 Child Process Error Handling

When using `spawn` for external tools:

```javascript
const process = spawn('tool', args);

// 1. Handle process spawn failure
process.on('error', (err) => {
  job.status = 'failed';
  job.error = `Failed to start process: ${err.message}`;
  job.logs.push({
    timestamp: new Date().toISOString(),
    message: `Process error: ${err.message}`,
    type: 'error'
  });
});

// 2. Handle non-zero exit code
process.on('close', (code) => {
  if (code !== 0 && job.status !== 'cancelled') {
    job.status = 'failed';
    job.error = stderr || `Process exited with code ${code}`;
  }
});

// 3. Log stderr but DON'T auto-fail
// Many tools write progress, warnings, or debug info to stderr
process.stderr.on('data', (data) => {
  const msg = data.toString();
  // Only log it — don't set status to 'failed'
  job.logs.push({
    timestamp: new Date().toISOString(),
    message: msg.trim(),
    type: 'warning'
  });
});
```

### 1.7 Error Messages

**Write user-friendly error messages:**

```javascript
// ✅ CORRECT — tells user what to do
{ error: 'Scan name already exists. Please choose a different name.' }
{ error: 'Invalid IP address format. Use x.x.x.x notation.' }
{ error: 'Shodan API key not configured. Set SHODAN_API_KEY in environment.' }

// ❌ WRONG — too technical or vague
{ error: 'ECONNREFUSED' }
{ error: 'Error' }
{ error: 'MongoServerError: E11000 duplicate key error collection...' }
```

---

## 2. Frontend Error Handling

### 2.1 API Call Pattern

```javascript
// Pattern A: async/await (PREFERRED for data fetching)
const fetchData = async () => {
  try {
    setIsLoading(true);
    setError(null);
    const { data } = await axios.get(`${API_URL}/toolname/history`);
    setResults(data);
  } catch (err) {
    setError(err.response?.data?.error || err.message);
  } finally {
    setIsLoading(false);
  }
};

// Pattern B: .then/.catch (acceptable for fire-and-forget like startScan)
axios.post(`${API_URL}/toolname/scan`, payload)
  .then(response => {
    setCurrentJobId(response.data.jobId);
    pollStatus(response.data.jobId);
  })
  .catch(err => {
    setError(err.response?.data?.error || 'Failed to start scan');
    setScanning(false);
  });
```

### 2.2 Error Extraction from Axios

Always use this pattern to extract errors:

```javascript
// The error might be in different places depending on the response
const errorMessage =
  err.response?.data?.error ||    // our standard { error: "..." } format
  err.response?.data ||           // plain text response
  err.message ||                  // network error
  'An unexpected error occurred'; // ultimate fallback
```

### 2.3 Error Display

Use Bootstrap `<Alert>` for errors:

```jsx
// Dismissible error alert at the top of the page
{error && (
  <Alert variant="danger" dismissible onClose={() => setError('')}>
    {error}
  </Alert>
)}

// Non-dismissible error (full-page error state)
if (error) return <Alert variant="danger">{error}</Alert>;
```

### 2.4 Loading States

```jsx
// Full-page loading
if (isLoading) {
  return (
    <div className="text-center p-5">
      <Spinner animation="border" />
      <p className="mt-2 text-muted">Loading...</p>
    </div>
  );
}

// Inline loading (button)
<Button disabled={scanning}>
  {scanning ? <><Spinner size="sm" className="me-2" />Scanning...</> : 'Start Scan'}
</Button>
```

### 2.5 Empty State

When there's no data (but no error):

```jsx
{scans.length === 0 && (
  <Alert variant="info">
    No scans found. Click "New Scan" to get started.
  </Alert>
)}
```

### 2.6 Polling Error Handling

During status polling, DON'T show errors for individual poll failures:

```javascript
const pollStatus = (jobId) => {
  const interval = setInterval(async () => {
    try {
      const { data } = await axios.get(`${API_URL}/toolname/status/${jobId}`);
      // ... handle status
    } catch {
      // Silently continue polling — transient network errors are normal
      // Only stop polling on terminal states (completed, failed, cancelled)
    }
  }, 5000);
};
```

---

## 3. Log Entry Types

When creating log entries for job tracking, use these types:

| Type | When to Use | Color |
|------|-------------|-------|
| `info` | General status updates | `#495057` (dark gray) |
| `warning` | Non-fatal issues, stderr output | `#856404` (amber) |
| `error` | Fatal errors, failures | `#721c24` (red) |
| `success` | Completion, passed checks | `#155724` (green) |
| `phase` | Phase transitions (multi-step scans) | `#004085` (blue, bold) |

```javascript
// Log entry shape (consistent across all tools)
{
  timestamp: new Date().toISOString(),  // always ISO string
  message: "Human-readable message",    // never raw stack traces
  type: "info"                          // one of: info, warning, error, success, phase
}
```

---

## 4. Common Error Scenarios & Handling

| Scenario | Backend | Frontend |
|----------|---------|----------|
| Required field missing | `400 { error: 'Field X is required' }` | Show error alert, keep form enabled |
| Duplicate name | `400 { error: 'Name already exists...' }` | Show error alert, let user change name |
| Invalid ID format | `400 { error: 'Invalid ID format' }` | Show error, offer "Back to Dashboard" link |
| Record not found | `404 { error: 'Result not found' }` | Show "Not found" alert with back link |
| External tool not installed | `500 { error: 'Tool X not available...' }` | Show error with suggestion to check Docker |
| DB connection error | `500 { error: 'Failed to save results' }` | Show error, suggest retry |
| Process timeout | Set job status to `'failed'` | Auto-handled by polling (shows error) |
| Process killed by user | Set job status to `'cancelled'` | Show "Scan cancelled" message |
| Network error (fetch fails) | N/A | Show generic connection error |

---

## 5. Security-Related Error Handling

### Never expose internal details:

```javascript
// ✅ CORRECT — generic message for production
res.status(500).json({ error: 'Failed to connect to database' });

// ❌ WRONG — exposes internal info
res.status(500).json({ error: `MongoDB connection failed: mongodb://admin:password@host:27017` });
```

### Always log details server-side:

```javascript
} catch (err) {
  console.error('Error in startScan:', err);  // full error in server logs
  res.status(500).json({ error: 'Failed to start scan' });  // sanitized for client
}
```
