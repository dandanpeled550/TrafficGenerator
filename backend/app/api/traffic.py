import os
import json
from flask import Blueprint, request, jsonify, send_file, abort
from typing import List, Optional, Dict, Any
import threading
import random
import time
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from .logging_config import get_logger
import uuid
from app.api.sessions import sessions  # Import sessions storage

# Configure logging
logger = get_logger('Traffic')

# Set up a known logs directory for campaign events
LOGS_DIR = os.environ.get('LOGS_DIR', '/tmp/logs')
os.makedirs(LOGS_DIR, exist_ok=True)
CAMPAIGN_EVENTS_LOG_PATH = os.path.join(LOGS_DIR, 'campaign_events.log')

# Set up a custom logger for campaign/session events
campaign_logger = get_logger('Campaign')

# Global variables
TRAFFIC_DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'data', 'traffic')
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB max file size

# Ensure traffic data directory exists and is writable
try:
    os.makedirs(TRAFFIC_DATA_DIR, exist_ok=True)
    # Test write permissions
    test_file = os.path.join(TRAFFIC_DATA_DIR, '.test')
    with open(test_file, 'w') as f:
        f.write('test')
    os.remove(test_file)
    logger.info(f"Traffic data directory {TRAFFIC_DATA_DIR} is writable")
except Exception as e:
    logger.error(f"Error setting up traffic data directory: {str(e)}")
    raise

# Add after other global variables
active_threads = {}
thread_locks = {}

def append_campaign_log(campaign_id, message):
    """Append a detailed log message to the campaign's log file."""
    campaign_dir = os.path.join(TRAFFIC_DATA_DIR, campaign_id)
    os.makedirs(campaign_dir, exist_ok=True)
    log_file = os.path.join(campaign_dir, 'logs.txt')
    with open(log_file, 'a') as f:
        f.write(message + '\n')

def append_traffic_to_file(campaign_id: str, traffic_data: Dict[str, Any]):
    """Append traffic data to campaign-specific file with improved error handling"""
    max_retries = 3
    retry_delay = 1  # seconds
    
    for attempt in range(max_retries):
        try:
            campaign_file = os.path.join(TRAFFIC_DATA_DIR, campaign_id, 'traffic.json')
            
            # Ensure campaign directory exists
            os.makedirs(os.path.dirname(campaign_file), exist_ok=True)
            
            # Get thread lock for this campaign
            lock = thread_locks.get(campaign_id)
            if not lock:
                lock = threading.Lock()
                thread_locks[campaign_id] = lock
            
            with lock:
                # Check if file exists and create if it doesn't
                if not os.path.exists(campaign_file):
                    with open(campaign_file, 'w') as f:
                        json.dump([], f)

                # Check file size and rotate if needed
                if os.path.exists(campaign_file) and os.path.getsize(campaign_file) > MAX_FILE_SIZE:
                    backup_file = f"{campaign_file}.{int(time.time())}.bak"
                    os.rename(campaign_file, backup_file)
                    with open(campaign_file, 'w') as f:
                        json.dump([], f)

                # Read and write with proper error handling
                with open(campaign_file, 'r+') as f:
                    try:
                        data = json.load(f)
                    except json.JSONDecodeError:
                        data = []
                    
                    data.append(traffic_data)
                    f.seek(0)
                    json.dump(data, f, indent=2)
                    f.truncate()
                
                return True
                
        except Exception as e:
            logger.error(f"[File Operation] Error appending traffic data (attempt {attempt + 1}/{max_retries}): {str(e)}", exc_info=True)
            if attempt < max_retries - 1:
                time.sleep(retry_delay)
            else:
                raise
    
    return False

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
        if self.user_profile_ids is None:
            self.user_profile_ids = []
        if self.profile_user_counts is None:
            self.profile_user_counts = {}
        if self.config is None:
            self.config = {}
        if self.rtb_config is None:
            self.rtb_config = {}

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
            "user_profile_ids": self.user_profile_ids,
            "profile_user_counts": self.profile_user_counts,
            "total_profile_users": self.total_profile_users,
            "log_file_path": self.log_file_path,
            "start_time": self.start_time.isoformat() if self.start_time else None,
            "end_time": self.end_time.isoformat() if self.end_time else None
        }

