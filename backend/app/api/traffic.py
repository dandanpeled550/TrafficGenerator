import os
import json
from flask import Blueprint, request, jsonify
from typing import List, Optional, Dict, Any
import threading
import random
import time
from datetime import datetime, timedelta
from dataclasses import dataclass, field
import logging
from threading import Lock
import uuid

# Configure logging
logger = logging.getLogger(__name__)

bp = Blueprint('traffic', __name__)

TRAFFIC_DATA_DIR = os.path.join(os.path.dirname(__file__), 'traffic_data')
os.makedirs(TRAFFIC_DATA_DIR, exist_ok=True)
ALL_TRAFFIC_FILE = os.path.join(TRAFFIC_DATA_DIR, 'all_traffic.json')

# Add after other global variables
active_threads = {}
thread_locks = {}

def append_traffic_to_file(campaign_id: str, traffic_data: Dict[str, Any]):
    """Append traffic data to campaign-specific file"""
    try:
        logger.info(f"[File Operation] Starting to append traffic data for campaign {campaign_id}")
        campaign_file = os.path.join(TRAFFIC_DATA_DIR, campaign_id, 'traffic.json')
        
        # Ensure campaign directory exists
        os.makedirs(os.path.dirname(campaign_file), exist_ok=True)
        
        if not os.path.exists(campaign_file):
            logger.info(f"[File Operation] Creating new campaign file: {campaign_file}")
            with open(campaign_file, 'w') as f:
                json.dump([], f)
            logger.info(f"[File Operation] Created new campaign file successfully")

        logger.debug(f"[File Operation] Opening file for read/write: {campaign_file}")
        with open(campaign_file, 'r+') as f:
            try:
                data = json.load(f)
                logger.debug(f"[File Operation] Successfully loaded existing data, current size: {len(data)} entries")
            except json.JSONDecodeError:
                logger.warning(f"[File Operation] JSON decode error, initializing empty data array")
                data = []
            
            data.append(traffic_data)
            logger.debug(f"[File Operation] Added new traffic data, new size: {len(data)} entries")
            
            f.seek(0)
            json.dump(data, f, indent=2)
            f.truncate()
            logger.info(f"[File Operation] Successfully wrote updated data to file")
            
        logger.info(f"[File Operation] Successfully appended traffic data to {campaign_file}")
    except Exception as e:
        logger.error(f"[File Operation] Error appending traffic data: {str(e)}", exc_info=True)
        raise

@dataclass
class TrafficConfig:
    campaign_id: str
    target_url: str
    requests_per_minute: int = 10
    duration_minutes: Optional[int] = 60
    geo_locations: List[str] = field(default_factory=lambda: ["United States"])
    rtb_config: Dict[str, Any] = field(default_factory=dict)
    config: Dict[str, Any] = field(default_factory=dict)
    user_profiles: List[Dict[str, Any]] = None
    log_file_path: Optional[str] = None
    status: str = "draft"
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    total_requests: int = 0
    successful_requests: int = 0
    last_activity_time: Optional[datetime] = None
    progress_percentage: float = 0.0
    user_profile_ids: List[str] = None
    profile_user_counts: Dict[str, int] = None
    total_profile_users: int = 0

    def __post_init__(self):
        if self.user_profiles is None:
            self.user_profiles = []
        if self.created_at is None:
            self.created_at = datetime.utcnow()
        if self.updated_at is None:
            self.updated_at = datetime.utcnow()

    def to_dict(self) -> Dict[str, Any]:
        """Convert TrafficConfig to a dictionary with serializable values"""
        return {
            "campaign_id": self.campaign_id,
            "target_url": self.target_url,
            "requests_per_minute": self.requests_per_minute,
            "duration_minutes": self.duration_minutes,
            "geo_locations": self.geo_locations,
            "rtb_config": self.rtb_config,
            "config": self.config,
            "start_time": self.start_time.isoformat() if self.start_time else None,
            "end_time": self.end_time.isoformat() if self.end_time else None
        }

