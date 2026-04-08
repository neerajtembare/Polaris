"""
@file main.py
@description Polaris Whisper Transcription Service
             FastAPI microservice that accepts an audio file and returns
             the transcribed text using faster-whisper (GPU-accelerated).

             Endpoints:
               GET  /health         — liveness/readiness probe
               POST /transcribe     — transcribe uploaded audio file

@dependencies
  - faster-whisper: CTranslate2-based Whisper inference
  - fastapi + uvicorn: HTTP server
  - python-multipart: multipart/form-data upload support

@relatedFiles
  - apps/backend/src/routes/voice.ts     (forwards audio here)
  - apps/backend/src/services/voice.service.ts
"""

import os
import io
import time
import logging
import tempfile
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from faster_whisper import WhisperModel

# ─────────────────────────────────────────────────────────────────────────────
# Config (from environment — matches .env.example)
# ─────────────────────────────────────────────────────────────────────────────

MODEL_SIZE     = os.getenv("WHISPER_MODEL", "large-v3")
DEVICE         = os.getenv("WHISPER_DEVICE", "cuda")
COMPUTE_TYPE   = os.getenv("WHISPER_COMPUTE_TYPE", "float16")

# Supported audio MIME types (browsers emit these via MediaRecorder)
SUPPORTED_TYPES = {
    "audio/webm",
    "audio/webm;codecs=opus",
    "audio/ogg",
    "audio/ogg;codecs=opus",
    "audio/wav",
    "audio/wave",
    "audio/x-wav",
    "audio/mpeg",
    "audio/mp4",
}

# ─────────────────────────────────────────────────────────────────────────────
# Logging
# ─────────────────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
log = logging.getLogger("whisper-service")

# ─────────────────────────────────────────────────────────────────────────────
# Model — loaded once at startup, reused for all requests (avoids cold start)
# ─────────────────────────────────────────────────────────────────────────────

_model: WhisperModel | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load the Whisper model on startup; release on shutdown."""
    global _model
    log.info(f"Loading Whisper model '{MODEL_SIZE}' on {DEVICE} ({COMPUTE_TYPE})...")
    start = time.time()
    try:
        _model = WhisperModel(MODEL_SIZE, device=DEVICE, compute_type=COMPUTE_TYPE)
        elapsed = time.time() - start
        log.info(f"Model loaded in {elapsed:.1f}s — ready to transcribe")
    except Exception as exc:
        log.error(f"Failed to load model: {exc}")
        # Fall back to CPU so the service still starts (degraded performance)
        log.warning("Falling back to CPU with int8 compute type")
        _model = WhisperModel(MODEL_SIZE, device="cpu", compute_type="int8")
    yield
    # Shutdown
    _model = None
    log.info("Whisper model released")


# ─────────────────────────────────────────────────────────────────────────────
# App
# ─────────────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Polaris Whisper Service",
    description="Speech-to-text transcription for Polaris voice assistant",
    version="1.0.0",
    lifespan=lifespan,
)


# ─────────────────────────────────────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    """
    Liveness and readiness probe.
    Returns 200 when the model is loaded and ready.
    Returns 503 if the model failed to load.
    """
    if _model is None:
        return JSONResponse(
            status_code=503,
            content={"status": "unavailable", "model": MODEL_SIZE},
        )
    return {
        "status": "ok",
        "model": MODEL_SIZE,
        "device": DEVICE,
        "compute_type": COMPUTE_TYPE,
    }


@app.post("/transcribe")
async def transcribe(audio: UploadFile = File(...)):
    """
    Transcribe an audio file to text.

    Accepts:
      - multipart/form-data with field name 'audio'
      - Audio formats: webm, ogg, wav, mp3, mp4

    Returns:
      {
        "text":     string,   // full transcript
        "language": string,   // detected language code (e.g. "en")
        "duration": number,   // audio duration in seconds
        "elapsed":  number    // inference time in seconds
      }
    """
    if _model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    # Validate MIME type (content_type can have params like '; codecs=opus')
    raw_ct = (audio.content_type or "").lower()
    base_ct = raw_ct.split(";")[0].strip()
    if base_ct not in {t.split(";")[0].strip() for t in SUPPORTED_TYPES}:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported audio type: '{audio.content_type}'. "
                   f"Use webm, ogg, wav, mp3, or mp4.",
        )

    # Read uploaded bytes into memory
    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio file")

    log.info(f"Transcribing {len(audio_bytes)} bytes ({audio.content_type})")

    # Write to a temp file — faster-whisper needs a file path (not a stream)
    # Using stem extension that ffmpeg can auto-detect
    extension = _mime_to_extension(base_ct)
    with tempfile.NamedTemporaryFile(suffix=extension, delete=False) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        start = time.time()

        # Transcribe — beam_size=5 is the default (quality/speed balance)
        # vad_filter removes silent segments to improve accuracy
        segments, info = _model.transcribe(
            tmp_path,
            beam_size=5,
            language="en",
            vad_filter=True,
            vad_parameters={"min_silence_duration_ms": 300},
        )

        # Collect all segment texts (generator — must be consumed)
        full_text = " ".join(seg.text.strip() for seg in segments).strip()
        elapsed = round(time.time() - start, 2)

        log.info(
            f"Transcribed in {elapsed}s | lang={info.language} "
            f"| duration={info.duration:.1f}s | text='{full_text[:60]}...'"
        )

        return {
            "text":     full_text,
            "language": info.language,
            "duration": round(info.duration, 2),
            "elapsed":  elapsed,
        }

    except Exception as exc:
        log.error(f"Transcription failed: {exc}")
        raise HTTPException(status_code=500, detail="Transcription failed") from exc

    finally:
        # Always clean up the temp file
        Path(tmp_path).unlink(missing_ok=True)


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _mime_to_extension(mime: str) -> str:
    """Map a bare MIME type to a file extension that ffmpeg understands."""
    mapping = {
        "audio/webm":  ".webm",
        "audio/ogg":   ".ogg",
        "audio/wav":   ".wav",
        "audio/wave":  ".wav",
        "audio/x-wav": ".wav",
        "audio/mpeg":  ".mp3",
        "audio/mp4":   ".mp4",
    }
    return mapping.get(mime, ".audio")