def generate_traffic_background(config: TrafficConfig):
    """Generate traffic in the background"""
    thread_id = str(uuid.uuid4())
    active_threads[config.campaign_id] = thread_id
    
    try:
        campaign_logger.info(f"[Session {config.campaign_id}] Traffic generation started.")
        append_campaign_log(config.campaign_id, f"START: Traffic generation started for campaign {config.campaign_id} at {datetime.utcnow().isoformat()}")
        logger.info(f"[Traffic Generation] Thread ID: {thread_id}")
        logger.info(f"[Traffic Generation] Config: {json.dumps(config.to_dict(), indent=2)}")
        
        # Create campaign-specific directory and file with proper error handling
        campaign_dir = os.path.join(TRAFFIC_DATA_DIR, config.campaign_id)
        campaign_file = os.path.join(campaign_dir, 'traffic.json')
        
        try:
            os.makedirs(campaign_dir, exist_ok=True)
            if not os.path.exists(campaign_file):
                with open(campaign_file, 'w') as f:
                    json.dump([], f)
            logger.info(f"[Traffic Generation] Campaign directory and file setup completed: {campaign_file}")
        except Exception as e:
            logger.error(f"[Traffic Generation] Error setting up campaign directory: {str(e)}", exc_info=True)
            update_campaign_status(config.campaign_id, "error", {"error": f"Directory setup failed: {str(e)}"})
            return

        # Calculate total requests with validation
        total_requests = config.requests_per_minute * (config.duration_minutes or 60)
        if total_requests <= 0:
            logger.error(f"[Traffic Generation] Invalid request count: {total_requests}")
            update_campaign_status(config.campaign_id, "error", {"error": f"Invalid request count: {total_requests}"})
            return

        logger.info(f"[Traffic Generation] Total requests to generate: {total_requests}")

        # Initialize counters and timestamps
        request_count = 0
        successful_requests = 0
        start_time = datetime.utcnow()
        config.start_time = start_time
        end_time = start_time + timedelta(minutes=config.duration_minutes) if config.duration_minutes else None
        config.end_time = end_time

        logger.info(f"[Traffic Generation] Start time: {start_time}, End time: {end_time}")

        # Update campaign status to running
        update_campaign_status(config.campaign_id, "running", {
            "start_time": start_time.isoformat(),
            "total_requests": total_requests,
            "thread_id": thread_id,
            "traffic_generation_active": True
        })

        # Main traffic generation loop with improved error handling
        while True:
            try:
                # Check if thread was stopped
                if active_threads.get(config.campaign_id) != thread_id:
                    logger.info(f"[Traffic Generation] Traffic generation stopped for campaign {config.campaign_id} (thread ID mismatch)")
                    break

                # Check if we should stop
                if end_time and datetime.utcnow() >= end_time:
                    logger.info(f"[Traffic Generation] Reached duration limit for campaign {config.campaign_id}")
                    break

                # Generate and validate traffic data
                try:
                    traffic_data = generate_traffic_data(config)
                    if not traffic_data:
                        logger.error("[Traffic Generation] Failed to generate traffic data")
                        continue
                    logger.debug(f"[Traffic Generation] Generated traffic data for request {request_count + 1}")
                except Exception as e:
                    logger.error(f"[Traffic Generation] Error generating traffic data: {str(e)}", exc_info=True)
                    continue

                # Simulate request with timeout
                try:
                    response_data = simulate_request(traffic_data)
                    if not response_data:
                        logger.error("[Traffic Generation] Failed to simulate request")
                        continue
                    logger.debug(f"[Traffic Generation] Simulated request {request_count + 1}: success={response_data.get('success')}")
                except Exception as e:
                    logger.error(f"[Traffic Generation] Error simulating request: {str(e)}", exc_info=True)
                    continue

                # Save to file with proper locking
                try:
                    if append_traffic_to_file(config.campaign_id, response_data):
                        request_count += 1
                        if response_data.get('success'):
                            successful_requests += 1
                        campaign_logger.info(f"[Session {config.campaign_id}] Request {request_count} {'SUCCESS' if response_data.get('success') else 'FAIL'}.")
                        append_campaign_log(config.campaign_id, f"REQUEST {request_count}: {response_data}")
                    else:
                        campaign_logger.error(f"[Session {config.campaign_id}] Failed to save request {request_count + 1}.")
                        append_campaign_log(config.campaign_id, f"ERROR: Failed to save request {request_count + 1}")
                except Exception as e:
                    campaign_logger.error(f"[Session {config.campaign_id}] Error saving request: {str(e)}")
                    append_campaign_log(config.campaign_id, f"ERROR: Exception saving request: {str(e)}")
                    continue

                # Update progress with validation
                progress = (request_count / total_requests) * 100 if total_requests > 0 else 0
                update_campaign_status(config.campaign_id, "running", {
                    "progress_percentage": progress,
                    "total_requests": request_count,
                    "successful_requests": successful_requests,
                    "last_updated": datetime.utcnow().isoformat(),
                    "traffic_generation_active": True
                })

                # Calculate sleep time with validation
                sleep_time = max(0.1, 60 / config.requests_per_minute)
                if config.config.get('randomize_timing', True):
                    sleep_time *= random.uniform(0.8, 1.2)
                
                logger.debug(f"[Traffic Generation] Sleeping for {sleep_time:.3f} seconds before next request")
                time.sleep(sleep_time)

            except Exception as e:
                campaign_logger.error(f"[Session {config.campaign_id}] Error in traffic generation loop: {str(e)}")
                append_campaign_log(config.campaign_id, f"ERROR: Exception in traffic generation loop: {str(e)}")
                update_campaign_status(config.campaign_id, "error", {
                    "error": str(e),
                    "last_request_count": request_count,
                    "successful_requests": successful_requests,
                    "last_updated": datetime.utcnow().isoformat()
                })
                time.sleep(1)  # Prevent tight loop on error

        # Update final status with validation
        final_status = "completed" if request_count > 0 else "error"
        campaign_logger.info(f"[Session {config.campaign_id}] Traffic generation completed. Status: {final_status}. Total: {request_count}, Success: {successful_requests}")
        append_campaign_log(config.campaign_id, f"COMPLETE: Traffic generation completed for campaign {config.campaign_id} at {datetime.utcnow().isoformat()} with status {final_status}. Total: {request_count}, Success: {successful_requests}")
        
        update_campaign_status(config.campaign_id, final_status, {
            "end_time": datetime.utcnow().isoformat(),
            "total_requests": request_count,
            "successful_requests": successful_requests,
            "last_updated": datetime.utcnow().isoformat(),
            "traffic_generation_active": False
        })

    except Exception as e:
        campaign_logger.error(f"[Session {config.campaign_id}] Error in background traffic generation: {str(e)}")
        append_campaign_log(config.campaign_id, f"ERROR: Exception in background traffic generation: {str(e)}")
        update_campaign_status(config.campaign_id, "error", {
            "error": str(e),
            "last_updated": datetime.utcnow().isoformat(),
            "traffic_generation_active": False
        })
    finally:
        # Clean up resources with proper error handling
        try:
            if active_threads.get(config.campaign_id) == thread_id:
                del active_threads[config.campaign_id]
                campaign_logger.info(f"[Session {config.campaign_id}] Removed from active threads.")
                append_campaign_log(config.campaign_id, f"CLEANUP: Removed from active threads at {datetime.utcnow().isoformat()}")
            if config.campaign_id in thread_locks:
                del thread_locks[config.campaign_id]
                campaign_logger.info(f"[Session {config.campaign_id}] Removed thread lock.")
                append_campaign_log(config.campaign_id, f"CLEANUP: Removed thread lock at {datetime.utcnow().isoformat()}")
        except Exception as e:
            campaign_logger.error(f"[Session {config.campaign_id}] Error cleaning up resources: {str(e)}")
            append_campaign_log(config.campaign_id, f"ERROR: Exception cleaning up resources: {str(e)}")