def generate_traffic_background(config: TrafficConfig):
    """Generate traffic in the background"""
    thread_id = str(uuid.uuid4())
    active_threads[config.campaign_id] = thread_id
    
    try:
        logger.info(f"[Traffic Generation] Starting background traffic generation for campaign {config.campaign_id}")
        logger.info(f"[Traffic Generation] Thread ID: {thread_id}")
        logger.info(f"[Traffic Generation] Configuration: {json.dumps(config.to_dict(), indent=2)}")

        # Create campaign-specific directory and file
        campaign_dir = os.path.join(TRAFFIC_DATA_DIR, config.campaign_id)
        logger.info(f"[Traffic Generation] Creating campaign directory: {campaign_dir}")
        os.makedirs(campaign_dir, exist_ok=True)
        
        campaign_file = os.path.join(campaign_dir, 'traffic.json')
        if not os.path.exists(campaign_file):
            logger.info(f"[Traffic Generation] Creating new campaign file: {campaign_file}")
            with open(campaign_file, 'w') as f:
                json.dump([], f)
            logger.info(f"[Traffic Generation] Created new campaign file successfully")

        # Calculate total requests
        total_requests = config.requests_per_minute * (config.duration_minutes or 60)
        logger.info(f"[Traffic Generation] Will generate {total_requests} total requests")
        logger.info(f"[Traffic Generation] Requests per minute: {config.requests_per_minute}")
        logger.info(f"[Traffic Generation] Duration minutes: {config.duration_minutes}")

        # Generate traffic
        request_count = 0
        start_time = datetime.utcnow()
        config.start_time = start_time
        end_time = start_time + timedelta(minutes=config.duration_minutes) if config.duration_minutes else None
        config.end_time = end_time
        logger.info(f"[Traffic Generation] Start time: {start_time.isoformat()}")
        logger.info(f"[Traffic Generation] End time: {end_time.isoformat() if end_time else 'No end time set'}")

        # Update campaign status to running
        logger.info(f"[Traffic Generation] Updating campaign status to running")
        update_campaign_status(config.campaign_id, "running", {
            "start_time": start_time.isoformat(),
            "total_requests": total_requests
        })

        while True:
            try:
                # Check if thread was stopped
                if active_threads.get(config.campaign_id) != thread_id:
                    logger.info(f"[Traffic Generation] Traffic generation stopped for campaign {config.campaign_id}")
                    break

                # Check if we should stop
                if end_time and datetime.utcnow() >= end_time:
                    logger.info(f"[Traffic Generation] Reached duration limit for campaign {config.campaign_id}")
                    break

                # Generate traffic data
                logger.debug(f"[Traffic Generation] Generating traffic data for request {request_count + 1}")
                traffic_data = generate_traffic_data(config)
                logger.debug(f"[Traffic Generation] Generated traffic data: {json.dumps(traffic_data, indent=2)}")

                # Simulate request
                logger.debug(f"[Traffic Generation] Simulating request for request {request_count + 1}")
                response_data = simulate_request(traffic_data)
                logger.debug(f"[Traffic Generation] Simulated request response: {json.dumps(response_data, indent=2)}")

                # Save to campaign-specific file
                logger.debug(f"[Traffic Generation] Saving request {request_count + 1} to file")
                with thread_locks.get(config.campaign_id, Lock()):
                    append_traffic_to_file(config.campaign_id, response_data)
                
                request_count += 1
                logger.info(f"[Traffic Generation] Successfully saved request {request_count} for campaign {config.campaign_id}")

                # Update progress
                progress = (request_count / total_requests) * 100 if total_requests > 0 else 0
                logger.info(f"[Traffic Generation] Progress: {progress:.2f}% ({request_count}/{total_requests} requests)")
                update_campaign_status(config.campaign_id, "running", {
                    "progress_percentage": progress,
                    "total_requests": request_count,
                    "successful_requests": request_count if response_data.get('success') else request_count - 1
                })

                # Calculate sleep time
                sleep_time = 60 / config.requests_per_minute
                if config.config.get('randomize_timing', True):
                    sleep_time *= random.uniform(0.8, 1.2)
                logger.debug(f"[Traffic Generation] Sleeping for {sleep_time:.2f} seconds")
                time.sleep(sleep_time)

            except Exception as e:
                logger.error(f"[Traffic Generation] Error in traffic generation loop: {str(e)}", exc_info=True)
                update_campaign_status(config.campaign_id, "error", {
                    "error": str(e),
                    "last_request_count": request_count
                })
                time.sleep(1)  # Prevent tight loop on error

        # Update final status
        final_status = "completed" if request_count > 0 else "error"
        logger.info(f"[Traffic Generation] Setting final status to {final_status}")
        update_campaign_status(config.campaign_id, final_status, {
            "end_time": datetime.utcnow().isoformat(),
            "total_requests": request_count,
            "successful_requests": request_count if response_data.get('success') else request_count - 1
        })

        logger.info(f"[Traffic Generation] Completed traffic generation for campaign {config.campaign_id}")
        logger.info(f"[Traffic Generation] Generated {request_count} requests")
        logger.info(f"[Traffic Generation] Final status: {final_status}")

    except Exception as e:
        logger.error(f"[Traffic Generation] Error in background traffic generation: {str(e)}", exc_info=True)
        update_campaign_status(config.campaign_id, "error", {
            "error": str(e)
        })
    finally:
        logger.info(f"[Traffic Generation] Cleaning up resources for campaign {config.campaign_id}")
        if active_threads.get(config.campaign_id) == thread_id:
            del active_threads[config.campaign_id]
            logger.info(f"[Traffic Generation] Removed campaign from active threads")
        if config.campaign_id in thread_locks:
            del thread_locks[config.campaign_id]
            logger.info(f"[Traffic Generation] Removed thread lock")

