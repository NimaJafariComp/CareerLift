#!/usr/bin/env bash
# Runs Kokoro-82M natively on macOS / Apple Silicon via mlx-audio.
#
# Why: Docker Desktop on macOS can't expose Metal to Linux containers, so the
# Kokoro docker image is CPU-only even on M-series. mlx-audio uses MLX
# (Apple's Metal-backed array lib) directly and exposes the same
# OpenAI-compatible /v1/audio/speech endpoint Kokoro-FastAPI uses — so the
# FastAPI proxy in this repo works unchanged once you point KOKORO_URL at
# the host-native service.
#
# Usage (from repo root):
#   ./scripts/kokoro-mlx-native.sh install   # install/update
#   ./scripts/kokoro-mlx-native.sh run       # serve on :8880 (foreground)
#   ./scripts/kokoro-mlx-native.sh wire      # update .env so FastAPI talks to host
#
# After `run`, leave it running in a separate terminal. After `wire`, restart
# the fastapi container:
#   docker compose stop nextjs fastapi && docker compose rm -f fastapi && docker compose up -d fastapi

set -euo pipefail

cmd=${1:-help}

PORT="${KOKORO_MLX_PORT:-8880}"
VENV_DIR="${KOKORO_MLX_VENV:-$HOME/.kokoro-mlx-venv}"
ENV_FILE="${ENV_FILE:-.env}"
# Docker Desktop on macOS routes host.docker.internal to the Mac host.
HOST_FROM_CONTAINER="host.docker.internal"

require_mac_arm64() {
  if [[ "$(uname -s)" != "Darwin" ]] || [[ "$(uname -m)" != "arm64" ]]; then
    echo "This script only makes sense on macOS / Apple Silicon. Detected $(uname -s)/$(uname -m)." >&2
    exit 1
  fi
}

install_mlx_audio() {
  require_mac_arm64
  if ! command -v python3 >/dev/null 2>&1; then
    echo "python3 not found on PATH. Install Python 3.10+ (brew install python@3.12)." >&2
    exit 1
  fi
  if [[ ! -d "$VENV_DIR" ]]; then
    echo "[mlx-audio] creating virtualenv at $VENV_DIR"
    python3 -m venv "$VENV_DIR"
  fi
  # shellcheck disable=SC1090
  source "$VENV_DIR/bin/activate"
  pip install --upgrade pip >/dev/null
  pip install --upgrade mlx-audio fastapi uvicorn
  echo "[mlx-audio] installed. Run:  $0 run"
}

run_server() {
  require_mac_arm64
  if [[ ! -d "$VENV_DIR" ]]; then
    echo "Virtualenv missing. Run '$0 install' first." >&2
    exit 1
  fi
  # shellcheck disable=SC1090
  source "$VENV_DIR/bin/activate"
  echo "[mlx-audio] serving Kokoro on http://0.0.0.0:$PORT  (OpenAI-compatible /v1/audio/speech)"
  # mlx-audio ships a server CLI that exposes the OpenAI audio API.
  # Uses mlx-community/Kokoro-82M-bf16 by default.
  exec python -m mlx_audio.tts.server --host 0.0.0.0 --port "$PORT"
}

wire_env() {
  if [[ ! -f "$ENV_FILE" ]]; then
    echo "No $ENV_FILE in the current directory. Run from repo root." >&2
    exit 1
  fi
  local target="http://$HOST_FROM_CONTAINER:$PORT"
  if grep -q '^KOKORO_URL=' "$ENV_FILE"; then
    # Portable sed in-place: write to a temp file and swap.
    sed "s|^KOKORO_URL=.*|KOKORO_URL=$target|" "$ENV_FILE" > "$ENV_FILE.tmp"
    mv "$ENV_FILE.tmp" "$ENV_FILE"
  else
    printf '\nKOKORO_URL=%s\n' "$target" >> "$ENV_FILE"
  fi
  echo "[wire] $ENV_FILE KOKORO_URL set to $target"
  echo "[wire] Now stop the in-container kokoro to free port 8880 (optional if you changed KOKORO_MLX_PORT):"
  echo "       docker compose stop kokoro"
  echo "[wire] Then recreate fastapi so it picks up the new KOKORO_URL:"
  echo "       docker compose rm -f fastapi && docker compose up -d fastapi"
}

usage() {
  cat <<EOF
Usage: $0 <command>
  install   Install/update mlx-audio into a dedicated virtualenv
  run       Start the mlx-audio server (foreground) on :$PORT
  wire      Point this repo's FastAPI KOKORO_URL at the host mlx-audio server
  help      This message

Override via env vars:
  KOKORO_MLX_PORT  (default 8880)
  KOKORO_MLX_VENV  (default \$HOME/.kokoro-mlx-venv)
EOF
}

case "$cmd" in
  install) install_mlx_audio ;;
  run)     run_server ;;
  wire)    wire_env ;;
  *)       usage ;;
esac