@bp.route("/generate", methods=['POST'])
def generate_traffic():
    try:
        data = request.get_json()
        if not data:
            logger.error("[API] No data provided in request")
            return jsonify({"error": "No data provided"}), 400

        # Log the received data
        logger.info(f"[API] Received traffic generation request: {json.dumps(data, indent=2)}")

        # Validate required fields
        if 'campaign_id' not in data:
            error_msg = "Missing required field: campaign_id"
            logger.error(f"[API] {error_msg}")
            return jsonify({"error": error_msg}), 400

        campaign_id = data['campaign_id']
        logger.info(f"[API] Processing campaign ID: {campaign_id}")

        # Check if traffic generation is already running
        if campaign_id in active_threads:
            error_msg = "Traffic generation is already running for this campaign"
            logger.warning(f"[API] {error_msg}")
            return jsonify({
                "error": error_msg,
                "status": "running",
                "campaign_id": campaign_id
            }), 409

        try:
            # Get campaign from sessions storage
            if campaign_id not in sessions:
                error_msg = f"Campaign {campaign_id} not found"
                logger.error(f"[API] {error_msg}")
                return jsonify({"error": error_msg}), 404

            campaign_data = sessions[campaign_id].to_dict()
            logger.info(f"[API] Retrieved campaign data: {json.dumps(campaign_data, indent=2)}")

            # Check campaign status - campaigns must be in 'running' status to start traffic generation
            campaign_status = campaign_data.get('status', 'draft')
            if campaign_status != 'running':
                error_msg = f"Campaign must be in 'running' status to start traffic generation. Current status: {campaign_status}"
                logger.error(f"[API] {error_msg}")
                return jsonify({
                    "error": error_msg,
                    "current_status": campaign_status,
                    "required_status": "running",
                    "campaign_id": campaign_id
                }), 400

            # Validate campaign data
            if not campaign_data.get('target_url'):
                error_msg = "Campaign target URL is required"
                logger.error(f"[API] {error_msg}")
                return jsonify({"error": error_msg}), 400

            if not campaign_data.get('user_profile_ids'):
                error_msg = "At least one user profile is required"
                logger.error(f"[API] {error_msg}")
                return jsonify({"error": error_msg}), 400

            profile_user_counts = campaign_data.get('profile_user_counts', {})
            if not profile_user_counts:
                error_msg = "User counts must be specified for each profile"
                logger.error(f"[API] {error_msg}")
                return jsonify({"error": error_msg}), 400

            total_users = sum(profile_user_counts.values())
            if total_users == 0:
                error_msg = "Total number of users must be greater than 0"
                logger.error(f"[API] {error_msg}")
                return jsonify({"error": error_msg}), 400

            # Validate requests_per_minute
            requests_per_minute = campaign_data.get('requests_per_minute', 10)
            if requests_per_minute <= 0:
                error_msg = "Requests per minute must be greater than 0"
                logger.error(f"[API] {error_msg}")
                return jsonify({"error": error_msg}), 400

            # Validate duration_minutes
            duration_minutes = campaign_data.get('duration_minutes')
            if duration_minutes is not None and duration_minutes <= 0:
                error_msg = "Duration minutes must be greater than 0"
                logger.error(f"[API] {error_msg}")
                return jsonify({"error": error_msg}), 400

            # Create traffic config from campaign data
            config_data = {
                'campaign_id': campaign_id,
                'target_url': campaign_data['target_url'],
                'requests_per_minute': requests_per_minute,
                'duration_minutes': duration_minutes,
                'user_profile_ids': campaign_data['user_profile_ids'],
                'profile_user_counts': profile_user_counts,
                'total_profile_users': total_users,
                'geo_locations': campaign_data.get('geo_locations', ["United States"]),
                'rtb_config': campaign_data.get('rtb_config', {}),
                'config': campaign_data.get('config', {}),
                'log_file_path': campaign_data.get('log_file_path')
            }

            # Create traffic config
            config = TrafficConfig(**config_data)
            logger.info(f"[API] Created traffic config: {json.dumps(config.to_dict(), indent=2)}")

            # Create thread lock for this campaign
            logger.info(f"[API] Creating thread lock for campaign {campaign_id}")
            thread_locks[campaign_id] = threading.Lock()
            
            # Start traffic generation in background
            logger.info(f"[API] Starting background thread for campaign {campaign_id}")
            thread = threading.Thread(
                target=generate_traffic_background,
                args=(config,),
                daemon=True,
                name=f"traffic_generator_{campaign_id}"
            )
            thread.start()
            logger.info(f"[API] Background thread started for campaign {campaign_id}")

            # Store thread reference and ID
            thread_id = str(uuid.uuid4())
            active_threads[campaign_id] = thread_id
            logger.info(f"[API] Stored thread ID {thread_id} for campaign {campaign_id}")

            # Update campaign status to indicate traffic generation is active
            logger.info(f"[API] Updating campaign status to indicate traffic generation is active")
            update_campaign_status(campaign_id, "running", {
                "traffic_generation_started": True,
                "thread_id": thread_id,
                "start_time": datetime.utcnow().isoformat()
            })

            logger.info(f"[API] Successfully started traffic generation for campaign {campaign_id}")
            return jsonify({
                "success": True,
                "message": "Traffic generation started successfully",
                "campaign_id": campaign_id,
                "status": "running",
                "thread_id": thread_id,
                "config": {
                    "requests_per_minute": requests_per_minute,
                    "duration_minutes": duration_minutes,
                    "total_users": total_users,
                    "profiles": len(campaign_data['user_profile_ids'])
                }
            })
        except Exception as e:
            error_msg = f"Error starting traffic generation thread: {str(e)}"
            logger.error(f"[API] {error_msg}", exc_info=True)
            # Clean up resources if thread creation fails
            if campaign_id in active_threads:
                del active_threads[campaign_id]
            if campaign_id in thread_locks:
                del thread_locks[campaign_id]
            return jsonify({
                "error": error_msg,
                "campaign_id": campaign_id
            }), 500

    except Exception as e:
        error_msg = f"Unexpected error in traffic generation: {str(e)}"
        logger.error(f"[API] {error_msg}", exc_info=True)
        return jsonify({"error": error_msg}), 500

