"""
Image Cleanup Service
----------------------
- Har raat 3 baje chalta hai (background thread)
- 30 din se purani satellite images delete karta hai
- Disk usage monitor karta hai

Directories cleaned:
  data/processed/  → original_*.png, heatmap_*.png, comparison_*.png
  data/raw/        → raw satellite band files

API:
  GET /api/disk-usage → Current disk stats
"""

import os
import time
import shutil
import threading
from pathlib import Path
from datetime import datetime, timedelta
from src.config.paths import DATA_PRO_DIR, DATA_RAW_DIR
from src.utils.logger import get_logger

logger = get_logger("cleanup")

# ── Config ────────────────────────────────────────────────────────────────────
RETENTION_DAYS  = int(os.getenv("IMAGE_RETENTION_DAYS", "30"))  # 30 din tak rakhna
CLEANUP_HOUR    = 3   # Raat 3 baje chale
MIN_FREE_GB     = 2.0 # Agar disk space < 2GB ho to aur aggressively clean karo


def get_disk_stats() -> dict:
    """Disk usage stats return karo."""
    dirs_to_check = {
        "processed": DATA_PRO_DIR,
        "raw":       DATA_RAW_DIR,
    }
    result = {}
    total_size = 0

    for name, directory in dirs_to_check.items():
        if not directory.exists():
            result[name] = {"files": 0, "size_mb": 0.0}
            continue
        files = list(directory.glob("*"))
        size  = sum(f.stat().st_size for f in files if f.is_file())
        result[name] = {
            "files":   len(files),
            "size_mb": round(size / (1024 * 1024), 2),
        }
        total_size += size

    # System disk stats
    try:
        usage = shutil.disk_usage(DATA_PRO_DIR.parent)
        result["disk"] = {
            "total_gb":  round(usage.total / (1024**3), 2),
            "used_gb":   round(usage.used  / (1024**3), 2),
            "free_gb":   round(usage.free  / (1024**3), 2),
            "used_pct":  round(usage.used / usage.total * 100, 1),
        }
    except Exception:
        result["disk"] = {}

    result["total_images_mb"] = round(total_size / (1024 * 1024), 2)
    return result


def cleanup_old_images(retention_days: int = RETENTION_DAYS) -> dict:
    """
    Purani images delete karo.
    Returns: { deleted_count, freed_mb, errors }
    """
    cutoff  = datetime.now() - timedelta(days=retention_days)
    deleted = 0
    freed   = 0.0
    errors  = []

    # Patterns to clean in processed/
    patterns = [
        "original_*.png",
        "heatmap_*.png",
        "comparison_*.png",
    ]

    dirs = [DATA_PRO_DIR, DATA_RAW_DIR]

    for directory in dirs:
        if not directory.exists():
            continue
        for pattern in patterns:
            for f in directory.glob(pattern):
                try:
                    mtime = datetime.fromtimestamp(f.stat().st_mtime)
                    if mtime < cutoff:
                        size_mb = f.stat().st_size / (1024 * 1024)
                        f.unlink()
                        deleted += 1
                        freed   += size_mb
                        logger.info(f"Deleted: {f.name} ({size_mb:.2f} MB)")
                except Exception as e:
                    errors.append(str(e))
                    logger.error(f"Could not delete {f}: {e}")

    # Also clean any file in raw/ older than retention
    if DATA_RAW_DIR.exists():
        for f in DATA_RAW_DIR.iterdir():
            if f.is_file():
                try:
                    mtime = datetime.fromtimestamp(f.stat().st_mtime)
                    if mtime < cutoff:
                        size_mb = f.stat().st_size / (1024 * 1024)
                        f.unlink()
                        deleted += 1
                        freed   += size_mb
                except Exception as e:
                    errors.append(str(e))

    freed = round(freed, 2)
    logger.info(
        f"Cleanup done | deleted={deleted} files | freed={freed} MB | "
        f"retention={retention_days} days"
    )
    return {"deleted_count": deleted, "freed_mb": freed, "errors": errors}


def emergency_cleanup() -> dict:
    """
    Disk space < 2GB ho to aggressive cleanup — 7 din se purana sab delete karo.
    """
    logger.warning("LOW DISK SPACE! Running emergency cleanup (7 day retention)...")
    return cleanup_old_images(retention_days=7)


def _cleanup_loop():
    """Background thread — raat 3 baje daily cleanup karo."""
    logger.info(f"Cleanup service started | retention={RETENTION_DAYS} days | runs at 03:00 daily")

    while True:
        try:
            now  = datetime.now()
            # Aaj raat 3 baje
            next_run = now.replace(hour=CLEANUP_HOUR, minute=0, second=0, microsecond=0)
            if next_run <= now:
                next_run += timedelta(days=1)  # Kal raat 3 baje

            wait_seconds = (next_run - now).total_seconds()
            logger.info(f"Next cleanup: {next_run.strftime('%Y-%m-%d %H:%M')} (in {wait_seconds/3600:.1f} hrs)")
            time.sleep(wait_seconds)

            # Check disk space
            stats = get_disk_stats()
            free_gb = stats.get("disk", {}).get("free_gb", 99)

            if free_gb < MIN_FREE_GB:
                result = emergency_cleanup()
            else:
                result = cleanup_old_images()

            logger.info(f"Scheduled cleanup complete: {result}")

        except Exception as e:
            logger.error(f"Cleanup error: {e}")
            time.sleep(3600)  # Error ke baad 1 ghante mein retry


def start_cleanup_service():
    """Cleanup service ko background thread mein start karo."""
    t = threading.Thread(target=_cleanup_loop, daemon=True, name="cleanup-service")
    t.start()
    logger.info("Image cleanup service started (background)")
