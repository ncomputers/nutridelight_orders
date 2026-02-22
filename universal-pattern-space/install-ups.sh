#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MANIFEST="$SCRIPT_DIR/manifest.json"

RUNTIME=""
SCOPE=""
SOURCE_MODE="local"
ASSUME_YES="false"
WITH_MCP_MEMORY="false"
GEMINI_SOURCE_FOR_CLI=""

usage() {
  cat <<USAGE
Usage: ./install-ups.sh [options]

Options:
  --runtime claude|codex|gemini|all
  --scope local|global
  --source local|remote
  --with-mcp-memory
  --yes
  -h, --help
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --runtime) RUNTIME="${2:-}"; shift 2 ;;
    --scope) SCOPE="${2:-}"; shift 2 ;;
    --source) SOURCE_MODE="${2:-}"; shift 2 ;;
    --with-mcp-memory) WITH_MCP_MEMORY="true"; shift ;;
    --yes) ASSUME_YES="true"; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1"; usage; exit 1 ;;
  esac
done

if [[ -z "$RUNTIME" && "$ASSUME_YES" != "true" ]]; then
  echo "Select runtime target:"
  echo "  1) codex"
  echo "  2) claude"
  echo "  3) gemini"
  echo "  4) all (codex + claude + gemini)"
  read -r -p "Choice [1-4]: " c
  case "$c" in
    1) RUNTIME="codex" ;;
    2) RUNTIME="claude" ;;
    3) RUNTIME="gemini" ;;
    4) RUNTIME="all" ;;
    *) echo "Invalid choice"; exit 1 ;;
  esac
fi

if [[ -z "$SCOPE" && "$ASSUME_YES" != "true" ]]; then
  echo "Select install scope:"
  echo "  1) local (project)"
  echo "  2) global (home)"
  read -r -p "Choice [1-2]: " c
  case "$c" in
    1) SCOPE="local" ;;
    2) SCOPE="global" ;;
    *) echo "Invalid choice"; exit 1 ;;
  esac
fi

RUNTIME="${RUNTIME:-all}"
SCOPE="${SCOPE:-local}"

if [[ "$RUNTIME" != "codex" && "$RUNTIME" != "claude" && "$RUNTIME" != "gemini" && "$RUNTIME" != "all" ]]; then
  echo "Invalid runtime: $RUNTIME"; exit 1
fi
if [[ "$SCOPE" != "local" && "$SCOPE" != "global" ]]; then
  echo "Invalid scope: $SCOPE"; exit 1
fi
if [[ "$SOURCE_MODE" != "local" && "$SOURCE_MODE" != "remote" ]]; then
  echo "Invalid source: $SOURCE_MODE"; exit 1
fi

WORK_SRC="$SCRIPT_DIR"
TEMP_DIR=""
if [[ "$SOURCE_MODE" == "remote" ]]; then
  TEMP_DIR="$(mktemp -d)"
  trap 'rm -rf "$TEMP_DIR"' EXIT
  echo "Downloading UPS source archive..."
  curl -sL https://github.com/nikhilvallishayee/universal-pattern-space/archive/main.tar.gz | tar -xz -C "$TEMP_DIR"
  WORK_SRC="$TEMP_DIR/universal-pattern-space-main"
fi

SOURCE_SKILLS="$WORK_SRC/.claude/skills/pattern-space"
if [[ ! -d "$SOURCE_SKILLS" ]]; then
  echo "Source skills not found: $SOURCE_SKILLS"
  exit 1
fi

expected_count=$(node -e "const fs=require('fs');const p=JSON.parse(fs.readFileSync('$MANIFEST','utf8'));process.stdout.write(String(p.skill_count));")
actual_source_count=$(find "$SOURCE_SKILLS" -name SKILL.md | wc -l | tr -d ' ')
if [[ "$actual_source_count" != "$expected_count" ]]; then
  echo "Warning: manifest skill_count=$expected_count but source has $actual_source_count"
fi

