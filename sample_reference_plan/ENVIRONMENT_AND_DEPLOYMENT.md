# CyTrust — Environment & Deployment Guide

**How to make every tool work both locally and in Docker.**  
**Read this before building or reworking any tool.**

---

## 1. Two Environments — Key Differences

| Concern | Local Development | Docker |
|---------|------------------|--------|
| **Backend start** | `cd backend && npx nodemon server.js` | `docker-compose up backend` |
| **Frontend start** | `cd frontend && npm start` | `docker-compose up frontend` |
| **MongoDB** | `mongodb://localhost:27017/CyTrust` | `mongodb://mongo:27017/CyTrust` |
| **Backend URL (from browser)** | `http://localhost:5001` | `http://localhost:5001` (same!) |
| **Backend URL (container→container)** | N/A | `http://backend:5001` |
| **MongoDB port (from host)** | `27017` | `27018` (mapped) |
| **File paths** | Direct filesystem | Volume mounts |
| **External tools** | Must install yourself | Installed in Dockerfile |
| **Hot reload** | Automatic (nodemon / CRA) | Volume mounts + nodemon |
| **Debug port** | Direct | `9229` (expose in dev compose) |

### The Critical Distinction: Browser vs Container Networking

The frontend runs **in the user's browser**, not inside a Docker container. This means:

```
Browser → API calls → http://localhost:5001  ← ALWAYS, even in Docker
                                                (because port 5001 is mapped to host)

Container → Container → http://backend:5001  ← Only for server-to-server calls
                                                (Docker internal DNS)
```

**Result:** `REACT_APP_API_URL` should ALWAYS be `http://localhost:5001` for both local and Docker development, because the browser always accesses the host. The `REACT_APP_BACKEND_URL=http://backend:5001` in docker-compose.yml is **wrong** for the current dev-server setup (it only works inside the Docker network, but the browser is outside it).

For a **production** nginx build, you'd use a reverse proxy so the frontend and backend share the same origin — but that's a future concern.

---

## 2. Environment Variables — Complete Reference

### 2.1 Backend Environment Variables

| Variable | Purpose | Local Default | Docker Value | Required? |
|----------|---------|---------------|-------------|-----------|
| `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017/CyTrust` | `mongodb://mongo:27017/CyTrust` | Yes |
| `PORT` | Backend server port | `5001` | `5001` | No (default) |
| `NODE_ENV` | Environment mode | `development` | `development` or `production` | No |
| `JWT_SECRET` | JWT signing secret | Set in `.env` | Set in `.env` | Yes (when auth enabled) |
| `SHODAN_API_KEY` | Shodan API access | Set in `.env` | Passed from host `.env` | For Shodan |
| `FACT_API_URL` | FACT firmware service URL | `http://localhost:5000` | `http://fact_api:5000` | For FACT |
| `SKIP_GCLOUD` | Skip gcloud init on startup | `true` | `true` | No |
| `DEBUG` | Enable debug logging | Not set | `true` (dev compose) | No |

### 2.2 Frontend Environment Variables

| Variable | Purpose | Local Default | Docker Value |
|----------|---------|---------------|-------------|
| `REACT_APP_API_URL` | Backend API base URL | `http://localhost:5001` | `http://localhost:5001` |
| `REACT_APP_FACT_URL` | FACT service URL (separate) | `http://localhost:5000` | `http://localhost:5000` |
| `FAST_REFRESH` | React hot reload | `true` (CRA default) | `true` |
| `CHOKIDAR_USEPOLLING` | File watcher for Docker | Not needed | `true` |

**Important:** CRA bakes `REACT_APP_*` variables at **build time** (during `npm run build`). In development mode (`npm start`), they're read at runtime. Since our Docker setup runs the dev server (not a production build), the env vars work — but this will change when we move to an nginx production build.

### 2.3 File Setup

**Root `.env`** (for docker-compose to read):
```env
SHODAN_API_KEY=your_key_here
FACT_API_URL=http://localhost:5000
JWT_SECRET=your_jwt_secret_here
NODE_ENV=development
```

