#!/usr/bin/env python3
"""Approved Program Workspace CSS contract; not a visual or operational parity assertion."""
from pathlib import Path
import re
base=Path(__file__).resolve().parents[1]
reference=(base/"docs/design/references/clearsight-2026-10/source/clearsight-program-designs/program-workspace-preview.html").read_text(encoding="utf-8")
styles=re.findall(r"<style>(.*?)</style>",reference,re.S)
assert len(styles)==2, "Missing approved Program stylesheet"
css=(base/"web/src/features/programs/program.css").read_text(encoding="utf-8")
assert styles[1].strip() in css, "Program Workspace CSS diverges from pinned reference"
markup=(base/"web/src/features/programs/ProgramWorkspace.tsx").read_text(encoding="utf-8")
overview=(base/"web/src/features/programs/OverviewPanel.tsx").read_text(encoding="utf-8")
composition=markup+overview
for term in ("program-heading","workspace-tabs","metric-grid","dashboard-grid",
             "coverage-surface","assessments-surface","actions-surface",
             "links-surface","assist-surface"):
    assert term in composition, f"Missing approved composition: {term}"
assert "useProgramRecord(programId)" in markup, "Program view must use authorized data state"
assert "<ProgramOverview" in markup, "Program must compose the connected Overview"
assert "data.workspace" in overview and "'—'" in overview, "Unavailable measures must stay unknown"
assert "Evidence review does not establish compliance" in overview, "Evidence review must stay distinct from compliance"
assert "No Program selected" in markup, "No selection must not imply customer data"
assert "34 <span>/ 52" not in markup
assert "New assessment" in markup
print("Program approved style/structure guard passed (no visual/operational parity claim)")
