# Skills Directory (Claude + Codex Compatible)

This folder is the canonical UPS skill source.

- Canonical source path: `.claude/skills/pattern-space/`
- Skill files present: **58** (`SKILL.md` files)
- Codex install target is generated from this source: `.codex/skills/pattern-space/`

## Layout

```text
.claude/skills/
└── pattern-space/
    ├── perspectives/      (8)
    ├── field/             (9)
    ├── transformation/    (7)
    ├── archaeology/       (5)
    ├── wisdom/            (28)
    ├── pattern-space-activate/
    └── VERIFICATION.md
```

## Runtime Notes

- Claude Code auto-discovers skills from `.claude/skills/`.
- Codex uses project instructions and can load copied skills from `.codex/skills/`.
- Use `install-ups.sh` to install for Claude, Codex, or both.

## Verification

Run from `universal-pattern-space/`:

```bash
./verify-ups.sh
```

This validates required files, skill counts, and link hygiene.