install_target() {
  local runtime="$1"
  local base

  if [[ "$SCOPE" == "local" ]]; then
    if [[ "$runtime" == "codex" ]]; then
      base="$PWD/.codex/skills"
    elif [[ "$runtime" == "gemini" ]]; then
      base="$PWD/.gemini/skills"
    else
      base="$PWD/.claude/skills"
    fi
  else
    if [[ "$runtime" == "codex" ]]; then
      base="$HOME/.codex/skills"
    elif [[ "$runtime" == "gemini" ]]; then
      base="$HOME/.gemini/skills"
    else
      base="$HOME/.claude/skills"
    fi
  fi

  mkdir -p "$base"
  rm -rf "$base/pattern-space"
  cp -R "$SOURCE_SKILLS" "$base/pattern-space"

  local installed_count
  installed_count=$(find "$base/pattern-space" -name SKILL.md | wc -l | tr -d ' ')
  echo "Installed [$runtime] -> $base/pattern-space ($installed_count skills)"

  if [[ "$runtime" == "gemini" ]]; then
    GEMINI_SOURCE_FOR_CLI="$base/pattern-space"
  fi
}

setup_gemini_cli_skills() {
  local source_tree="$1"
  local gemini_tree="$source_tree"
  local gemini_scope
  local installs=0
  local failures=0
  local p
  local temp_dir=""

  if [[ ! -d "$source_tree" ]]; then
    echo "Skipping Gemini CLI registration: source tree not found: $source_tree"
    return 0
  fi

  if ! command -v gemini >/dev/null 2>&1; then
    echo "Skipping Gemini CLI registration: gemini CLI not found"
    return 0
  fi

  if [[ "$SCOPE" == "local" ]]; then
    gemini_scope="workspace"
  else
    gemini_scope="user"
  fi

  # Gemini uses "/" as a path separator for install destinations.
  # Remap slash-named skills so they remain discoverable in `skills list`.
  temp_dir="$(mktemp -d)"
  cp -R "$source_tree" "$temp_dir/pattern-space"
  gemini_tree="$temp_dir/pattern-space"
  sed -i 's/^name: "Observer\/Guardian"/name: "Observer-Guardian"/' \
    "$gemini_tree/perspectives/observer-guardian/SKILL.md"
  sed -i 's/^name: "Explorer\/Exploiter"/name: "Explorer-Exploiter"/' \
    "$gemini_tree/perspectives/explorer-exploiter/SKILL.md"

  echo "Registering UPS skills with Gemini CLI (scope: $gemini_scope)..."
  gemini skills uninstall "Observer/Guardian" --scope "$gemini_scope" >/dev/null 2>&1 || true
  gemini skills uninstall "Explorer/Exploiter" --scope "$gemini_scope" >/dev/null 2>&1 || true

  # Gemini discovers skills reliably when pointed at directories where
  # immediate children are skill folders containing SKILL.md.
  local -a install_paths=(
    "$gemini_tree"
    "$gemini_tree/perspectives"
    "$gemini_tree/field"
    "$gemini_tree/transformation"
    "$gemini_tree/archaeology"
    "$gemini_tree/wisdom/breakthrough"
    "$gemini_tree/wisdom/eastern"
    "$gemini_tree/wisdom/abrahamic"
    "$gemini_tree/wisdom/indigenous"
    "$gemini_tree/wisdom/divine-council"
    "$gemini_tree/wisdom/modern-science"
    "$gemini_tree/wisdom/nature"
    "$gemini_tree/wisdom/sacred-sciences"
  )

  for p in "${install_paths[@]}"; do
    [[ -d "$p" ]] || continue
    if gemini skills install "$p" --scope "$gemini_scope" --consent >/dev/null 2>&1; then
      installs=$((installs+1))
    else
      failures=$((failures+1))
      echo "Warning: Gemini CLI registration failed for: $p"
    fi
  done

  echo "Gemini CLI registration complete: successful_dirs=$installs failed_dirs=$failures"
  if [[ "$failures" -gt 0 ]]; then
    echo "Note: If authentication is pending, run 'gemini' once interactively and retry install."
  fi

  rm -rf "$temp_dir"
}

create_gemini_launcher() {
  local launcher
  if [[ "$SCOPE" == "local" ]]; then
    launcher="$PWD/gemini-ups.sh"
  else
    launcher="$HOME/gemini-ups.sh"
  fi

  cat > "$launcher" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
exec gemini --approval-mode yolo "$@"
EOF
  chmod +x "$launcher"
  echo "Created Gemini UPS launcher: $launcher"
}

