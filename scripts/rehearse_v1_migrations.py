#!/usr/bin/env python3
"""Rehearse the pinned v1 schema on an isolated PostgreSQL 18 database.

This is a CI compatibility check, not a production migration command.
"""
from __future__ import annotations

import json
import os
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parent.parent
LOCK = json.loads((ROOT / "schema/v1-migrations.lock.json").read_text("utf-8"))


def migration_paths(source: Path) -> list[Path]:
    result = sorted((source / "migrations").glob("*.up.sql"))
    if len(result) != LOCK["expected_up_migrations"]:
        raise ValueError(
            f"migration count changed: expected {LOCK['expected_up_migrations']}, got {len(result)}"
        )
    for item in result:
        if not item.with_name(item.name.replace(".up.sql", ".down.sql")).is_file():
            raise ValueError(f"missing down migration: {item.name}")
    return result


def run(source: Path) -> None:
    if not os.getenv("CLEARSIGHT_TEST_UPSTREAM_DSN"):
        raise ValueError("CLEARSIGHT_TEST_UPSTREAM_DSN is required")
    commit = subprocess.check_output(
        ["git", "-C", str(source), "rev-parse", "HEAD"], text=True
    ).strip()
    if commit != LOCK["source_commit"]:
        raise ValueError("upstream migration checkout is not the pinned source commit")
    if LOCK["postgres_major"] != 18:
        raise ValueError("unsupported PostgreSQL major")
    version = subprocess.check_output(
        ["psql", "-X", "-A", "-t", "-v", "ON_ERROR_STOP=1",
         os.environ["CLEARSIGHT_TEST_UPSTREAM_DSN"], "-c",
         "SHOW server_version_num"], text=True
    ).strip()
    if int(version) // 10000 != 18:
        raise ValueError(f"expected PostgreSQL 18, got server_version_num {version}")

    paths = migration_paths(source)
    for number, path in enumerate(paths, start=1):
        print(f"[{number}/{len(paths)}] {path.name}", flush=True)
        subprocess.run(
            ["psql", "-X", "-q", "-v", "ON_ERROR_STOP=1",
             os.environ["CLEARSIGHT_TEST_UPSTREAM_DSN"], "-f", str(path)],
            check=True,
        )
    print(f"Applied {len(paths)} pinned v1 up migrations on isolated PostgreSQL.")


if __name__ == "__main__":
    try:
        if len(sys.argv) != 2:
            raise ValueError("usage: python3 scripts/rehearse_v1_migrations.py <upstream-checkout>")
        run(Path(sys.argv[1]).resolve())
    except (ValueError, OSError, subprocess.CalledProcessError) as error:
        print(f"migration rehearsal failed: {error}", file=sys.stderr)
        sys.exit(1)