def generate_traffic_data(config: TrafficConfig) -> Dict[str, Any]:
    """Generate a single traffic data entry with improved validation"""
    try:
        # Validate config
        if not isinstance(config, TrafficConfig):
            raise ValueError("Invalid config type")
        
        # Generate base traffic data with validation
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
        
        # Validate required fields
        required_fields = ["id", "timestamp", "campaign_id", "target_url"]
        for field in required_fields:
            if not traffic_data.get(field):
                raise ValueError(f"Missing required field: {field}")
        
        # Add RTB data with validation
        if config.rtb_config:
            rtb_data = generate_rtb_data(config.rtb_config)
            if rtb_data:
                traffic_data["rtb_data"] = rtb_data
        
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
    
    try:
        # Validate RTB configuration
        if not isinstance(rtb_config, dict):
            logger.warning("Invalid RTB config type, using defaults")
            rtb_config = {}
        
        # Get values from config with defaults
        device_models = rtb_config.get("device_models", default_device_models)
        ad_formats = rtb_config.get("ad_formats", default_ad_formats)
        app_categories = rtb_config.get("app_categories", default_app_categories)
        
        # Ensure lists are not empty and contain valid values
        if not isinstance(device_models, list) or not device_models:
            logger.warning("Invalid device_models list, using defaults")
            device_models = default_device_models
        if not isinstance(ad_formats, list) or not ad_formats:
            logger.warning("Invalid ad_formats list, using defaults")
            ad_formats = default_ad_formats
        if not isinstance(app_categories, list) or not app_categories:
            logger.warning("Invalid app_categories list, using defaults")
            app_categories = default_app_categories
            
        # Validate device brand
        device_brand = rtb_config.get("device_brand", "samsung")
        if not isinstance(device_brand, str):
            logger.warning("Invalid device_brand, using default")
            device_brand = "samsung"
            
        # Generate RTB data
        rtb_data = {
            "device_brand": device_brand,
            "device_model": random.choice(device_models),
            "ad_format": random.choice(ad_formats),
            "app_category": random.choice(app_categories),
            "adid": generate_adid() if rtb_config.get("generate_adid", True) else None
        }
        
        logger.debug(f"Generated RTB data: {json.dumps(rtb_data, indent=2)}")
        return rtb_data
        
    except Exception as e:
        logger.error(f"Error generating RTB data: {str(e)}", exc_info=True)
        # Return default RTB data in case of error
        return {
            "device_brand": "samsung",
            "device_model": random.choice(default_device_models),
            "ad_format": random.choice(default_ad_formats),
            "app_category": random.choice(default_app_categories),
            "adid": generate_adid()
        }

def generate_adid() -> str:
    """Generate a random advertising ID"""
    return f"{random.randint(10000000, 99999999)}-{random.randint(1000, 9999)}-{random.randint(1000, 9999)}-{random.randint(1000, 9999)}"

