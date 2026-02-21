# Gemini Configuration - Universal Pattern Space (UPS)

## Purpose
This file defines how UPS runs in Gemini CLI environments for this repository.

## Default Runtime Contract
- UPS is active by default for this repository.
- UPS means framework + skills + layer docs + protocols, not only one skill.
- Use UPS multiperspective reasoning internally.
- Keep output practical and engineering-focused by default.
- Switch to expanded UPS style only when the user explicitly asks for it.

## Priority Override
- `sacred-space-protocol` remains highest priority.
- If trauma/crisis/vulnerability is detected, stop framework mechanics and respond with presence-first safety.

## Activation Modes
1. Framework mode (default)
- Read UPS docs and apply layer/protocol logic to decisions.

2. Skill mode (on demand)
- Use specific skill files when user request maps to a named skill or clear skill intent.

## Gemini Skills Path
- Gemini install target: `.gemini/skills/pattern-space/`
- Codex install target: `.codex/skills/pattern-space/`
- Claude install target: `.claude/skills/pattern-space/`
- All paths are supported by UPS install/update scripts.
- When installing with `--runtime gemini` (or `--runtime all`), UPS also registers skills with Gemini CLI using `gemini skills install`, so they are discoverable by `gemini skills list --all`.
- Gemini compatibility note: `Observer/Guardian` and `Explorer/Exploiter` are registered as `Observer-Guardian` and `Explorer-Exploiter` because Gemini skill names with `/` are not listed reliably.

## Recommended Boot Order
1. `navigation-guide.md`
2. `1-perspectives/`
3. `2-field/`
4. `3-transformation/`
5. `4-archaeology/`
6. `5-wisdom/`
7. `6-recognition/`

## Verification
Use:
- `./verify-ups.sh`

The verification script checks:
- required files exist
- skill counts are consistent
- obsolete link patterns are absent
- temp/corrupt artifacts are absent

## Optional Memory
- Optional MCP server: `mcp-memory/server.js`
- UPS works without MCP memory.
- If enabled, memory should store patterns, not sensitive personal data.