**`frontend/.env.development`** (for local `npm start`):
```env
REACT_APP_API_URL=http://localhost:5001
REACT_APP_FACT_URL=http://localhost:5000
```

**`frontend/.env.example`** (documentation):
```env
# CyTrust Frontend Configuration
REACT_APP_API_URL=http://localhost:5001
REACT_APP_FACT_URL=http://localhost:5000
```

---

## 3. Centralized API Configuration

### 3.1 Frontend Config (`frontend/src/config/api.js`)

```javascript
// Single source of truth for API URLs
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';
const API_URL = `${API_BASE_URL}/api`;

// Separate URL for FACT (different service/container)
const FACT_API_URL = process.env.REACT_APP_FACT_URL || 'http://localhost:5000';
const FACT_URL = `${FACT_API_URL}/api/fact`;

export { API_BASE_URL, API_URL, FACT_API_URL, FACT_URL };
```

### 3.2 Usage in Components

```javascript
// ✅ CORRECT — import from config
import { API_URL } from '../../config';
const response = await axios.get(`${API_URL}/scan-history`);

// ✅ CORRECT — FACT uses its own URL
import { FACT_URL } from '../../config';
const response = await axios.post(`${FACT_URL}/upload`, formData);

// ❌ WRONG — hardcoded URL
const response = await axios.get('http://localhost:5001/api/scan-history');
```

### 3.3 Backend Config

Backend controllers use `process.env` directly:

```javascript
// ✅ CORRECT
const FACT_API_URL = process.env.FACT_API_URL || 'http://localhost:5000';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/CyTrust';
const SHODAN_API_KEY = process.env.SHODAN_API_KEY;

// ❌ WRONG — hardcoded
const FACT_API_URL = 'http://localhost:5001';
```

---

## 4. External Tool Dependencies

### 4.1 Tools Installed in Docker (backend Dockerfile)

| Tool | Binary/Command | Installed Via | Used By |
|------|---------------|---------------|---------|
| `nmap` | `nmap` | `apt-get` | Port Scanner |
| `syft` | `syft` | curl install script | SBOM Generator |
| `wapiti` | `wapiti` | `pip install wapiti3` | Web Scanner |
| `certigo` | `certigo` | Binary download | Certificate Scanner |
| `ping` | `ping` | `iputils-ping` apt | Device ping |
| Python 3.10 | `python3` | Base image | Cert Scanner scripts |
| Node.js | `node` | `apt-get` | Application runtime |

### 4.2 Tools NOT in Docker (need separate containers or local install)

| Tool | Used By | Status | Plan |
|------|---------|--------|------|
| `prowler` | Cloud Scanner | Not installed | Separate container (deferred) |
| `aws` CLI | AWS Scanner | Not installed | Separate container (deferred) |
| `gcloud` CLI | GCP Scanner | Not installed | Separate container (deferred) |
| `az` CLI | Azure Scanner | Not installed | Separate container (deferred) |
| FACT Core | Firmware Analysis | Commented out | Separate compose stack (deferred) |

### 4.3 Local Development — Installing Tools

For local development, you need these installed on your machine:

```bash
# Required for all development
node --version    # v18+
npm --version     # v9+
mongod --version  # MongoDB 6+

# Required per tool (install only what you're working on)
nmap --version    # Port Scanner
syft version      # SBOM Generator
wapiti --version  # Web Scanner
certigo --version # Certificate Scanner (optional, Python fallback exists)
```

**MongoDB locally:**
```bash
# Ubuntu/Debian
sudo systemctl start mongod

# macOS (Homebrew)
brew services start mongodb-community

# Verify
mongosh --eval "db.runCommand({ping:1})"
```

### 4.4 Writing Code That Works in Both Environments

When spawning external tools, always handle the "tool not found" case:

```javascript
const scanProcess = spawn('nmap', args);

scanProcess.on('error', (err) => {
  if (err.code === 'ENOENT') {
    job.status = 'failed';
    job.error = 'nmap is not installed. Install it or run in Docker.';
  } else {
    job.status = 'failed';
    job.error = `Failed to start process: ${err.message}`;
  }
});
```

