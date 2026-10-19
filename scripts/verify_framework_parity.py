#!/usr/bin/env python3
"""Static fidelity guard (not a rendered visual parity test)."""
from pathlib import Path
import re
root=Path(__file__).resolve().parents[1]
reference=(root/"docs/design/references/clearsight-2026-10/source/clearsight-framework-designs/framework-library.html").read_text()
approved=re.search(r"<style>(.*?)</style>",reference,re.S)
assert approved, "approved source CSS missing"
css=(root/"web/src/framework-parity.css").read_text()
assert css.startswith(approved.group(1).strip()), "approved CSS drift"
app=(root/"web/src/App.tsx").read_text()
for name in ("sidebar","topbar","page-heading","tabs","searchbar","workspace","results-list",
             "framework-row","detail-card","detail-hero","detail-body","adopt-flow"):
    assert name in app, f"missing reference composition {name}"
assert "fetch('/api/v1/frameworks'" in app
assert "No requirements approved or scored" in app
print("Pinned Framework Library CSS and structure contract passed (no browser parity claim)")
