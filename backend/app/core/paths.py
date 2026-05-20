import os
import shutil
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[2]
LEGACY_UPLOAD_DIR = BACKEND_ROOT / "uploads"
UPLOAD_DIR = BACKEND_ROOT / "data" / "uploads"


def sync_legacy_uploads(target: Path) -> None:
    if not LEGACY_UPLOAD_DIR.is_dir() or LEGACY_UPLOAD_DIR.resolve() == target.resolve():
        return
    for item in LEGACY_UPLOAD_DIR.iterdir():
        if not item.is_file():
            continue
        dest = target / item.name
        if dest.exists():
            continue
        try:
            shutil.copy2(item, dest)
        except OSError:
            pass


def resolve_upload_dir() -> Path:
    """Writable upload directory. Never write to root-owned legacy uploads/."""
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    sync_legacy_uploads(UPLOAD_DIR)

    probe = UPLOAD_DIR / ".write_probe"
    try:
        probe.write_text("ok")
        probe.unlink(missing_ok=True)
    except OSError as e:
        raise RuntimeError(f"Upload directory is not writable: {UPLOAD_DIR}") from e

    if not os.access(UPLOAD_DIR, os.W_OK):
        raise RuntimeError(f"Upload directory is not writable: {UPLOAD_DIR}")

    return UPLOAD_DIR
