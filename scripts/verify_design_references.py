#!/usr/bin/env python3
"""Fail closed if any approved design source bytes differ from the archive manifest."""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path, PurePosixPath

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "docs/design/references/clearsight-2026-10/source"
ARCHIVE_SHA = "65dcc0e3f26e9d41e38efd1ae1d571f5db0f0582a2d561f8c942b25817a5f6e5"


def main() -> int:
    manifest = json.loads((SOURCE / "MANIFEST.json").read_text(encoding="utf-8"))
    if manifest.get("source_archive_sha256") != ARCHIVE_SHA:
        raise ValueError("unexpected approved design archive digest")
    expected: dict[str, tuple[int, str]] = {}
    for record in manifest["files"]:
        name = record["path"]
        parts = PurePosixPath(name).parts
        if not parts or any(segment in ("..", ".") for segment in parts) or name.startswith("/"):
            raise ValueError(f"unsafe manifest source path: {name!r}")
        if name in expected:
            raise ValueError(f"duplicate source path: {name}")
        expected[name] = (record["bytes"], record["sha256"])

    actual = {
        p.relative_to(SOURCE).as_posix()
        for p in SOURCE.rglob("*") if p.is_file()
    } - {"README.md", "MANIFEST.json"}
    missing, extra = sorted(expected.keys() - actual), sorted(actual - expected.keys())
    if missing or extra:
        raise ValueError(f"manifest drift: missing={missing}, extra={extra}")
    for name, (size, expected_sha) in expected.items():
        data = (SOURCE / name).read_bytes()
        if len(data) != size or hashlib.sha256(data).hexdigest() != expected_sha:
            raise ValueError(f"source-byte mismatch: {name}")
    print(f"Approved source integrity OK: {len(expected)} files, SHA-256 manifest matches.")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (OSError, KeyError, ValueError, TypeError) as error:
        print(f"Design integrity failure: {error}", file=sys.stderr)
        sys.exit(1)