def simulate_request(traffic_data: Dict[str, Any]) -> Dict[str, Any]:
    """Simulate making a request with the generated traffic data"""
    try:
        logger.debug(f"Simulating request for traffic data: {traffic_data}")
        
        # Validate traffic data
        if not isinstance(traffic_data, dict):
            raise ValueError("Invalid traffic data format")
            
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
            "currency": "USD" if success and traffic_data.get('rtb_data') else None,
            "timestamp": datetime.utcnow().isoformat()
        }
        logger.debug(f"Generated response data: {response_data}")
        
        # Merge response data with traffic data
        traffic_data.update(response_data)
        logger.debug(f"Final traffic data with response: {traffic_data}")
        
        return traffic_data
    except Exception as e:
        logger.error(f"Error simulating request: {str(e)}", exc_info=True)
        # Return error response
        error_response = {
            "success": False,
            "error": str(e),
            "status_code": 500,
            "timestamp": datetime.utcnow().isoformat()
        }
        if isinstance(traffic_data, dict):
            traffic_data.update(error_response)
        else:
            traffic_data = error_response
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
        logger.info(f"[Status Update] Updating status for campaign {campaign_id} to {status}")
        
        # Validate inputs
        if not isinstance(campaign_id, str):
            raise ValueError("Invalid campaign_id")
        if not isinstance(status, str):
            raise ValueError("Invalid status")
        if additional_data is not None and not isinstance(additional_data, dict):
            raise ValueError("Invalid additional_data")
            
        # Validate status value
        valid_statuses = ["draft", "running", "completed", "error", "stopped"]
        if status not in valid_statuses:
            logger.warning(f"Invalid status {status}, using 'error'")
            status = "error"
            
        campaign_file = os.path.join(TRAFFIC_DATA_DIR, campaign_id, 'traffic.json')
        status_file = os.path.join(TRAFFIC_DATA_DIR, campaign_id, 'status.json')
        
        # Ensure campaign directory exists
        os.makedirs(os.path.dirname(campaign_file), exist_ok=True)
        
        # Get thread lock for this campaign
        lock = thread_locks.get(campaign_id)
        if not lock:
            lock = threading.Lock()
            thread_locks[campaign_id] = lock
            
        with lock:
            # Calculate statistics if file exists
            total_requests = 0
            successful_requests = 0
            if os.path.exists(campaign_file):
                try:
                    with open(campaign_file, 'r') as f:
                        traffic_data = json.load(f)
                        total_requests = len(traffic_data)
                        successful_requests = sum(1 for entry in traffic_data if entry.get('success', False))
                except Exception as e:
                    logger.error(f"Error reading campaign file: {str(e)}", exc_info=True)
            
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
            try:
                with open(status_file, 'w') as f:
                    json.dump(status_data, f, indent=2)
                logger.info(f"[Status Update] Successfully updated status for campaign {campaign_id}")
            except Exception as e:
                logger.error(f"Error writing status file: {str(e)}", exc_info=True)
                raise
            
            return status_data
            
    except Exception as e:
        logger.error(f"Error updating campaign status: {str(e)}", exc_info=True)
        # Try to save error status
        try:
            error_status = {
                "campaign_id": campaign_id,
                "status": "error",
                "error": str(e),
                "last_activity_time": datetime.utcnow().isoformat()
            }
            with open(status_file, 'w') as f:
                json.dump(error_status, f, indent=2)
        except:
            pass
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

        # Get system information
        active_campaigns = list(active_threads.keys())
        campaign_stats = {}
        
        for campaign_id in active_campaigns:
            campaign_file = os.path.join(TRAFFIC_DATA_DIR, campaign_id, 'traffic.json')
            if os.path.exists(campaign_file):
                try:
                    with open(campaign_file, 'r') as f:
                        data = json.load(f)
                        campaign_stats[campaign_id] = {
                            "total_requests": len(data),
                            "successful_requests": sum(1 for entry in data if entry.get('success', False)),
                            "last_updated": datetime.utcnow().isoformat()
                        }
                except Exception as e:
                    logger.error(f"Error reading campaign file {campaign_id}: {str(e)}")
                    campaign_stats[campaign_id] = {
                        "error": str(e),
                        "last_updated": datetime.utcnow().isoformat()
                    }

        logger.info("Health check passed")
        return jsonify({
            "success": True,
            "status": "healthy",
            "message": "Traffic generation service is healthy",
            "data": {
                "traffic_data_dir": TRAFFIC_DATA_DIR,
                "timestamp": datetime.utcnow().isoformat(),
                "active_campaigns": active_campaigns,
                "campaign_stats": campaign_stats,
                "total_active_campaigns": len(active_campaigns),
                "system_info": {
                    "python_version": os.sys.version,
                    "platform": os.sys.platform,
                    "max_file_size": MAX_FILE_SIZE
                }
            }
        }), 200

    except Exception as e:
        logger.error(f"Health check failed: {str(e)}", exc_info=True)
        return jsonify({
            "success": False,
            "status": "unhealthy",
            "error": f"Health check failed: {str(e)}"
        }), 500