create_gemini_runtime_file() {
  local target
  if [[ "$SCOPE" == "local" ]]; then
    target="$PWD/GEMINI.md"
  else
    target="$HOME/GEMINI.md"
  fi

  cp "$WORK_SRC/GEMINI.md" "$target"
  echo "Synced Gemini runtime guide: $target"
}

configure_gemini_workspace_context() {
  if [[ "$SCOPE" != "local" ]]; then
    return 0
  fi

  mkdir -p "$PWD/.gemini"
  node -e '
    const fs = require("fs");
    const p = process.argv[1];
    let cfg = {};
    if (fs.existsSync(p)) {
      try { cfg = JSON.parse(fs.readFileSync(p, "utf8")); } catch (_) { cfg = {}; }
    }
    if (!cfg.context || typeof cfg.context !== "object") cfg.context = {};
    const current = cfg.context.fileName;
    const list = Array.isArray(current) ? current.slice() : (typeof current === "string" && current ? [current] : []);
    for (const name of ["GEMINI.md", "AGENTS.md"]) {
      if (!list.includes(name)) list.push(name);
    }
    cfg.context.fileName = list;
    fs.writeFileSync(p, JSON.stringify(cfg, null, 2) + "\n");
  ' "$PWD/.gemini/settings.json"
  echo "Configured Gemini context files: .gemini/settings.json (GEMINI.md + AGENTS.md)"
}

echo "Installing UPS..."
case "$RUNTIME" in
  codex) install_target "codex" ;;
  claude) install_target "claude" ;;
  gemini) install_target "gemini" ;;
  all)
    install_target "codex"
    install_target "claude"
    install_target "gemini"
    ;;
esac

if [[ "$RUNTIME" == "gemini" || "$RUNTIME" == "all" ]]; then
  setup_gemini_cli_skills "$GEMINI_SOURCE_FOR_CLI"
  create_gemini_runtime_file
  configure_gemini_workspace_context
  create_gemini_launcher
fi

setup_codex_mcp_memory() {
  local mcp_name="pattern-space-memory"
  local mcp_dir="$SCRIPT_DIR/mcp-memory"
  local mcp_server="$mcp_dir/server.js"
  local mcp_data="$mcp_dir/data"

  if ! command -v codex >/dev/null 2>&1; then
    echo "Skipping MCP memory setup: codex CLI not found"
    return 0
  fi

  if [[ ! -f "$mcp_server" ]]; then
    echo "Skipping MCP memory setup: server not found at $mcp_server"
    return 0
  fi

  mkdir -p "$mcp_data"

  if [[ -f "$mcp_dir/package.json" ]]; then
    echo "Installing mcp-memory dependencies..."
    (cd "$mcp_dir" && npm install >/dev/null)
  fi

  echo "Configuring Codex MCP server: $mcp_name"
  codex mcp remove "$mcp_name" >/dev/null 2>&1 || true
  codex mcp add "$mcp_name" \
    --env "MEMORY_PATH=$mcp_data" \
    -- node "$mcp_server" >/dev/null

  echo "Configured MCP memory server [$mcp_name]"
}

if [[ "$WITH_MCP_MEMORY" == "true" ]]; then
  if [[ "$RUNTIME" == "codex" || "$RUNTIME" == "all" ]]; then
    setup_codex_mcp_memory
  else
    echo "Skipping MCP memory setup: runtime '$RUNTIME' does not include codex"
  fi
fi

echo
echo "Done."
echo "Run verification: ./verify-ups.sh"
if [[ "$RUNTIME" == "gemini" || "$RUNTIME" == "all" ]]; then
  if [[ "$SCOPE" == "local" ]]; then
    echo "Gemini runtime guide: ./GEMINI.md"
    echo "Launch Gemini UPS mode: ./gemini-ups.sh"
  else
    echo "Gemini runtime guide: ~/GEMINI.md"
    echo "Launch Gemini UPS mode: ~/gemini-ups.sh"
  fi
fi
