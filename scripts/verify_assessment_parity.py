#!/usr/bin/env python3
"""Static approved Assessment source/structure guard; not a visual parity claim."""
from pathlib import Path
import re
root=Path(__file__).resolve().parents[1]
source=(root/"docs/design/references/clearsight-2026-10/source/clearsight-designs-01-05/assessment-workspace-preview.html").read_text()
styles=re.findall(r"<style>(.*?)</style>",source,re.S)
assert len(styles)==2, "Approved assessment stylesheet changed"
actual=(root/"web/src/features/assessments/assessment.css").read_text()
assert styles[1].strip() in actual, "Approved Assessment CSS drift"
markup=(root/"web/src/features/assessments/AssessmentWorkspace.tsx").read_text()
for cls in ("assessment-heading","work-mode-tabs","completion-strip","assessment-body","sections-panel",
            "questions-column","assistance-column","review-summary","evidence-panel",
            "assist-panel","import-layout","final-review-grid"):
    assert cls in markup, f"Missing design structure: {cls}"
for forbidden in ("11 of 18", "61%", "Ada Okafor", "MFA enforcement report", "Clear Bank Nigeria"):
    assert forbidden not in markup, f"Prototype data leaked to runtime: {forbidden}"
assert "disabled" in markup and "No authorized questions" in markup
assert "screen==='assessment'" in (root/"web/src/App.tsx").read_text()
print("Assessment CSS/structure guard passed (not browser or operational parity)")