@bp.route("/test", methods=['POST'])
def test_traffic_functions():
    """Test endpoint for traffic generation functions"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                "success": False,
                "error": "No test data provided"
            }), 400

        test_type = data.get('test_type')
        if not test_type:
            return jsonify({
                "success": False,
                "error": "No test type specified"
            }), 400

        logger.info(f"[Test] Running test type: {test_type}")

        if test_type == "generate_traffic_data":
            # Test traffic data generation
            test_config = TrafficConfig(
                campaign_id="test_campaign",
                target_url="https://example.com",
                requests_per_minute=10,
                duration_minutes=1,
                user_profile_ids=["profile1"],
                profile_user_counts={"profile1": 100},
                total_profile_users=100,
                geo_locations=["United States"],
                rtb_config={
                    "device_brand": "samsung",
                    "device_models": ["Galaxy S24"],
                    "ad_formats": ["banner"],
                    "app_categories": ["IAB9"]
                },
                config={
                    "randomize_timing": True,
                    "enable_logging": True
                }
            )

            # Generate traffic data
            logger.info("[Test] Generating test traffic data")
            traffic_data = generate_traffic_data(test_config)
            
            # Verify the generated data
            verification_results = {
                "required_fields": {
                    "id": bool(traffic_data.get("id")),
                    "timestamp": bool(traffic_data.get("timestamp")),
                    "campaign_id": traffic_data.get("campaign_id") == "test_campaign",
                    "target_url": traffic_data.get("target_url") == "https://example.com",
                    "requests_per_minute": traffic_data.get("requests_per_minute") == 10,
                    "duration_minutes": traffic_data.get("duration_minutes") == 1,
                    "geo_locations": traffic_data.get("geo_locations") == ["United States"],
                    "rtb_config": bool(traffic_data.get("rtb_config")),
                    "config": bool(traffic_data.get("config")),
                    "user_profile_ids": traffic_data.get("user_profile_ids") == ["profile1"],
                    "profile_user_counts": traffic_data.get("profile_user_counts") == {"profile1": 100},
                    "total_profile_users": traffic_data.get("total_profile_users") == 100
                },
                "rtb_data": {
                    "device_brand": traffic_data.get("rtb_data", {}).get("device_brand") == "samsung",
                    "device_model": traffic_data.get("rtb_data", {}).get("device_model") in ["Galaxy S24"],
                    "ad_format": traffic_data.get("rtb_data", {}).get("ad_format") in ["banner"],
                    "app_category": traffic_data.get("rtb_data", {}).get("app_category") in ["IAB9"]
                } if "rtb_data" in traffic_data else None
            }

            # Check if all required fields are present and correct
            all_fields_valid = all(verification_results["required_fields"].values())
            rtb_data_valid = all(verification_results["rtb_data"].values()) if verification_results["rtb_data"] else True

            return jsonify({
                "success": True,
                "test_type": test_type,
                "data": traffic_data,
                "verification": verification_results,
                "all_fields_valid": all_fields_valid,
                "rtb_data_valid": rtb_data_valid,
                "timestamp": datetime.utcnow().isoformat()
            })

        elif test_type == "simulate_request":
            # Test simulate_request function
            logger.info("[Test] Testing simulate_request function")
            
            # Get test data from request or use default
            test_traffic_data = data.get('traffic_data', {
                "id": str(int(time.time() * 1000)),
                "timestamp": datetime.utcnow().isoformat(),
                "campaign_id": "test_simulate_campaign",
                "target_url": "https://example.com",
                "requests_per_minute": 10,
                "duration_minutes": 1,
                "geo_locations": ["United States"],
                "rtb_config": {
                    "device_brand": "samsung",
                    "device_models": ["Galaxy S24"],
                    "ad_formats": ["banner"],
                    "app_categories": ["IAB9"]
                },
                "config": {
                    "randomize_timing": True,
                    "enable_logging": True
                },
                "user_profile_ids": ["profile1"],
                "profile_user_counts": {"profile1": 100},
                "total_profile_users": 100,
                "rtb_data": {
                    "device_brand": "samsung",
                    "device_model": "Galaxy S24",
                    "ad_format": "banner",
                    "app_category": "IAB9",
                    "adid": generate_adid()
                }
            })
            
            # Test multiple simulations
            num_simulations = data.get('num_simulations', 5)
            simulation_results = []
            success_count = 0
            total_response_time = 0
            
            logger.info(f"[Test] Running {num_simulations} simulations")
            
            for i in range(num_simulations):
                try:
                    start_time = time.time()
                    response_data = simulate_request(test_traffic_data.copy())
                    end_time = time.time()
                    
                    simulation_time = end_time - start_time
                    total_response_time += simulation_time
                    
                    if response_data.get('success'):
                        success_count += 1
                    
                    simulation_results.append({
                        "simulation_number": i + 1,
                        "success": response_data.get('success', False),
                        "status_code": response_data.get('status_code'),
                        "response_time": response_data.get('response_time'),
                        "response_size": response_data.get('response_size'),
                        "bid_id": response_data.get('bid_id'),
                        "win_price": response_data.get('win_price'),
                        "currency": response_data.get('currency'),
                        "simulation_duration": round(simulation_time, 3),
                        "timestamp": response_data.get('timestamp')
                    })
                    
                    logger.debug(f"[Test] Simulation {i + 1} completed: {response_data.get('success')}")
                    
                except Exception as e:
                    logger.error(f"[Test] Error in simulation {i + 1}: {str(e)}")
                    simulation_results.append({
                        "simulation_number": i + 1,
                        "error": str(e),
                        "success": False
                    })
            
            # Calculate statistics
            success_rate = (success_count / num_simulations) * 100 if num_simulations > 0 else 0
            avg_simulation_time = total_response_time / num_simulations if num_simulations > 0 else 0
            
            # Verify response data structure
            verification_results = {
                "response_fields": {
                    "success": all("success" in result for result in simulation_results if "error" not in result),
                    "status_code": all("status_code" in result for result in simulation_results if "error" not in result),
                    "response_time": all("response_time" in result for result in simulation_results if "error" not in result),
                    "response_size": all("response_size" in result for result in simulation_results if "error" not in result),
                    "timestamp": all("timestamp" in result for result in simulation_results if "error" not in result)
                },
                "rtb_fields": {
                    "bid_id": all("bid_id" in result for result in simulation_results if "error" not in result and result.get("success")),
                    "win_price": all("win_price" in result for result in simulation_results if "error" not in result and result.get("success")),
                    "currency": all("currency" in result for result in simulation_results if "error" not in result and result.get("success"))
                }
            }
            
            # Check if all required fields are present
            all_fields_valid = all(verification_results["response_fields"].values())
            rtb_fields_valid = all(verification_results["rtb_fields"].values())
            
            return jsonify({
                "success": True,
                "test_type": test_type,
                "input_data": test_traffic_data,
                "simulation_results": simulation_results,
                "statistics": {
                    "total_simulations": num_simulations,
                    "successful_simulations": success_count,
                    "success_rate": round(success_rate, 2),
                    "average_simulation_time": round(avg_simulation_time, 3),
                    "total_simulation_time": round(total_response_time, 3)
                },
                "verification": verification_results,
                "all_fields_valid": all_fields_valid,
                "rtb_fields_valid": rtb_fields_valid,
                "timestamp": datetime.utcnow().isoformat()
            })

        elif test_type == "full_traffic_simulation":
            # Test complete traffic generation and simulation flow
            logger.info("[Test] Testing full traffic simulation flow")
            
            # Get configuration from request or use defaults
            config_data = data.get('config', {
                'campaign_id': 'full_simulation_test',
                'target_url': 'https://example.com',
                'requests_per_minute': 10,
                'duration_minutes': 1,
                'user_profile_ids': ['profile1', 'profile2'],
                'profile_user_counts': {'profile1': 50, 'profile2': 30},
                'total_profile_users': 80,
                'geo_locations': ['United States', 'Canada'],
                'rtb_config': {
                    'device_brand': 'mixed',
                    'device_models': ['Galaxy S24', 'iPhone 15', 'Pixel 8'],
                    'ad_formats': ['banner', 'interstitial', 'native'],
                    'app_categories': ['IAB9', 'IAB1', 'IAB2'],
                    'generate_adid': True
                },
                'config': {
                    'randomize_timing': True,
                    'enable_logging': True
                }
            })
            
            # Create traffic config
            test_config = TrafficConfig(**config_data)
            logger.info(f"[Test] Created traffic config: {test_config.campaign_id}")
            
            # Generate multiple traffic data entries
            num_requests = data.get('num_requests', 5)
            traffic_entries = []
            simulation_results = []
            total_generation_time = 0
            total_simulation_time = 0
            successful_requests = 0
            
            logger.info(f"[Test] Generating {num_requests} traffic entries and simulating requests")
            
            for i in range(num_requests):
                try:
                    # Step 1: Generate traffic data
                    gen_start_time = time.time()
                    traffic_data = generate_traffic_data(test_config)
                    gen_end_time = time.time()
                    generation_time = gen_end_time - gen_start_time
                    total_generation_time += generation_time
                    
                    # Step 2: Simulate request
                    sim_start_time = time.time()
                    response_data = simulate_request(traffic_data)
                    sim_end_time = time.time()
                    simulation_time = sim_end_time - sim_start_time
                    total_simulation_time += simulation_time
                    
                    if response_data.get('success'):
                        successful_requests += 1
                    
                    # Store traffic entry
                    traffic_entries.append({
                        "request_number": i + 1,
                        "traffic_data": traffic_data,
                        "generation_time": round(generation_time, 3)
                    })
                    
                    # Store simulation result
                    simulation_results.append({
                        "request_number": i + 1,
                        "success": response_data.get('success', False),
                        "status_code": response_data.get('status_code'),
                        "response_time": response_data.get('response_time'),
                        "response_size": response_data.get('response_size'),
                        "bid_id": response_data.get('bid_id'),
                        "win_price": response_data.get('win_price'),
                        "currency": response_data.get('currency'),
                        "simulation_time": round(simulation_time, 3),
                        "total_time": round(generation_time + simulation_time, 3),
                        "timestamp": response_data.get('timestamp'),
                        "user_profile": traffic_data.get('user_profile_ids', []),
                        "geo_location": traffic_data.get('geo_locations', []),
                        "device_info": response_data.get('rtb_data', {})
                    })
                    
                    logger.debug(f"[Test] Request {i + 1} completed: {response_data.get('success')}")
                    
                except Exception as e:
                    logger.error(f"[Test] Error in request {i + 1}: {str(e)}")
                    simulation_results.append({
                        "request_number": i + 1,
                        "error": str(e),
                        "success": False
                    })
            
            # Calculate comprehensive statistics
            success_rate = (successful_requests / num_requests) * 100 if num_requests > 0 else 0
            avg_generation_time = total_generation_time / num_requests if num_requests > 0 else 0
            avg_simulation_time = total_simulation_time / num_requests if num_requests > 0 else 0
            avg_total_time = (total_generation_time + total_simulation_time) / num_requests if num_requests > 0 else 0
            
            # Analyze traffic patterns
            response_times = [r.get('response_time', 0) for r in simulation_results if r.get('success')]
            win_prices = [r.get('win_price', 0) for r in simulation_results if r.get('success') and r.get('win_price')]
            
            # Fix the set operations for lists
            geo_locations = []
            user_profiles = []
            for r in simulation_results:
                if r.get('geo_location'):
                    geo_locations.extend(r.get('geo_location', []))
                if r.get('user_profile'):
                    user_profiles.extend(r.get('user_profile', []))
            
            traffic_analysis = {
                "total_requests": num_requests,
                "successful_requests": successful_requests,
                "success_rate": round(success_rate, 2),
                "average_response_time": round(sum(response_times) / len(response_times), 2) if response_times else 0,
                "min_response_time": min(response_times) if response_times else 0,
                "max_response_time": max(response_times) if response_times else 0,
                "average_win_price": round(sum(win_prices) / len(win_prices), 2) if win_prices else 0,
                "min_win_price": min(win_prices) if win_prices else 0,
                "max_win_price": max(win_prices) if win_prices else 0,
                "unique_geo_locations": len(set(geo_locations)),
                "unique_user_profiles": len(set(user_profiles))
            }
            
            # Performance metrics
            performance_metrics = {
                "total_generation_time": round(total_generation_time, 3),
                "total_simulation_time": round(total_simulation_time, 3),
                "total_processing_time": round(total_generation_time + total_simulation_time, 3),
                "average_generation_time": round(avg_generation_time, 3),
                "average_simulation_time": round(avg_simulation_time, 3),
                "average_total_time": round(avg_total_time, 3),
                "requests_per_second": round(num_requests / (total_generation_time + total_simulation_time), 2) if (total_generation_time + total_simulation_time) > 0 else 0
            }
            
            return jsonify({
                "success": True,
                "test_type": test_type,
                "config": test_config.to_dict(),
                "traffic_entries": traffic_entries,
                "simulation_results": simulation_results,
                "traffic_analysis": traffic_analysis,
                "performance_metrics": performance_metrics,
                "summary": {
                    "campaign_id": test_config.campaign_id,
                    "total_requests_processed": num_requests,
                    "success_rate_percentage": round(success_rate, 2),
                    "total_processing_time_seconds": round(total_generation_time + total_simulation_time, 3),
                    "requests_per_second": round(num_requests / (total_generation_time + total_simulation_time), 2) if (total_generation_time + total_simulation_time) > 0 else 0
                },
                "timestamp": datetime.utcnow().isoformat()
            })

        else:
            return jsonify({
                "success": False,
                "error": f"Unknown test type: {test_type}"
            }), 400

    except Exception as e:
        logger.error(f"[Test] Error in test endpoint: {str(e)}", exc_info=True)
        return jsonify({
            "success": False,
            "error": f"Error in test endpoint: {str(e)}"
        }), 500

@bp.route("/campaigns/<campaign_id>/status", methods=['PUT'])
def update_campaign_status_endpoint(campaign_id: str):
    """Update campaign status and manage transitions"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400

        new_status = data.get('status')
        if not new_status:
            return jsonify({"error": "Status is required"}), 400

        # Validate status
        valid_statuses = ["draft", "running", "paused", "completed", "stopped", "error"]
        if new_status not in valid_statuses:
            return jsonify({
                "error": f"Invalid status. Must be one of: {valid_statuses}",
                "provided_status": new_status
            }), 400

        # Check if campaign exists
        if campaign_id not in sessions:
            return jsonify({"error": f"Campaign {campaign_id} not found"}), 404

        campaign_data = sessions[campaign_id].to_dict()
        current_status = campaign_data.get('status', 'draft')

        logger.info(f"[API] Updating campaign {campaign_id} status from {current_status} to {new_status}")

        # Handle status transitions
        if new_status == 'running':
            # If starting traffic generation, check if it's already running
            if campaign_id in active_threads:
                return jsonify({
                    "error": "Traffic generation is already running for this campaign",
                    "campaign_id": campaign_id,
                    "current_status": current_status
                }), 409

        elif new_status == 'stopped':
            # If stopping, also stop traffic generation
            if campaign_id in active_threads:
                logger.info(f"[API] Stopping traffic generation for campaign {campaign_id}")
                cleanup_campaign_resources(campaign_id)

        # Update the campaign status
        try:
            session = sessions[campaign_id]
            
            # Update status
            session.status = new_status
            session.updated_at = datetime.utcnow()

            # Add start_time if transitioning to running
            if new_status == 'running':
                session.start_time = datetime.utcnow()

            # Add end_time if transitioning to stopped/completed
            if new_status in ['stopped', 'completed']:
                session.end_time = datetime.utcnow()

            logger.info(f"[API] Successfully updated campaign {campaign_id} status to {new_status}")

            return jsonify({
                "success": True,
                "message": f"Campaign status updated to {new_status}",
                "campaign_id": campaign_id,
                "previous_status": current_status,
                "new_status": new_status,
                "updated_at": session.updated_at.isoformat()
            })

        except Exception as e:
            logger.error(f"[API] Error updating campaign status: {str(e)}", exc_info=True)
            return jsonify({
                "error": f"Failed to update campaign status: {str(e)}",
                "campaign_id": campaign_id
            }), 500

    except Exception as e:
        logger.error(f"[API] Unexpected error in campaign status update: {str(e)}", exc_info=True)
        return jsonify({"error": f"Unexpected error: {str(e)}"}), 500

