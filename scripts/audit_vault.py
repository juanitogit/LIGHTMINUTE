#!/usr/bin/env python3
"""Audit the canonical Obsidian graph and enumerate every checkbox, without ticking it."""
from __future__ import annotations

import json
import re
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[1]
VAULT = ROOT / "vault"


def audit() -> dict:
    notes = sorted(VAULT.rglob("*.md"))
    paths = {p.relative_to(VAULT).with_suffix("").as_posix(): p for p in notes}
    stems: dict[str, list[Path]] = {}
    for p in notes:
        stems.setdefault(p.stem, []).append(p)
    broken, ambiguous, checkboxes, metadata = [], [], [], []
    wiki_edges = markdown_edges = 0
    for p in notes:
        text = p.read_text(encoding="utf-8")
        source = p.relative_to(ROOT).as_posix()
        if not text.startswith("---\n") or not all(re.search(rf"^{field}:", text, re.M) for field in ("tags", "status", "updated")):
            metadata.append(source)
        for i, line in enumerate(text.splitlines(), 1):
            for match in re.finditer(r"\[([ xX])\]\s*(.*?)(?=\s*[·]?\s*\[[ xX]\]|$)", line):
                checkboxes.append({"file": source, "line": i, "checked": match[1].lower() == "x", "item": match[2].rstrip(" ·")})
        # Fenced examples are not graph connections.
        prose = re.sub(r"```.*?```", "", text, flags=re.S)
        for match in re.finditer(r"\[\[([^\]]+)\]\]", prose):
            target = match[1].split("|")[0].split("#")[0].removesuffix(".md")
            if not target:
                continue
            wiki_edges += 1
            matches = [paths[target]] if target in paths else stems.get(target, [])
            if not matches:
                broken.append({"source": source, "target": target, "type": "wiki"})
            elif len(matches) > 1:
                ambiguous.append({"source": source, "target": target})
        for match in re.finditer(r"(?<!!)\[[^\]]+\]\(([^\n]+?)\)", prose):
            target = match[1].strip("<>")
            if re.match(r"(?:[a-z]+:|#)", target, re.I):
                continue
            markdown_edges += 1
            target = unquote(target.split("#")[0])
            if not (p.parent / target).exists():
                broken.append({"source": source, "target": target, "type": "markdown"})
    return {"vault": "vault/", "notes": len(notes), "wiki_edges": wiki_edges,
            "markdown_edges": markdown_edges, "broken_links": broken, "ambiguous_links": ambiguous,
            "missing_frontmatter": metadata, "checkbox_count": len(checkboxes),
            "checked": sum(c["checked"] for c in checkboxes), "checkboxes": checkboxes}


if __name__ == "__main__":
    report = audit()
    output = ROOT / "docs/qa/vault-audit.json"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    problems = len(report["broken_links"]) + len(report["ambiguous_links"]) + len(report["missing_frontmatter"])
    print(f"Obsidian: {report['notes']} notes, {report['wiki_edges']} wiki links, {report['markdown_edges']} file links, {report['checkbox_count']} checklist items, {problems} problems")
    for kind in ("broken_links", "ambiguous_links", "missing_frontmatter"):
        for problem in report[kind]:
            print(kind, problem)
    raise SystemExit(1 if problems else 0)
