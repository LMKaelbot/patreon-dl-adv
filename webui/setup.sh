#!/usr/bin/env bash
set -e

RESET='\033[0m'
BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'

info()  { echo -e "${BOLD}[INFO]${RESET} $*"; }
ok()    { echo -e "${GREEN}[OK]${RESET}   $*"; }
warn()  { echo -e "${YELLOW}[WARN]${RESET} $*"; }
err()   { echo -e "${RED}[ERR]${RESET}  $*"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ── 1. Node.js >= 20 ────────────────────────────────────────────────────────

info "Checking Node.js..."
if ! command -v node &>/dev/null; then
  err "Node.js not found. Install Node.js 20+ from https://nodejs.org/"
  exit 1
fi

NODE_VER=$(node --version | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VER" -lt 20 ]; then
  err "Node.js 20+ required (found v$(node --version)). Please upgrade."
  exit 1
fi
ok "Node.js $(node --version)"

# ── 2. ffmpeg ────────────────────────────────────────────────────────────────

info "Checking ffmpeg..."
if ! command -v ffmpeg &>/dev/null; then
  warn "ffmpeg not found. Installing via apt-get..."
  sudo apt-get update -qq && sudo apt-get install -y ffmpeg
fi
ok "ffmpeg $(ffmpeg -version 2>&1 | head -1 | awk '{print $3}')"

# ── 3. Whisper ───────────────────────────────────────────────────────────────

info "Checking whisper CLI..."
if ! command -v whisper &>/dev/null; then
  warn "whisper not found. Installing via pip3..."
  if ! command -v pip3 &>/dev/null; then
    sudo apt-get update -qq && sudo apt-get install -y python3-pip
  fi
  pip3 install --quiet openai-whisper
fi
if command -v whisper &>/dev/null; then
  ok "whisper $(whisper --version 2>&1 | head -1)"
else
  warn "whisper may not be in PATH. You may need to add ~/.local/bin to PATH."
fi

# ── 4. npm install ───────────────────────────────────────────────────────────

info "Installing npm dependencies..."
npm install --silent
ok "Dependencies installed"

# ── 5. .env file ─────────────────────────────────────────────────────────────

if [ ! -f .env ]; then
  cp .env.example .env
  # Generate a random JWT secret
  if command -v openssl &>/dev/null; then
    SECRET=$(openssl rand -hex 32)
    sed -i "s/change-me/$SECRET/" .env
    ok "Generated random JWT_SECRET in .env"
  fi
  ok ".env created from .env.example"
else
  warn ".env already exists, skipping"
fi

# ── 6. Data & downloads directories ──────────────────────────────────────────

mkdir -p data downloads
ok "Directories: data/ downloads/"

# ── 7. Optional systemd service ──────────────────────────────────────────────

read -r -p "Install systemd service? (patreon-dl-adv-webui) [y/N] " INSTALL_SERVICE
if [[ "$INSTALL_SERVICE" =~ ^[Yy]$ ]]; then
  SERVICE_FILE="/etc/systemd/system/patreon-dl-adv-webui.service"
  CURRENT_USER=$(whoami)
  NODE_BIN=$(which node)
  NPM_BIN=$(which npm)

  sudo tee "$SERVICE_FILE" > /dev/null <<EOF
[Unit]
Description=Patreon DL Adv Web UI
After=network.target

[Service]
Type=simple
User=$CURRENT_USER
WorkingDirectory=$SCRIPT_DIR
ExecStart=$NPM_BIN run start
Restart=on-failure
RestartSec=5
Environment=NODE_ENV=production
EnvironmentFile=$SCRIPT_DIR/.env

[Install]
WantedBy=multi-user.target
EOF

  sudo systemctl daemon-reload
  sudo systemctl enable patreon-dl-adv-webui
  ok "Systemd service installed and enabled"
  info "Start with: sudo systemctl start patreon-dl-adv-webui"
  info "Logs with:  sudo journalctl -u patreon-dl-adv-webui -f"
fi

# ── Done ──────────────────────────────────────────────────────────────────────

echo ""
echo -e "${BOLD}${GREEN}Setup complete!${RESET}"
echo ""
echo "  Development:  cd webui && npm run dev"
echo "  Production:   cd webui && npm run build && npm run start"
echo ""