---

## 5. File Paths — Local vs Docker

### 5.1 The Path Rules

```javascript
// ✅ CORRECT — relative to __dirname (works everywhere)
const outputDir = path.resolve(__dirname, '../output');
const uploadsDir = path.resolve(__dirname, '../uploads');
const scriptsDir = path.resolve(__dirname, '../Scanner');

// ❌ WRONG — assumes specific directory structure
const outputDir = path.resolve(__dirname, '../backend/output');  // double-nesting bug
const outputDir = '/app/output';                                  // Docker-only absolute path
const outputDir = '/home/user/cytrust/backend/output';           // machine-specific
```

### 5.2 Volume Mounts in Docker

From `docker-compose.yml`:
```yaml
volumes:
  - ./data:/app/data              # Persistent data
  - scan_results:/app/scanResults # Named volume for scan reports
  - upload_data:/app/uploads      # Named volume for uploads
```

**In dev mode** (`docker-compose.dev.yml`):
```yaml
volumes:
  - ./backend:/app:delegated       # Source code mounted for hot reload
  - /app/node_modules              # Keep container's node_modules
```

### 5.3 Ensuring Directories Exist

At the top of controllers or at startup, ensure required directories exist:

```javascript
const fs = require('fs');
const path = require('path');

const outputDir = path.resolve(__dirname, '../output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}
```

The Dockerfile also creates key directories:
```dockerfile
RUN mkdir -p uploads temp-uploads logs && chmod 755 uploads temp-uploads logs
```

---

## 6. Startup Script Specification

### `cytrust.sh` — Interactive Development CLI

```
Location: /cytrust_docker/cytrust.sh
Permissions: chmod +x cytrust.sh
```

**Menu options:**

| # | Option | What It Does |
|---|--------|-------------|
| 1 | Run Locally | Check MongoDB → start backend (nodemon) + frontend (npm start) |
| 2 | Run in Docker | `docker-compose up -d` → tail logs |
| 3 | Run Docker Dev | `docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d` |
| 4 | Stop All | Kill local processes + `docker-compose down` |
| 5 | Build Docker | `docker-compose build` (add `--no-cache` flag option) |
| 6 | View Logs | `docker-compose logs -f` (with service filter option) |
| 7 | Reset Database | Drop CyTrust DB and restart |
| 0 | Exit | |

**Prerequisite checks before each option:**

| Option | Checks |
|--------|--------|
| Run Locally | MongoDB running, node/npm installed, `.env` exists |
| Run Docker | Docker daemon running, docker-compose available |
| Build | Docker daemon running |

**Key behaviors:**
- If `.env` doesn't exist, copy from `.env.example` and warn user
- Display service URLs after startup: `Frontend: http://localhost:3000`, `Backend: http://localhost:5001`
- For "Run Locally," use `concurrently` or background processes with cleanup on Ctrl+C
- Color-coded output for readability

---

## 7. Testing Checklist — Both Environments

After making changes to any tool, verify it works in **both** environments:

### 7.1 Local Testing

```bash
# 1. Start services
./cytrust.sh  # Option 1 (Run Locally)

# 2. Verify backend
curl http://localhost:5001/health
# Expected: { "status": "ok" }

# 3. Verify frontend
# Open http://localhost:3000 in browser
# Check DevTools Console — no errors
# Check DevTools Network — API calls go to localhost:5001

# 4. Test the specific tool
# Run through the full workflow: start scan → view progress → view results

# 5. Check database
mongosh CyTrust --eval "db.collectionName.find().limit(1).pretty()"
```

### 7.2 Docker Testing