@bp.route("/generate", methods=['POST'])
def generate_traffic():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        # Validate required fields
        required_fields = ['campaign_id', 'target_url', 'requests_per_minute']
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400

        # Validate user profiles
        if not data.get('user_profile_ids'):
            return jsonify({"error": "At least one user profile is required"}), 400

        # Validate profile user counts
        profile_user_counts = data.get('profile_user_counts', {})
        if not profile_user_counts:
            return jsonify({"error": "User counts must be specified for each profile"}), 400

        total_users = sum(profile_user_counts.values())
        if total_users == 0:
            return jsonify({"error": "Total number of users must be greater than 0"}), 400

        # Check if traffic generation is already running
        campaign_id = data['campaign_id']
        if campaign_id in active_threads:
            return jsonify({
                "error": "Traffic generation is already running for this campaign",
                "status": "running"
            }), 409

        # Create traffic config
        config = TrafficConfig(
            campaign_id=campaign_id,
            target_url=data['target_url'],
            requests_per_minute=data['requests_per_minute'],
            duration_minutes=data.get('duration_minutes'),
            user_profile_ids=data['user_profile_ids'],
            profile_user_counts=profile_user_counts,
            total_profile_users=total_users,
            log_file_path=data.get('log_file_path'),
            log_level=data.get('log_level'),
            log_format=data.get('log_format')
        )

        # Start traffic generation in background
        thread = threading.Thread(
            target=generate_traffic_background,
            args=(config,),
            daemon=True
        )
        thread.start()

        # Store thread reference
        active_threads[campaign_id] = thread.ident
        thread_locks[campaign_id] = threading.Lock()

        # Update campaign status
        update_campaign_status(campaign_id, "running")

        return jsonify({
            "message": "Traffic generation started",
            "campaign_id": campaign_id,
            "status": "running"
        })

    except Exception as e:
        logger.error(f"Error starting traffic generation: {str(e)}")
        return jsonify({"error": str(e)}), 500

