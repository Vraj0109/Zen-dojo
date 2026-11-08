#!/usr/bin/env bash
# Zen Forge setup for macOS / Linux.
# Installs missing prerequisites (only if not installed), VS Code extensions, then builds.
#
#   ./setup.sh                 # required tools + build
#   ./setup.sh --docker --ollama
#   ./setup.sh --check-only
set -uo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
MIN_NODE_MAJOR=20
DOCKER=0 OLLAMA=0 SKIP_COMPILER=0 SKIP_EXT=0 SKIP_BUILD=0 START=0 CHECK_ONLY=0
FAILED=()

for arg in "$@"; do
  case "$arg" in
    --docker) DOCKER=1 ;; --ollama) OLLAMA=1 ;; --skip-extensions) SKIP_EXT=1 ;;
    --skip-compiler) SKIP_COMPILER=1 ;;
    --skip-build) SKIP_BUILD=1 ;; --start) START=1 ;; --check-only) CHECK_ONLY=1 ;;
    *) echo "unknown option: $arg"; exit 2 ;;
  esac
done

step() { printf '\n\033[36m==> %s\033[0m\n' "$1"; }
ok()   { printf '  \033[32m[ok]\033[0m      %s\n' "$1"; }
miss() { printf '  \033[33m[missing]\033[0m %s\n' "$1"; }
err()  { printf '  \033[31m[error]\033[0m   %s\n' "$1"; }
has()  { command -v "$1" >/dev/null 2>&1; }

OS="$(uname -s)"
pkg_install() { # $1 = brew name, $2 = apt/dnf/pacman name
  if [ "$CHECK_ONLY" = 1 ]; then miss "$1 (would install)"; return 1; fi
  if [ "$OS" = Darwin ]; then
    has brew || { err "Homebrew missing: https://brew.sh"; return 1; }
    brew install "$1"
  elif has apt-get; then sudo apt-get update -y && sudo apt-get install -y "$2"
  elif has dnf;     then sudo dnf install -y "$2"
  elif has pacman;  then sudo pacman -S --noconfirm "$2"
  else err "no supported package manager for $2"; return 1; fi
}

load_nvm() { export NVM_DIR="$HOME/.nvm"; [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"; }

step "Checking prerequisites"
load_nvm

if has git; then ok "$(git --version)"; else miss git; pkg_install git git || FAILED+=(git); fi

node_ok=0
if has node; then
  v="$(node -v)"; major="${v#v}"; major="${major%%.*}"
  if [ "$major" -ge "$MIN_NODE_MAJOR" ]; then ok "node $v"; node_ok=1; else miss "node $v too old (need >= $MIN_NODE_MAJOR)"; fi
else miss node; fi
if [ "$node_ok" = 0 ]; then
  if [ "$CHECK_ONLY" = 1 ]; then echo "  (would install Node LTS via nvm)"
  else
    # nvm installs per-user, no sudo needed. https://github.com/nvm-sh/nvm
    if ! has nvm; then curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash; load_nvm; fi
    nvm install --lts && nvm alias default 'lts/*' && ok "node $(node -v) installed" || FAILED+=(node)
  fi
fi

if has pnpm; then ok "pnpm $(pnpm -v)"
else
  miss pnpm
  if [ "$CHECK_ONLY" = 0 ]; then npm install -g pnpm && ok "pnpm $(pnpm -v) installed" || FAILED+=(pnpm); fi
fi

# C++ compiler: dev-only (syntax-checks the C++ in the DSA articles; the test is skipped without one).
if has g++ || has clang++; then ok "C++ compiler"
else
  miss "C++ compiler (only used by a dev test)"
  if [ "$CHECK_ONLY" = 0 ] && [ "$SKIP_COMPILER" = 0 ]; then
    if [ "$OS" = Darwin ]; then xcode-select --install 2>/dev/null || true; echo "  Finish the Xcode tools dialog, then re-run."
    else pkg_install g++ g++ || FAILED+=(g++); fi
  fi
fi

# JDK 17: dev-only (compiles and runs the Java code in the LLD lessons; the test is skipped without one).
if has javac; then ok "JDK"
else
  miss "JDK (only used by a dev test)"
  if [ "$CHECK_ONLY" = 0 ] && [ "$SKIP_COMPILER" = 0 ]; then
    if [ "$OS" = Darwin ]; then pkg_install openjdk@17 openjdk@17 || FAILED+=(jdk)
    else pkg_install openjdk@17 openjdk-17-jdk || FAILED+=(jdk); fi
  fi
fi

CODE=""
if has code; then CODE=code; ok "VS Code"
elif [ -x "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code" ]; then
  CODE="/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code"; ok "VS Code"
else miss "VS Code (install from https://code.visualstudio.com/download)"; fi

if [ "$DOCKER" = 1 ]; then
  if has docker; then ok "$(docker --version)"
  else
    miss docker
    if [ "$OS" = Darwin ] && [ "$CHECK_ONLY" = 0 ]; then brew install --cask docker || FAILED+=(docker)
    else echo "  Install Docker: https://docs.docker.com/engine/install/ (Linux) or https://www.docker.com/products/docker-desktop/"; fi
  fi
fi

if [ "$OLLAMA" = 1 ]; then
  if has ollama; then ok "ollama"
  else
    miss ollama
    if [ "$CHECK_ONLY" = 0 ]; then
      if [ "$OS" = Darwin ]; then brew install ollama || FAILED+=(ollama)
      else echo "  Install Ollama: https://ollama.com/download/linux"; fi
    fi
  fi
fi

if [ "$SKIP_EXT" = 0 ] && [ -n "$CODE" ] && [ -f "$ROOT/.vscode/extensions.json" ]; then
  step "VS Code extensions"
  have="$("$CODE" --list-extensions | tr '[:upper:]' '[:lower:]')"
  for e in $(grep -oE '"[a-zA-Z0-9-]+\.[a-zA-Z0-9-]+"' "$ROOT/.vscode/extensions.json" | tr -d '"'); do
    lc="$(echo "$e" | tr '[:upper:]' '[:lower:]')"
    if echo "$have" | grep -qx "$lc"; then ok "$e"
    elif [ "$CHECK_ONLY" = 1 ]; then miss "$e"
    else "$CODE" --install-extension "$e" >/dev/null 2>&1 && ok "$e (installed)" || { err "$e"; FAILED+=("$e"); }; fi
  done
fi

if [ "$SKIP_BUILD" = 0 ] && [ "$CHECK_ONLY" = 0 ]; then
  step "Project dependencies and build"
  cd "$ROOT"
  if [ ! -f package.json ]; then echo "  No package.json yet (project not scaffolded). Skipping install/build."
  elif ! has pnpm; then err "pnpm not available"; FAILED+=(build)
  else
    [ -f .env.example ] && [ ! -f .env ] && cp .env.example .env && ok "created .env"
    if pnpm install && pnpm build; then ok "build complete"; [ "$START" = 1 ] && pnpm start
    else err "build failed"; FAILED+=(build); fi
  fi
fi

step "Summary"
if [ "${#FAILED[@]}" -gt 0 ]; then err "Failed: ${FAILED[*]}"; exit 1; fi
ok "All done."
