#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${DWESK_WEBCHAT_REPO_URL:-https://github.com/rayanweragala/dwesk-webchat-sdk.git}"
INSTALL_DIR="${DWESK_WEBCHAT_INSTALL_DIR:-$HOME/.dwesk-webchat-demo}"
BIN_DIR="${DWESK_WEBCHAT_BIN_DIR:-$HOME/.local/bin}"

say()  { printf '%s\n' "$*"; }

# Always read from /dev/tty so prompts work even when piped through: curl | bash
ask() {
  local p="$1" d="${2:-}" v
  if [ -n "$d" ]; then
    read -r -p "$p [$d]: " v </dev/tty
    printf '%s' "${v:-$d}"
  else
    read -r -p "$p: " v </dev/tty
    printf '%s' "$v"
  fi
}
ask_secret() {
  local p="$1" v
  read -r -s -p "$p: " v </dev/tty
  printf '\n' >&2
  printf '%s' "$v"
}
confirm() {
  local p="$1" a
  read -r -p "$p [y/N]: " a </dev/tty
  case "$a" in y|Y|yes|YES) return 0;; *) return 1;; esac
}
need() { command -v "$1" >/dev/null 2>&1; }

install_bun() {
  need bun && return 0
  say "Bun is required."
  confirm "Install Bun now" || { say "Install from https://bun.sh then rerun."; exit 1; }
  case "$(uname -s 2>/dev/null || printf unknown)" in
    MINGW*|MSYS*|CYGWIN*)
      powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "irm bun.sh/install.ps1 | iex" ;;
    *)
      need curl || { say "curl is missing. Install curl then rerun."; exit 1; }
      curl -fsSL https://bun.sh/install | bash
      export PATH="$HOME/.bun/bin:$PATH" ;;
  esac
  need bun || { say "Bun installed but not on PATH. Open a new terminal and rerun."; exit 1; }
}

install_repo() {
  need git || { say "Install Git then rerun."; exit 1; }
  if [ -d "$INSTALL_DIR/.git" ]; then
    say "Updating $INSTALL_DIR"
    git -C "$INSTALL_DIR" pull --ff-only
    return
  fi
  if [ -e "$INSTALL_DIR" ]; then
    confirm "Replace existing $INSTALL_DIR" || { say "Set DWESK_WEBCHAT_INSTALL_DIR and rerun."; exit 1; }
    rm -rf "$INSTALL_DIR"
  fi
  git clone "$REPO_URL" "$INSTALL_DIR"
}

write_env() {
  say ""
  say "Connection settings"
  local api_url company_id username password customer_name customer_email customer_phone
  api_url="$(ask        "External API URL"  "http://localhost:8080")"
  company_id="$(ask     "Company ID"        "1")"
  username="$(ask       "Username"          "")"
  password="$(ask_secret "Password")"
  customer_name="$(ask  "Customer name"     "Demo Customer")"
  customer_email="$(ask "Customer email"    "demo@example.com")"
  customer_phone="$(ask "Customer phone"    "0770000000")"

  cat > "$INSTALL_DIR/examples/react/.env" <<EOF
VITE_DWESK_CRM_URL=$api_url
VITE_DWESK_COMPANY_ID=$company_id
VITE_DWESK_USERNAME=$username
VITE_DWESK_PASSWORD=$password
VITE_DWESK_WEBHOOK_URL=http://localhost:3000/api/webhook/chat
VITE_DWESK_PUBLIC_FORWARD_URL=
VITE_DWESK_CUSTOMER_NAME=$customer_name
VITE_DWESK_CUSTOMER_EMAIL=$customer_email
VITE_DWESK_CUSTOMER_PHONE=$customer_phone
EOF
}

install_deps() {
  say "Installing dependencies"
  (cd "$INSTALL_DIR" && bun install)
  (cd "$INSTALL_DIR/examples/react" && bun install)
}

write_launcher() {
  mkdir -p "$BIN_DIR"
  local bin="$BIN_DIR/dwesk-webchat"
  cat > "$bin" <<'EOF_BIN'
#!/usr/bin/env bash
set -euo pipefail
APP_DIR="__INSTALL_DIR__"
cleanup() { [ -n "${BRIDGE_PID:-}" ] && kill "$BRIDGE_PID" 2>/dev/null || true; }
trap cleanup EXIT INT TERM
cd "$APP_DIR"
bun examples/server/server.ts &
BRIDGE_PID=$!
cd examples/react && bun run dev
EOF_BIN
  sed -i "s|__INSTALL_DIR__|$INSTALL_DIR|g" "$bin"
  chmod +x "$bin"

  case ":$PATH:" in
    *":$BIN_DIR:"*) ;;
    *)
      for f in "$HOME/.bashrc" "$HOME/.zshrc" "$HOME/.profile"; do
        [ -f "$f" ] || continue
        grep -q "$BIN_DIR" "$f" && break
        printf '\nexport PATH="%s:$PATH"\n' "$BIN_DIR" >> "$f"
        break
      done ;;
  esac
  say "Launcher: $bin"
}

main() {
  say "Dwesk WebChat installer"
  install_bun
  install_repo
  write_env
  install_deps
  write_launcher
  say ""
  say "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  say " Installation complete!"
  say ""
  say " To run it later again:"
  say "   dwesk-webchat"
  say "   (or directly: $BIN_DIR/dwesk-webchat)"
  say ""
  say " Starting the application now..."
  say " Open your browser to: http://localhost:5173"
  say "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  say ""
  
  # Execute launcher to run it immediately
  exec "$BIN_DIR/dwesk-webchat"
}

main "$@"
