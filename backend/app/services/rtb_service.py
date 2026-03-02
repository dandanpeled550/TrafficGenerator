"""
RTB data generation layer.

All functions here are pure (no shared mutable state):
  - generate_adid()           → new advertising ID string
  - generate_rtb_data()       → OpenRTB 2.5 bid request dict
  - simulate_request()        → simulates network latency + success/failure
"""
import random
import string
import time
from datetime import datetime
from typing import Any, Dict, Optional

from faker import Faker

from app.api.logging_config import get_logger

logger = get_logger("RTBService")


# ---------------------------------------------------------------------------
# ADID generation
# ---------------------------------------------------------------------------


def generate_adid() -> str:
    """Return a random advertising ID in XXXXXXXX-XXXX-XXXX-XXXX format."""
    return (
        f"{random.randint(10_000_000, 99_999_999)}"
        f"-{random.randint(1000, 9999)}"
        f"-{random.randint(1000, 9999)}"
        f"-{random.randint(1000, 9999)}"
    )


# ---------------------------------------------------------------------------
# RTB data generation
# ---------------------------------------------------------------------------


def generate_rtb_data(
    rtb_config: Optional[Dict[str, Any]],
    user_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Generate an OpenRTB 2.5-compatible bid request dict.

    Parameters
    ----------
    rtb_config : dict
        Campaign RTB configuration (device brand, ad formats, etc.)
    user_id : str, optional
        The ADID/user ID to embed in the ``user`` section.  If *None* the
        value falls back to whatever is in ``rtb_config["user_id"]`` or the
        literal string ``"user123"``.
    """
    if not rtb_config:
        return None

    fake = Faker()
    try:
        # --- imp section ---
        imp = [
            {
                "id": "1",
                "banner": {
                    "w": rtb_config.get("banner_w", 300),
                    "h": rtb_config.get("banner_h", 250),
                },
                "bidfloor": rtb_config.get("bidfloor", 0.03),
                "bidfloorcur": rtb_config.get("bidfloorcur", "USD"),
            }
        ]

        # --- site section ---
        site = {
            "id": rtb_config.get("site_id", "site123"),
            "name": rtb_config.get("site_name", "Example Site"),
            "domain": rtb_config.get("site_domain", "example.com"),
        }

        # --- device section ---
        device = {
            "ua": rtb_config.get("ua", fake.user_agent()),
            "ip": rtb_config.get("ip", fake.ipv4()),
        }

        # --- user section ---
        resolved_user_id = user_id or rtb_config.get("user_id", "user123")
        user = {"id": resolved_user_id}

        # --- top-level bid request ---
        rtb_data = {
            "id": "".join(random.choices(string.digits, k=10)),
            "imp": imp,
            "site": site,
            "device": device,
            "user": user,
            "at": rtb_config.get("at", 2),
            "tmax": rtb_config.get("tmax", 120),
            "cur": rtb_config.get("cur", ["USD"]),
        }
        return rtb_data

    except Exception as e:
        logger.error(f"[RTBService] Error generating RTB data: {e}", exc_info=True)
        return {}


# ---------------------------------------------------------------------------
# Request simulation
# ---------------------------------------------------------------------------


def simulate_request(traffic_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Simulate network latency and a success/failure outcome.

    Mutates and returns *traffic_data* with response fields added.
    Success rate: ~85%.
    """
    try:
        if not isinstance(traffic_data, dict):
            raise ValueError("traffic_data must be a dict")

        # Simulate network latency (50–500 ms)
        time.sleep(random.uniform(0.05, 0.5))

        success = random.random() < 0.85
        error_codes = [400, 403, 404, 500]

        response = {
            "success": success,
            "response_time": round(random.uniform(50, 500), 2),  # ms
            "status_code": 200 if success else random.choice(error_codes),
            "response_size": random.randint(500, 2000),  # bytes
            "bid_id": (
                f"bid-{random.randint(1_000_000, 9_999_999)}"
                if traffic_data.get("rtb_data")
                else None
            ),
            "win_price": (
                round(random.uniform(0.1, 5.0), 2)
                if success and traffic_data.get("rtb_data")
                else None
            ),
            "currency": "USD" if success and traffic_data.get("rtb_data") else None,
            "timestamp": datetime.utcnow().isoformat(),
        }

        traffic_data.update(response)
        return traffic_data

    except Exception as e:
        logger.error(f"[RTBService] Error simulating request: {e}", exc_info=True)
        error_response = {
            "success": False,
            "error": str(e),
            "status_code": 500,
            "timestamp": datetime.utcnow().isoformat(),
        }
        if isinstance(traffic_data, dict):
            traffic_data.update(error_response)
        else:
            traffic_data = error_response
        return traffic_data
