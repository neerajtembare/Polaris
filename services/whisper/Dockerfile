# syntax=docker/dockerfile:1
# ─────────────────────────────────────────────────────────────────────────────
# Polaris — Whisper Transcription Service
# Base: NVIDIA CUDA 12.1 + Python 3.11 (matches faster-whisper CUDA requirements)
# Port: 8001
# ─────────────────────────────────────────────────────────────────────────────
FROM nvidia/cuda:12.1.1-cudnn8-runtime-ubuntu22.04

# Avoid interactive prompts during apt installs
ENV DEBIAN_FRONTEND=noninteractive

# Python + pip
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.11 \
    python3.11-dev \
    python3-pip \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Make python3.11 the default python3/python
RUN update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1 \
    && update-alternatives --install /usr/bin/python python /usr/bin/python3.11 1

WORKDIR /app

# Install Python dependencies first (layer-cached unless requirements change)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY . .

EXPOSE 8001

# Healthcheck — lightweight endpoint, model stays loaded between requests
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8001/health || exit 1

# Start the FastAPI server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
