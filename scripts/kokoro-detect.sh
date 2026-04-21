#!/usr/bin/env bash
# Detects the host's accelerator environment and prints the recommended
# Kokoro TTS setup. Never mutates the project — this is advisory output.
#
# Outputs one of:
#   cpu         → COMPOSE_PROFILES=cpu docker compose up -d   (or set in .env; default)
#   nvidia      → COMPOSE_PROFILES=gpu docker compose up -d
#   amd         → build the moritzchow/Kokoro-FastAPI-ROCm fork manually
#   apple       → run `scripts/kokoro-mlx-native.sh` for real Metal speedup
#
# Also prints a human-readable reason + next-step command.

set -u

os=$(uname -s)
arch=$(uname -m)
cap="cpu"
reason=""
next=""

if [[ "$os" == "Darwin" ]]; then
  if [[ "$arch" == "arm64" ]]; then
    chip=$(sysctl -n machdep.cpu.brand_string 2>/dev/null || echo "Apple Silicon")
    cap="apple"
    reason="Detected macOS on $chip. Docker Desktop on macOS CANNOT pass Metal/MPS into Linux containers, so a Docker GPU image would give zero speedup. The default cpu image IS already ARM64-native (no Rosetta)."
    next="For real Metal acceleration run Kokoro natively on the host via mlx-audio:  ./scripts/kokoro-mlx-native.sh"
  else
    cap="cpu"
    reason="Detected macOS on Intel ($arch). No GPU path available."
    next="Stick with the default cpu image (no changes needed)."
  fi
elif [[ "$os" == "Linux" ]]; then
  if command -v nvidia-smi >/dev/null 2>&1 && nvidia-smi -L >/dev/null 2>&1; then
    # Also verify nvidia-container-toolkit is wired up to Docker.
    if docker info 2>/dev/null | grep -qi "nvidia"; then
      vram_mib=$(nvidia-smi --query-gpu=memory.total --format=csv,noheader,nounits 2>/dev/null | head -1 | tr -d ' ')
      cap="nvidia"
      reason="Detected NVIDIA GPU with ${vram_mib} MiB VRAM and nvidia-container-toolkit wired up to Docker. GPU path is eligible."
      next="Edit COMPOSE_PROFILES=gpu in .env, then: docker compose up -d  (or: COMPOSE_PROFILES=gpu docker compose up -d)"
    else
      cap="cpu"
      reason="nvidia-smi works on the host but Docker isn't configured with the nvidia runtime. Install nvidia-container-toolkit and restart Docker, then rerun this script."
      next="sudo apt install -y nvidia-container-toolkit && sudo systemctl restart docker && ./scripts/kokoro-detect.sh"
    fi
  elif [[ -e /dev/kfd ]] && [[ -e /dev/dri ]]; then
    cap="amd"
    reason="Detected AMD ROCm devices (/dev/kfd + /dev/dri). No official Kokoro-FastAPI ROCm image exists — there's a community fork."
    next="Build the fork: git clone https://github.com/moritzchow/Kokoro-FastAPI-ROCm.git ; then replace the kokoro-gpu service image in docker-compose.yml with the local build and add /dev/kfd, /dev/dri, group_add: [video], and HSA_OVERRIDE_GFX_VERSION."
  else
    cap="cpu"
    reason="Linux host, no NVIDIA or AMD GPU detected."
    next="Stick with the default cpu image."
  fi
else
  cap="cpu"
  reason="Unknown OS ($os)."
  next="Stick with the default cpu image."
fi

cat <<EOF
========================================================================
  Kokoro accelerator detection
========================================================================
Recommendation: $cap

Reason:
  $reason

Next step:
  $next
========================================================================
EOF

# Machine-readable value on last line for scripting / CI.
echo "KOKORO_ACCEL=$cap"
