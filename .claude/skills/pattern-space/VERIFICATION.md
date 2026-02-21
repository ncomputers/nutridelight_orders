# Pattern Space Skills Verification

## Current Status

- Canonical skills path: `.claude/skills/pattern-space/`
- Detected skill files: **58** (`SKILL.md`)
- Meta-skill present: `pattern-space-activate/SKILL.md`

## Layer Counts

- Perspectives: 8
- Field: 9
- Transformation: 7
- Archaeology: 5
- Wisdom: 28
- Meta activation skill: 1

Total: **58**

## Runtime Compatibility

- Claude Code: native auto-discovery from `.claude/skills`
- Codex: install/sync to `.codex/skills` via `install-ups.sh`

## Verification Command

From `universal-pattern-space/`:

```bash
./verify-ups.sh
```

`verify-ups.sh` checks:
- required files from `manifest.json`
- skill count consistency
- missing/obsolete link patterns
- temporary/corrupt artifacts in recognition layer

## Notes

Historical docs that referenced 25 or 59 skills are superseded by this file and `manifest.json`.
