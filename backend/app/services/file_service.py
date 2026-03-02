"""
File I/O layer for traffic data persistence.

All functions here are stateless with respect to campaign orchestration —
they only care about reading/writing files safely. Thread safety is achieved
via an internal per-campaign lock registry that is separate from the
orchestration locks in api/traffic.py.
"""
import os
import json
import time
import threading
from typing import Any, Dict

from app.api.logging_config import get_logger

logger = get_logger("FileService")

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

TRAFFIC_DATA_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    "data",
    "traffic",
)
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

# Ensure the directory exists on import
try:
    os.makedirs(TRAFFIC_DATA_DIR, exist_ok=True)
    _test = os.path.join(TRAFFIC_DATA_DIR, ".test")
    with open(_test, "w") as _f:
        _f.write("test")
    os.remove(_test)
except Exception as _e:
    logger.error(f"Could not set up traffic data directory: {_e}")
    raise

# Internal per-campaign file-write locks.  Separate from the orchestration
# locks in api/traffic.py — there is no cross-module lock contention.
_file_write_locks: Dict[str, threading.Lock] = {}
_registry_lock = threading.Lock()


def _get_lock(campaign_id: str) -> threading.Lock:
    """Return (or create) the write lock for *campaign_id*."""
    with _registry_lock:
        if campaign_id not in _file_write_locks:
            _file_write_locks[campaign_id] = threading.Lock()
        return _file_write_locks[campaign_id]


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def append_campaign_log(campaign_id: str, message: str) -> None:
    """Append *message* to the campaign's per-campaign logs.txt file."""
    campaign_dir = os.path.join(TRAFFIC_DATA_DIR, campaign_id)
    os.makedirs(campaign_dir, exist_ok=True)
    log_file = os.path.join(campaign_dir, "logs.txt")
    with open(log_file, "a") as f:
        f.write(message + "\n")


def fix_corrupted_traffic_file(campaign_id: str) -> bool:
    """Fix a corrupted traffic.json by converting array → object format or recreating it."""
    try:
        campaign_file = os.path.join(TRAFFIC_DATA_DIR, campaign_id, "traffic.json")

        if not os.path.exists(campaign_file):
            with open(campaign_file, "w") as f:
                json.dump({}, f)
            logger.info(f"[FileService] Created new traffic file for campaign {campaign_id}")
            return True

        with open(campaign_file, "r") as f:
            try:
                current_data = json.load(f)
            except json.JSONDecodeError:
                logger.warning(f"[FileService] Corrupted JSON in campaign {campaign_id}, recreating")
                with open(campaign_file, "w") as f2:
                    json.dump({}, f2)
                return True

        if isinstance(current_data, list):
            logger.info(f"[FileService] Converting array → object format for campaign {campaign_id}")
            converted: Dict[str, Any] = {}
            for entry in current_data:
                eid = entry.get("id", f"request_{len(converted)}")
                converted[eid] = entry
            with open(campaign_file, "w") as f:
                json.dump(converted, f, indent=2)
            logger.info(f"[FileService] Converted {len(converted)} entries for campaign {campaign_id}")
            return True

        return True  # already valid object format

    except Exception as e:
        logger.error(f"[FileService] Error fixing traffic file for {campaign_id}: {e}", exc_info=True)
        return False


def append_traffic_to_file(campaign_id: str, traffic_data: Dict[str, Any]) -> bool:
    """
    Append a single traffic entry to traffic.json with retry logic and file rotation.

    Thread-safe: uses an internal per-campaign lock.
    Returns True on success, False (or raises) on permanent failure.
    """
    max_retries = 3
    retry_delay = 1  # seconds

    for attempt in range(max_retries):
        try:
            campaign_file = os.path.join(TRAFFIC_DATA_DIR, campaign_id, "traffic.json")
            os.makedirs(os.path.dirname(campaign_file), exist_ok=True)

            lock = _get_lock(campaign_id)
            with lock:
                # Create file if missing
                if not os.path.exists(campaign_file):
                    with open(campaign_file, "w") as f:
                        json.dump({}, f)

                # Rotate if too large
                if os.path.getsize(campaign_file) > MAX_FILE_SIZE:
                    backup_file = f"{campaign_file}.{int(time.time())}.bak"
                    os.rename(campaign_file, backup_file)
                    with open(campaign_file, "w") as f:
                        json.dump({}, f)
                    # Keep at most 5 backups
                    campaign_dir = os.path.dirname(campaign_file)
                    bak_files = sorted(
                        [fn for fn in os.listdir(campaign_dir) if fn.endswith(".bak")],
                        key=lambda fn: os.path.getmtime(os.path.join(campaign_dir, fn)),
                    )
                    for old_bak in bak_files[:-5]:
                        try:
                            os.remove(os.path.join(campaign_dir, old_bak))
                        except OSError:
                            pass

                # Read → convert legacy format → append → write
                with open(campaign_file, "r+") as f:
                    try:
                        data = json.load(f)
                    except json.JSONDecodeError:
                        data = {}

                    if isinstance(data, list):
                        logger.info(f"[FileService] Converting legacy list format for {campaign_id}")
                        converted = {}
                        for entry in data:
                            eid = entry.get("id", f"request_{len(converted)}")
                            converted[eid] = entry
                        data = converted

                    if not isinstance(data, dict):
                        raise ValueError(f"Unexpected data type: {type(data)}")

                    request_id = traffic_data.get("id", f"request_{int(time.time() * 1000)}")
                    data[request_id] = traffic_data

                    f.seek(0)
                    json.dump(data, f, indent=2)
                    f.truncate()

                return True

        except Exception as e:
            logger.error(
                f"[FileService] Error appending traffic (attempt {attempt + 1}/{max_retries}): {e}",
                exc_info=True,
            )
            if attempt < max_retries - 1:
                time.sleep(retry_delay)
            else:
                raise

    return False
