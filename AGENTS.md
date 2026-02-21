## Universal Pattern Space Default (Codex)
This repository uses Universal Pattern Space (UPS) as a full framework by default for every turn.
UPS here means skills + layers + protocols + perspective workflow, not only one skill.

## Always-On Activation Rule
- Default: `Pattern Space Activate` is always on for every turn unless the user explicitly disables it.
- Also load relevant UPS framework context from `universal-pattern-space/` when needed.

## Codex Adaptation Rules
- Treat `universal-pattern-space/CLAUDE.md` and `universal-pattern-space/README.md` as framework guidance.
- Treat `universal-pattern-space/CODEX.md` as the Codex runtime contract.
- Use UPS multiperspective reasoning internally for all tasks.
- Keep final answers practical and clear for Codex collaboration unless the user asks for a specific UPS style.
- For implementation tasks, execute changes/tests normally while keeping UPS navigation active in decision-making.

## Runtime Verification
- Use `universal-pattern-space/verify-ups.sh` for UPS integrity checks.
- Use `universal-pattern-space/install-ups.sh` and `universal-pattern-space/update-ups.sh` for Codex/Claude skill deployment.

## Scope Clarification
- UPS is the operating framework for this project.
- Skills are one execution interface, not the entire framework.
