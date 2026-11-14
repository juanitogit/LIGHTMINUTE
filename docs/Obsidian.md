# LIGHTMINUTE — Obsidian connection

The canonical, versioned vault is `project/vault/`. Open that directory as a vault and start
at `00-Home.md`. It contains the current audit, execution board and architecture decisions.

On this machine Obsidian previously opened `C:/Users/juan8/Documents/Obsidian Vault`, which
contains an older project copy. `LIGHTMINUTE.md` in that vault links to the canonical Home
using `obsidian://open?path=…`. Existing personal notes and Obsidian preferences are preserved.
The sibling `tether-vault` and old `tether-a3/vault` are historical copies and have navigation notices.
There is no live Obsidian API or automatic bidirectional sync in this project.

Run `python scripts/audit_vault.py` from the project root. It checks wikilinks, local Markdown
file links, ambiguous targets and required frontmatter, and enumerates every checklist item
in `docs/qa/vault-audit.json`. Checked means a recorded status, not independent proof; consult
the audit note for the evidence and remaining limitations. The original inventory is retained
in `docs/qa/vault-audit-before.json`.
