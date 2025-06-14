import os
import json
from flask import Blueprint, request, jsonify
from typing import List, Optional, Dict, Any
import threading
import random
import time
from datetime import datetime
from dataclasses import dataclass

bp = Blueprint('traffic', __name__)

TRAFFIC_DATA_DIR = os.path.join(os.path.dirname(__file__), 'traffic_data')
os.makedirs(TRAFFIC_DATA_DIR, exist_ok=True)
ALL_TRAFFIC_FILE = os.path.join(TRAFFIC_DATA_DIR, 'all_traffic.json')

def append_traffic_to_file(campaign_id: str, traffic_data: Dict[str, Any]):
    # Per-campaign file
    campaign_file = os.path.join(TRAFFIC_DATA_DIR, f'{campaign_id}.json')
    for file in [campaign_file, ALL_TRAFFIC_FILE]:
        if os.path.exists(file):
            with open(file, 'r+') as f:
                try:
                    data = json.load(f)
                except Exception:
                    data = []
                data.append(traffic_data)
                f.seek(0)
                json.dump(data, f)
                f.truncate()
        else:
            with open(file, 'w') as f:
                json.dump([traffic_data], f)

@dataclass
class TrafficConfig:
    campaign_id: str
    target_url: str
    requests_per_minute: int = 10
    duration_minutes: Optional[int] = 60
    geo_locations: List[str] = None
    rtb_config: Optional[Dict[str, Any]] = None
    config: Optional[Dict[str, Any]] = None
    user_profiles: List[Dict[str, Any]] = None

    def __post_init__(self):
        if self.geo_locations is None:
            self.geo_locations = ["United States"]
        if self.user_profiles is None:
            self.user_profiles = []

def generate_traffic_background(config: TrafficConfig):
    """Background task to generate traffic"""
    start_time = time.time()
    request_count = 0
    
    while True:
        # Check if we should stop
        if config.duration_minutes and (time.time() - start_time) > (config.duration_minutes * 60):
            break
            
        # Generate traffic batch
        batch_size = min(config.requests_per_minute, 10)  # Process in smaller batches
        for _ in range(batch_size):
            try:
                # Generate traffic data
                traffic_data = generate_traffic_data(config)
                
                # Simulate request
                simulate_request(traffic_data)
                
                append_traffic_to_file(config.campaign_id, traffic_data)
                
                request_count += 1
                
            except Exception as e:
                print(f"Error generating traffic: {str(e)}")
        
        # Wait for next batch
        time.sleep(60 / config.requests_per_minute)

@bp.route("/generate", methods=['POST'])
def generate_traffic():
    try:
        data = request.get_json()
        config = TrafficConfig(**data)

        # Validate configuration
        if config.requests_per_minute <= 0:
            return jsonify({
                "success": False,
                "message": "Requests per minute must be greater than 0"
            }), 400
        
        if config.duration_minutes is not None and config.duration_minutes <= 0:
            return jsonify({
                "success": False,
                "message": "Duration must be greater than 0"
            }), 400

        # Start traffic generation in background thread
        thread = threading.Thread(target=generate_traffic_background, args=(config,))
        thread.daemon = True
        thread.start()
        
        return jsonify({
            "success": True,
            "message": "Traffic generation started",
            "data": {"campaign_id": config.campaign_id}
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

def generate_traffic_data(config: TrafficConfig) -> Dict[str, Any]:
    """Generate traffic data based on configuration"""
    return {
        "timestamp": datetime.utcnow().isoformat(),
        "campaign_id": config.campaign_id,
        "target_url": config.target_url,
        "geo_location": random.choice(config.geo_locations),
        "user_agent": random.choice([
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            "Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15"
        ]),
        "rtb_data": generate_rtb_data(config.rtb_config) if config.rtb_config else None
    }

def generate_rtb_data(rtb_config: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """Generate RTB data if RTB configuration is provided"""
    if not rtb_config:
        return None
        
    return {
        "device_brand": rtb_config.get("device_brand", "samsung"),
        "device_model": random.choice(rtb_config.get("device_models", ["Galaxy S24"])),
        "ad_format": random.choice(rtb_config.get("ad_formats", ["banner"])),
        "app_category": random.choice(rtb_config.get("app_categories", ["IAB9"])),
        "adid": generate_adid() if rtb_config.get("generate_adid", True) else None
    }

def generate_adid() -> str:
    """Generate a random advertising ID"""
    return f"{random.randint(10000000, 99999999)}-{random.randint(1000, 9999)}-{random.randint(1000, 9999)}-{random.randint(1000, 9999)}"

def simulate_request(traffic_data: Dict[str, Any]):
    """Simulate making a request with the generated traffic data"""
    # Here you would typically make an actual HTTP request
    # For now, we'll just simulate it with a small delay
    time.sleep(random.uniform(0.1, 0.5))
    return True

@bp.route("/generated")
def get_all_generated_traffic():
    if not os.path.exists(ALL_TRAFFIC_FILE):
        return jsonify([])
    with open(ALL_TRAFFIC_FILE, 'r') as f:
        return jsonify(json.load(f))

@bp.route("/generated/<campaign_id>")
def get_campaign_generated_traffic(campaign_id: str):
    campaign_file = os.path.join(TRAFFIC_DATA_DIR, f'{campaign_id}.json')
    if not os.path.exists(campaign_file):
        return jsonify([])
    with open(campaign_file, 'r') as f:
        return jsonify(json.load(f)) 