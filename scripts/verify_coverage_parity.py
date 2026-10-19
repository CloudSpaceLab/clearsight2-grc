#!/usr/bin/env python3
"""Guard source parity with pinned v1 coverage and compliance calculators."""
from __future__ import annotations

import hashlib
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parent.parent
SOURCE_COMMIT = "183336ed518cdc63ba05d9ab3f97b808d923c7ff"

# Git blob IDs originate from the pinned upstream commit, not reconstructed code.
BLOBS = {
    "internal/continuity/requirement_coverage.go": "472c6fcdb8e757019f2ec981da669ffe09f31afa",
    "internal/continuity/effective_evidence_contracts.go": "59bd9a4b4884f66a1f3b92ca8f94773a62c2acb8",
    "internal/continuity/requirement_coverage_test.go": "709c4fc063202841282ba268b09c6f7aa8e9e1e4",
    "internal/continuity/effective_evidence_contracts_test.go": "36754715f6ae56ebdf5a8fab149fcabdbb56bd73",
    "internal/continuity/program_compliance_calculation.go": "52c23e67c256a99a727e884407e9378eca5a253d",
    "internal/continuity/program_compliance_calculation_test.go": "8b363b4768aa1f0b59e67db4033d63f82e09fa31",
    "internal/continuity/program_compliance_requirements.go": "e718b3eb79ece83abafde4bff65934d80d037f5c",
    "internal/continuity/program_compliance_requirements_test.go": "d4b7c03068e9c42eb45283e775beafd122784f85",
    "internal/continuity/program_compliance_policy_test.go": "d48e34e8d4c880e44fc5cc3a9592263a76d6af5f",
    "internal/continuity/program_compliance_projection.go": "62d005b0de49a4a896640651f578246eceb9ed3f",
}
HELPERS = "internal/continuity/coverage_helpers.go"
UPSTREAM_HELPERS = "internal/continuity/state.go"


def blob_id(raw: bytes) -> str:
    return hashlib.sha1(b"blob " + str(len(raw)).encode() + b"\0" + raw).hexdigest()


def main() -> None:
    for name, expected in BLOBS.items():
        actual = blob_id((ROOT / name).read_bytes())
        if actual != expected:
            raise ValueError(f"pinned v1 coverage source changed: {name} ({actual})")
    local = (ROOT / HELPERS).read_text()
    if not local.startswith('package continuity\n\nimport "time"\n\n'):
        raise ValueError("coverage helper import contract changed")
    upstream = Path(sys.argv[1]) if len(sys.argv) == 2 else None
    if upstream:
        actual_commit = subprocess.check_output(
            ["git", "-C", str(upstream), "rev-parse", "HEAD"], text=True
        ).strip()
        if actual_commit != SOURCE_COMMIT:
            raise ValueError("coverage parity requires pinned upstream source")
        for name in BLOBS:
            if (upstream / name).read_bytes() != (ROOT / name).read_bytes():
                raise ValueError(f"coverage source diverges from pinned v1: {name}")
        state = (upstream / UPSTREAM_HELPERS).read_text()
        start = state.index("func requirementControlLinkEffectiveAt")
        end = state.index("func inferProgramSourceState(", start)
        if state[start:end].strip() not in local:
            raise ValueError("coverage temporal/evidence helpers diverge from v1")
        if local.count("func ") != 3:
            raise ValueError("coverage helper file includes unexpected logic")
        policy_source = (upstream / "internal/continuity/program_compliance_policy_lifecycle.go").read_text()
        checksum_start = policy_source.index("func programCompliancePolicyChecksum(")
        upstream_checksum = policy_source[checksum_start:].strip()
        local_checksum = (ROOT / "internal/continuity/policy_checksum.go").read_text()
        if upstream_checksum not in local_checksum or local_checksum.count("func ") != 1:
            raise ValueError("approval-time policy checksum drifted from pinned v1")
    print("Pinned v1 coverage source and helper parity passed")


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError, subprocess.CalledProcessError) as exc:
        sys.exit(f"coverage parity failed: {exc}")
