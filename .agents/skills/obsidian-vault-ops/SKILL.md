---
name: obsidian-vault-ops
description: How to read and maintain the TETHER Obsidian vault (research notes, ADRs, daily log, task board, pitch drafts). Use whenever you finish a task, make a design decision, find a new fact/source, or are asked to "document", "log", "note", "update the plan" or "what did we decide". The vault is the project's long-term memory; agents must write to it, not only to chat.
---
# Obsidian vault operations

Vault path (default): `../tether-vault/` relative to the repo (or symlink it to `docs/vault`).

## Structure
`00-Home` (map of content) · `01-Research` · `02-Product` · `03-Architecture` (incl. `ADR-*`) · `04-Execution` (plan, board, pitch, checklist) · `05-Skills` · `99-Templates`.

## Conventions
- Notes in Spanish by default (team language), code/identifiers/README in English.
- Frontmatter on every note: `tags`, `status` (draft|verified|decided), `updated` (YYYY-MM-DD), `sources` when factual.
- Link generously with `[[wikilinks]]`; each note links back to its hub.
- **Facts need a source line** and a verification status. Unverified => `status: draft` and a `#verify` tag.
- Decisions go in an ADR from `99-Templates/ADR`; never silently change architecture.
- Daily log: copy `99-Templates/Daily` to `04-Execution/log/YYYY-MM-DD.md`; end each work block with: done / blocked / next.

## Agent routine
1. Before work: read `00-Home` and the relevant hub note.
2. After work: append to today's log, tick the board, add new facts to `01-Research` with sources, add ADR if a decision was made.
3. Never delete notes; mark `status: superseded` and link the replacement.