def generate_traffic_data(config: TrafficConfig) -> Dict[str, Any]:
    """Generate a single traffic data entry"""
    try:
        logger.debug(f"Generating traffic data for campaign {config.campaign_id}")
        
        # Generate base traffic data
        traffic_data = {
            "id": str(int(time.time() * 1000)),
            "timestamp": datetime.utcnow().isoformat(),
            "campaign_id": config.campaign_id,
            "target_url": config.target_url,
            "requests_per_minute": config.requests_per_minute,
            "duration_minutes": config.duration_minutes,
            "geo_locations": config.geo_locations,
            "rtb_config": config.rtb_config,
            "config": config.config,
            "user_profile_ids": config.user_profile_ids,
            "profile_user_counts": config.profile_user_counts,
            "total_profile_users": config.total_profile_users
        }
        
        # Add RTB data if configured
        if config.rtb_config:
            traffic_data["rtb_data"] = generate_rtb_data(config.rtb_config)
        
        logger.debug(f"Generated traffic data: {json.dumps(traffic_data, indent=2)}")
        return traffic_data
    except Exception as e:
        logger.error(f"Error generating traffic data: {str(e)}", exc_info=True)
        raise

def generate_rtb_data(rtb_config: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """Generate RTB data if RTB configuration is provided"""
    if not rtb_config:
        return None
    
    # Default values for RTB configuration
    default_device_models = ["Galaxy S24", "iPhone 15", "Pixel 8"]
    default_ad_formats = ["banner", "interstitial", "native"]
    default_app_categories = ["IAB9", "IAB1", "IAB2"]
    
    # Get values from config with defaults
    device_models = rtb_config.get("device_models", default_device_models)
    ad_formats = rtb_config.get("ad_formats", default_ad_formats)
    app_categories = rtb_config.get("app_categories", default_app_categories)
    
    # Ensure lists are not empty
    if not device_models:
        logger.warning("Empty device_models list, using defaults")
        device_models = default_device_models
    if not ad_formats:
        logger.warning("Empty ad_formats list, using defaults")
        ad_formats = default_ad_formats
    if not app_categories:
        logger.warning("Empty app_categories list, using defaults")
        app_categories = default_app_categories
        
    return {
        "device_brand": rtb_config.get("device_brand", "samsung"),
        "device_model": random.choice(device_models),
        "ad_format": random.choice(ad_formats),
        "app_category": random.choice(app_categories),
        "adid": generate_adid() if rtb_config.get("generate_adid", True) else None
    }

def generate_adid() -> str:
    """Generate a random advertising ID"""
    return f"{random.randint(10000000, 99999999)}-{random.randint(1000, 9999)}-{random.randint(1000, 9999)}-{random.randint(1000, 9999)}"

def simulate_request(traffic_data: Dict[str, Any]) -> Dict[str, Any]:
    """Simulate making a request with the generated traffic data"""
    try:
        logger.debug(f"Simulating request for traffic data: {traffic_data}")
        
        # Simulate network latency (50-500ms)
        latency = random.uniform(0.05, 0.5)
        logger.debug(f"Simulated network latency: {latency:.3f}s")
        time.sleep(latency)
        
        # Simulate success rate (85% success)
        success = random.random() < 0.85
        logger.debug(f"Request success: {success}")
        
        # Error status codes
        error_codes = [400, 403, 404, 500]
        
        # Add response data
        response_data = {
            "success": success,
            "response_time": round(random.uniform(50, 500), 2),  # ms
            "status_code": 200 if success else random.choice(error_codes),
            "response_size": random.randint(500, 2000),  # bytes
            "bid_id": f"bid-{random.randint(1000000, 9999999)}" if traffic_data.get('rtb_data') else None,
            "win_price": round(random.uniform(0.1, 5.0), 2) if success and traffic_data.get('rtb_data') else None,
            "currency": "USD" if success and traffic_data.get('rtb_data') else None
        }
        logger.debug(f"Generated response data: {response_data}")
        
        # Merge response data with traffic data
        traffic_data.update(response_data)
        logger.debug(f"Final traffic data with response: {traffic_data}")
        
        return traffic_data
    except Exception as e:
        logger.error(f"Error simulating request: {str(e)}", exc_info=True)
        traffic_data.update({
            "success": False,
            "error": str(e),
            "status_code": 500
        })
        return traffic_data

@bp.route("/generated/<campaign_id>", methods=['GET'])
def get_campaign_traffic(campaign_id: str):
    """Get generated traffic for a specific campaign"""
    try:
        logger.info(f"[API] Getting generated traffic for campaign {campaign_id}")
        campaign_file = os.path.join(TRAFFIC_DATA_DIR, campaign_id, 'traffic.json')
        
        if os.path.exists(campaign_file):
            with open(campaign_file, 'r') as f:
                traffic_data = json.load(f)
            logger.info(f"[API] Retrieved {len(traffic_data)} traffic entries for campaign {campaign_id}")
            return jsonify({
                "success": True,
                "data": traffic_data,
                "metadata": {
                    "total_requests": len(traffic_data),
                    "successful_requests": sum(1 for entry in traffic_data if entry.get('success', False)),
                    "last_updated": datetime.utcnow().isoformat()
                }
            })
        else:
            logger.warning(f"[API] No traffic data found for campaign {campaign_id}")
            return jsonify({
                "success": True,
                "data": [],
                "metadata": {
                    "total_requests": 0,
                    "successful_requests": 0,
                    "last_updated": datetime.utcnow().isoformat()
                }
            })
    except Exception as e:
        logger.error(f"[API] Error getting campaign traffic: {str(e)}", exc_info=True)
        return jsonify({
            "success": False,
            "message": f"Error getting campaign traffic: {str(e)}"
        }), 500

@bp.route("/download/<campaign_id>", methods=['GET'])
def download_campaign_traffic(campaign_id: str):
    """Download generated traffic for a specific campaign"""
    try:
        logger.info(f"[API] Download request for campaign {campaign_id} traffic")
        campaign_file = os.path.join(TRAFFIC_DATA_DIR, campaign_id, 'traffic.json')
        
        if not os.path.exists(campaign_file):
            logger.warning(f"[API] No traffic data found for campaign {campaign_id}")
            return jsonify({
                "success": False,
                "message": "No traffic data found for campaign"
            }), 404
            
        with open(campaign_file, 'r') as f:
            traffic_data = json.load(f)
            
        # Add metadata to the download
        download_data = {
            "campaign_id": campaign_id,
            "download_time": datetime.utcnow().isoformat(),
            "total_requests": len(traffic_data),
            "successful_requests": sum(1 for entry in traffic_data if entry.get('success', False)),
            "traffic_data": traffic_data
        }
        
        logger.info(f"[API] Preparing download of {len(traffic_data)} entries for campaign {campaign_id}")
        return jsonify({
            "success": True,
            "data": download_data,
            "filename": f"traffic_{campaign_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
        })
        
    except Exception as e:
        logger.error(f"[API] Error preparing download: {str(e)}", exc_info=True)
        return jsonify({
            "success": False,
            "message": f"Error preparing download: {str(e)}"
        }), 500

@bp.route("/monitor/<campaign_id>", methods=['GET'])
def monitor_campaign(campaign_id: str):
    """Get real-time monitoring data for a campaign"""
    try:
        logger.info(f"[API] Monitoring request for campaign {campaign_id}")
        
        # Check if campaign is running
        is_running = campaign_id in active_threads
        
        # Get campaign file path
        campaign_file = os.path.join(TRAFFIC_DATA_DIR, campaign_id, 'traffic.json')
        
        # Get campaign data
        campaign_data = {
            "campaign_id": campaign_id,
            "is_running": is_running,
            "has_data": os.path.exists(campaign_file),
            "last_updated": datetime.utcnow().isoformat()
        }
        
        # Add file stats if exists
        if os.path.exists(campaign_file):
            try:
                with open(campaign_file, 'r') as f:
                    data = json.load(f)
                    campaign_data.update({
                        "total_requests": len(data),
                        "successful_requests": sum(1 for req in data if req.get('success', False)),
                        "last_request": data[-1] if data else None,
                        "requests_per_minute": calculate_requests_per_minute(data),
                        "success_rate": calculate_success_rate(data),
                        "average_response_time": calculate_average_response_time(data)
                    })
            except Exception as e:
                logger.error(f"[API] Error reading campaign file: {str(e)}", exc_info=True)
        
        logger.info(f"[API] Monitoring data for campaign {campaign_id}: {json.dumps(campaign_data, indent=2)}")
        return jsonify({
            "success": True,
            "data": campaign_data
        })

    except Exception as e:
        logger.error(f"[API] Error monitoring campaign: {str(e)}", exc_info=True)
        return jsonify({
            "success": False,
            "message": f"Error monitoring campaign: {str(e)}"
        }), 500

def calculate_requests_per_minute(data: List[Dict[str, Any]]) -> float:
    """Calculate requests per minute from traffic data"""
    if not data:
        return 0.0
        
    timestamps = [datetime.fromisoformat(entry['timestamp']) for entry in data if 'timestamp' in entry]
    if not timestamps:
        return 0.0
        
    start_time = min(timestamps)
    end_time = max(timestamps)
    duration_minutes = (end_time - start_time).total_seconds() / 60
    
    return len(data) / duration_minutes if duration_minutes > 0 else 0.0

def calculate_success_rate(data: List[Dict[str, Any]]) -> float:
    """Calculate success rate from traffic data"""
    if not data:
        return 0.0
        
    successful = sum(1 for entry in data if entry.get('success', False))
    return (successful / len(data)) * 100

def calculate_average_response_time(data: List[Dict[str, Any]]) -> float:
    """Calculate average response time from traffic data"""
    if not data:
        return 0.0
        
    response_times = [entry.get('response_time', 0) for entry in data if 'response_time' in entry]
    return sum(response_times) / len(response_times) if response_times else 0.0

@bp.route("/generated", methods=['GET'])
def get_all_traffic():
    """Get all generated traffic"""
    try:
        logger.info("Getting all generated traffic")
        all_traffic = []
        
        for filename in os.listdir(TRAFFIC_DATA_DIR):
            if filename.endswith('.json') and not filename.endswith('_status.json'):
                with open(os.path.join(TRAFFIC_DATA_DIR, filename), 'r') as f:
                    traffic_data = json.load(f)
                    all_traffic.extend(traffic_data)
        
        logger.debug(f"Retrieved {len(all_traffic)} total traffic entries")
        return jsonify({
            "success": True,
            "data": all_traffic
        })
    except Exception as e:
        logger.error(f"Error getting all traffic: {str(e)}", exc_info=True)
        return jsonify({
            "success": False,
            "message": f"Error getting all traffic: {str(e)}"
        }), 500

@bp.route("/stats/<campaign_id>", methods=['GET'])
def get_campaign_stats(campaign_id: str):
    """Get statistics for a specific campaign"""
    try:
        logger.info(f"Getting stats for campaign {campaign_id}")
        traffic_file = os.path.join(TRAFFIC_DATA_DIR, f'{campaign_id}.json')
        
        if not os.path.exists(traffic_file):
            logger.warning(f"No traffic data found for campaign {campaign_id}")
            return jsonify({
                "success": False,
                "message": "No traffic data found for campaign"
            }), 404
            
        with open(traffic_file, 'r') as f:
            traffic_data = json.load(f)
            
        # Calculate statistics
        total_requests = len(traffic_data)
        successful_requests = sum(1 for entry in traffic_data if entry.get('success', False))
        success_rate = (successful_requests / total_requests * 100) if total_requests > 0 else 0
        
        # Get unique values
        unique_geo = set(entry.get('geo_location') for entry in traffic_data if entry.get('geo_location'))
        unique_devices = set(entry.get('device_model') for entry in traffic_data if entry.get('device_model'))
        unique_formats = set(entry.get('ad_format') for entry in traffic_data if entry.get('ad_format'))
        
        # Time-based statistics
        timestamps = [entry.get('timestamp') for entry in traffic_data if entry.get('timestamp')]
        if timestamps:
            start_time = min(timestamps)
            end_time = max(timestamps)
            duration_minutes = (datetime.fromisoformat(end_time) - datetime.fromisoformat(start_time)).total_seconds() / 60
            requests_per_minute = total_requests / duration_minutes if duration_minutes > 0 else 0
        else:
            start_time = None
            end_time = None
            duration_minutes = 0
            requests_per_minute = 0
            
        stats = {
            "total_requests": total_requests,
            "successful_requests": successful_requests,
            "success_rate": round(success_rate, 2),
            "unique_geo_locations": len(unique_geo),
            "unique_device_models": len(unique_devices),
            "unique_ad_formats": len(unique_formats),
            "start_time": start_time,
            "end_time": end_time,
            "duration_minutes": round(duration_minutes, 2),
            "requests_per_minute": round(requests_per_minute, 2)
        }
        
        logger.debug(f"Calculated stats for campaign {campaign_id}: {stats}")
        return jsonify({
            "success": True,
            "data": stats
        })
    except Exception as e:
        logger.error(f"Error getting campaign stats: {str(e)}", exc_info=True)
        return jsonify({
            "success": False,
            "message": f"Error getting campaign stats: {str(e)}"
        }), 500

def cleanup_campaign_resources(campaign_id: str):
    """Clean up all resources associated with a campaign"""
    try:
        logger.info(f"[Cleanup] Starting cleanup for campaign {campaign_id}")
        
        # Remove from active threads
        if campaign_id in active_threads:
            logger.info(f"[Cleanup] Removing campaign {campaign_id} from active threads")
            del active_threads[campaign_id]
        
        # Clean up thread lock
        if campaign_id in thread_locks:
            logger.info(f"[Cleanup] Removing thread lock for campaign {campaign_id}")
            del thread_locks[campaign_id]
        
        # Update campaign status to stopped
        logger.info(f"[Cleanup] Updating campaign status to stopped")
        update_campaign_status(campaign_id, "stopped", {
            "end_time": datetime.utcnow().isoformat(),
            "cleanup_time": datetime.utcnow().isoformat()
        })
        
        logger.info(f"[Cleanup] Successfully cleaned up resources for campaign {campaign_id}")
        return True
    except Exception as e:
        logger.error(f"[Cleanup] Error cleaning up campaign resources: {str(e)}", exc_info=True)
        return False

@bp.route("/cleanup/<campaign_id>", methods=['POST'])
def cleanup_campaign(campaign_id: str):
    """Clean up campaign resources"""
    try:
        logger.info(f"[API] Received cleanup request for campaign {campaign_id}")
        
        if cleanup_campaign_resources(campaign_id):
            logger.info(f"[API] Successfully cleaned up campaign {campaign_id}")
            return jsonify({
                "success": True,
                "message": "Campaign resources cleaned up successfully"
            })
        else:
            logger.error(f"[API] Failed to clean up campaign {campaign_id}")
            return jsonify({
                "success": False,
                "message": "Failed to clean up campaign resources"
            }), 500
            
    except Exception as e:
        logger.error(f"[API] Error cleaning up campaign: {str(e)}", exc_info=True)
        return jsonify({
            "success": False,
            "message": f"Error cleaning up campaign: {str(e)}"
        }), 500

@bp.route("/stop/<campaign_id>", methods=['POST'])
def stop_traffic(campaign_id: str):
    """Stop traffic generation for a campaign"""
    try:
        logger.info(f"[API] Received stop request for campaign {campaign_id}")
        
        if campaign_id not in active_threads:
            logger.warning(f"[API] No active traffic generation found for campaign {campaign_id}")
            return jsonify({
                "success": False,
                "message": "No active traffic generation found for this campaign"
            }), 404
        
        logger.info(f"[API] Stopping traffic generation for campaign {campaign_id}")
        if cleanup_campaign_resources(campaign_id):
            logger.info(f"[API] Successfully stopped traffic generation for campaign {campaign_id}")
            return jsonify({
                "success": True,
                "message": "Traffic generation stopped successfully"
            })
        else:
            logger.error(f"[API] Failed to stop traffic generation for campaign {campaign_id}")
            return jsonify({
                "success": False,
                "message": "Failed to stop traffic generation"
            }), 500
            
    except Exception as e:
        logger.error(f"[API] Error stopping traffic generation: {str(e)}", exc_info=True)
        return jsonify({
            "success": False,
            "message": f"Error stopping traffic generation: {str(e)}"
        }), 500

def update_campaign_status(campaign_id: str, status: str, additional_data: Dict[str, Any] = None):
    """Update campaign status and related data"""
    try:
        campaign_file = os.path.join(TRAFFIC_DATA_DIR, f'{campaign_id}.json')
        if os.path.exists(campaign_file):
            with open(campaign_file, 'r') as f:
                traffic_data = json.load(f)
            
            # Calculate statistics
            total_requests = len(traffic_data)
            successful_requests = sum(1 for entry in traffic_data if entry.get('success', True))
            
            # Prepare status update
            status_data = {
                "campaign_id": campaign_id,
                "status": status,
                "total_requests": total_requests,
                "successful_requests": successful_requests,
                "last_activity_time": datetime.utcnow().isoformat()
            }
            
            # Add any additional data
            if additional_data:
                status_data.update(additional_data)
            
            # Update status file
            status_file = os.path.join(TRAFFIC_DATA_DIR, f'{campaign_id}_status.json')
            with open(status_file, 'w') as f:
                json.dump(status_data, f)
            
            return status_data
    except Exception as e:
        logger.error(f"Error updating campaign status: {str(e)}")
        return None

@bp.route("/status/<campaign_id>", methods=['GET'])
def get_campaign_status(campaign_id: str):
    """Get the current status of a campaign"""
    try:
        logger.info(f"Getting status for campaign {campaign_id}")
        
        # Check if campaign is running
        is_running = campaign_id in active_threads
        
        # Get campaign file path
        campaign_file = os.path.join(TRAFFIC_DATA_DIR, campaign_id, 'traffic.json')
        
        # Get campaign data
        campaign_data = {
            "campaign_id": campaign_id,
            "is_running": is_running,
            "has_data": os.path.exists(campaign_file),
            "last_updated": datetime.utcnow().isoformat()
        }
        
        # Add file stats if exists
        if os.path.exists(campaign_file):
            try:
                with open(campaign_file, 'r') as f:
                    data = json.load(f)
                    campaign_data.update({
                        "total_requests": len(data),
                        "successful_requests": sum(1 for req in data if req.get('success', False)),
                        "last_request": data[-1] if data else None
                    })
            except Exception as e:
                logger.error(f"Error reading campaign file: {str(e)}", exc_info=True)
        
        logger.debug(f"Campaign status: {json.dumps(campaign_data, indent=2)}")
        return jsonify({
            "success": True,
            "data": campaign_data
        })

    except Exception as e:
        logger.error(f"Error getting campaign status: {str(e)}", exc_info=True)
        return jsonify({
            "success": False,
            "message": f"Error getting campaign status: {str(e)}"
        }), 500

@bp.route("/health", methods=['GET'])
def health_check():
    """Check the health of the traffic generation service"""
    try:
        logger.info("Health check requested")
        
        # Check if traffic data directory exists and is writable
        if not os.path.exists(TRAFFIC_DATA_DIR):
            logger.info(f"Creating traffic data directory: {TRAFFIC_DATA_DIR}")
            os.makedirs(TRAFFIC_DATA_DIR, exist_ok=True)
        
        # Test write permissions
        test_file = os.path.join(TRAFFIC_DATA_DIR, '.health_check')
        try:
            with open(test_file, 'w') as f:
                f.write('test')
            os.remove(test_file)
        except Exception as e:
            logger.error(f"Directory not writable: {str(e)}")
            return jsonify({
                "success": False,
                "status": "unhealthy",
                "error": f"Traffic data directory not writable: {str(e)}"
            }), 500

        logger.info("Health check passed")
        return jsonify({
            "success": True,
            "status": "healthy",
            "message": "Traffic generation service is healthy",
            "data": {
                "traffic_data_dir": TRAFFIC_DATA_DIR,
                "timestamp": datetime.utcnow().isoformat()
            }
        }), 200

    except Exception as e:
        logger.error(f"Health check failed: {str(e)}", exc_info=True)
        return jsonify({
            "success": False,
            "status": "unhealthy",
            "error": f"Health check failed: {str(e)}"
        }), 500 