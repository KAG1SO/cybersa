"""Create a shareable source archive without local secrets or participant data."""

import os
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT.parent / f"{ROOT.name}-source.zip"
EXCLUDED_DIRECTORIES = {
    ".git",
    ".venv",
    "venv",
    "env",
    "__pycache__",
    "node_modules",
    ".pytest_cache",
    ".mypy_cache",
}


def is_sensitive_file(name: str) -> bool:
    lowered = name.lower()
    return (
        lowered.startswith(".env")
        or lowered.endswith((
            ".db", ".db-wal", ".db-shm", ".db-journal",
            ".sqlite", ".sqlite3", ".sqlite-wal", ".sqlite-shm", ".sqlite-journal",
            ".csv", ".xlsx", ".zip", ".7z", ".rar",
        ))
        or lowered.endswith((".pyc", ".pyo"))
    )


def main() -> None:
    with ZipFile(OUTPUT, "w", compression=ZIP_DEFLATED) as archive:
        for directory, subdirectories, filenames in os.walk(ROOT):
            subdirectories[:] = [
                name for name in subdirectories if name not in EXCLUDED_DIRECTORIES
            ]
            for filename in filenames:
                if is_sensitive_file(filename):
                    continue
                path = Path(directory) / filename
                archive.write(path, path.relative_to(ROOT).as_posix())
    print(f"Created {OUTPUT}")


if __name__ == "__main__":
    main()