```bash
# 1. Build & start
docker-compose build
docker-compose up -d

# 2. Verify all services
docker-compose ps
# All should show "Up" / "healthy"

# 3. Check logs
docker-compose logs backend | tail -20
docker-compose logs frontend | tail -20

# 4. Verify backend health
curl http://localhost:5001/health

# 5. Verify frontend
# Open http://localhost:3000
# Same checks as local

# 6. Verify external tools inside container
docker exec backend nmap --version
docker exec backend syft version
docker exec backend wapiti --version
docker exec backend certigo --version

# 7. Test the specific tool (same workflow as local)

# 8. Stop
docker-compose down
```

### 7.3 Quick Smoke Test Script

Run this after any change to verify nothing is broken:

```bash
# Backend health
curl -s http://localhost:5001/health | grep -q "ok" && echo "✅ Backend OK" || echo "❌ Backend FAIL"

# Frontend loads
curl -s http://localhost:3000 | grep -q "root" && echo "✅ Frontend OK" || echo "❌ Frontend FAIL"

# API responds
curl -s http://localhost:5001/api/scan-types | grep -q "Quick" && echo "✅ API OK" || echo "❌ API FAIL"

# No hardcoded URLs remaining
HARDCODED=$(grep -r "localhost:5001" frontend/src/components/ frontend/src/services/ --include="*.js" -l 2>/dev/null | wc -l)
echo "⚠️  Files with hardcoded URLs: $HARDCODED"
```

---

## 8. Docker Image Considerations

### 8.1 Current Backend Image

- **Base:** `python:3.10-slim` (not node-based — installs node via apt)
- **Size:** ~1.2GB (includes nmap, syft, wapiti, certigo, Python, Node)
- **User:** Non-root `cytrust` with sudo only for nmap
- **Capabilities:** `NET_RAW` + `NET_ADMIN` (for nmap raw sockets)

### 8.2 Current Frontend Image

- **Base:** `node:18-alpine`
- **Mode:** Development server (`npm start`) — NOT a production build
- **Size:** ~500MB (includes all node_modules)
- **Issue:** No nginx, no build optimization, no gzip

### 8.3 Future Production Frontend (when ready)

```dockerfile
# Build stage
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG REACT_APP_API_URL=http://localhost:5001
ENV REACT_APP_API_URL=$REACT_APP_API_URL
RUN npm run build

# Serve stage
FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
```

**Note:** This bakes `REACT_APP_API_URL` at build time. For different deployment targets, rebuild with the correct ARG or use runtime env injection with a startup script.

---

## 9. Common Gotchas

### 9.1 "Works locally but not in Docker"

| Symptom | Cause | Fix |
|---------|-------|-----|
| API calls fail in browser | URL uses `backend:5001` (Docker DNS) | Use `localhost:5001` (browser is on the host) |
| Can't connect to MongoDB | Using `localhost:27017` in Docker | Use `mongo:27017` (Docker service name) |
| Tool not found (ENOENT) | Tool not installed in Docker image | Add to Dockerfile or handle gracefully |
| Permission denied for nmap | Missing sudo or capabilities | Ensure `NET_RAW`/`NET_ADMIN` caps and sudoers entry |
| File not found | Wrong path (double `backend/` or absolute) | Use `path.resolve(__dirname, '../relative')` |
| Node modules missing | Volume mount overrides container's `node_modules` | Add `- /app/node_modules` to volumes |

### 9.2 "Works in Docker but not locally"

| Symptom | Cause | Fix |
|---------|-------|-----|
| MongoDB connection refused | MongoDB not running locally | `sudo systemctl start mongod` |
| nmap needs password | Running without sudo locally | Script should prompt or handle `requiresSudo` |
| Different Node version | Local vs Docker node mismatch | Use nvm: `nvm use 18` |
| Missing Python tools | wapiti/certigo not installed locally | Install per tool or skip that tool locally |

### 9.3 Port Conflicts

| Port | Service | If Conflicted |
|------|---------|---------------|
| 3000 | Frontend | `PORT=3001 npm start` or change in docker-compose |
| 5001 | Backend | Change in `server.js` + docker-compose + frontend config |
| 27017 | MongoDB (local) | Usually not conflicted |
| 27018 | MongoDB (Docker mapped) | Change in docker-compose |
| 9229 | Node debugger | Only in dev compose |