@bp.route("/campaigns/<campaign_id>/info", methods=['GET'])
def get_campaign_info(campaign_id: str):
    """Get comprehensive campaign information including status and traffic generation state"""
    try:
        # Check if campaign exists
        if campaign_id not in sessions:
            return jsonify({"error": f"Campaign {campaign_id} not found"}), 404

        campaign_data = sessions[campaign_id].to_dict()
        
        # Get traffic generation status
        is_traffic_running = campaign_id in active_threads
        thread_id = active_threads.get(campaign_id) if is_traffic_running else None
        
        # Get traffic data if exists
        campaign_file = os.path.join(TRAFFIC_DATA_DIR, campaign_id, 'traffic.json')
        traffic_stats = {
            "has_traffic_data": os.path.exists(campaign_file),
            "total_requests": 0,
            "successful_requests": 0,
            "success_rate": 0.0
        }
        
        if os.path.exists(campaign_file):
            try:
                with open(campaign_file, 'r') as f:
                    traffic_data = json.load(f)
                    traffic_stats.update({
                        "total_requests": len(traffic_data),
                        "successful_requests": sum(1 for entry in traffic_data if entry.get('success', False)),
                        "last_request_time": traffic_data[-1].get('timestamp') if traffic_data else None
                    })
                    if traffic_stats["total_requests"] > 0:
                        traffic_stats["success_rate"] = (traffic_stats["successful_requests"] / traffic_stats["total_requests"]) * 100
            except Exception as e:
                logger.error(f"[API] Error reading traffic data: {str(e)}")

        # Compile comprehensive info
        campaign_info = {
            "campaign_id": campaign_id,
            "basic_info": {
                "name": campaign_data.get('name'),
                "target_url": campaign_data.get('target_url'),
                "status": campaign_data.get('status'),
                "created_at": campaign_data.get('created_at'),
                "updated_at": campaign_data.get('updated_at'),
                "start_time": campaign_data.get('start_time'),
                "end_time": campaign_data.get('end_time')
            },
            "traffic_generation": {
                "is_running": is_traffic_running,
                "thread_id": thread_id,
                "requests_per_minute": campaign_data.get('requests_per_minute'),
                "duration_minutes": campaign_data.get('duration_minutes'),
                "user_profile_ids": campaign_data.get('user_profile_ids'),
                "profile_user_counts": campaign_data.get('profile_user_counts'),
                "total_profile_users": sum(campaign_data.get('profile_user_counts', {}).values())
            },
            "traffic_stats": traffic_stats,
            "configuration": {
                "geo_locations": campaign_data.get('geo_locations'),
                "rtb_config": campaign_data.get('rtb_config'),
                "config": campaign_data.get('config')
            }
        }

        return jsonify({
            "success": True,
            "data": campaign_info
        })

    except Exception as e:
        logger.logerror(f"[API] Error getting campaign info: {str(e)}", exc_info=True)
        return jsonify({"error": f"Error getting campaign info: {str(e)}"}), 500

@bp.route('/events-log', methods=['GET'])
def download_events_log():
    try:
        file_exists = os.path.exists(CAMPAIGN_EVENTS_LOG_PATH)
        if not file_exists:
            return jsonify({"error": "Log file not found"}), 404
        # Flush all file handlers before sending
        for handler in logger.handlers + campaign_logger.handlers:
            if hasattr(handler, 'flush'):
                handler.flush()
        return send_file(CAMPAIGN_EVENTS_LOG_PATH, as_attachment=True)
    except Exception as e:
        logger.error(f"Error sending campaign events log: {str(e)}", exc_info=True)