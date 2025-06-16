import os
import json
from flask import Blueprint, request, jsonify
from typing import List, Optional, Dict, Any
import threading
import random
import time
from datetime import datetime, timedelta
from dataclasses import dataclass
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
        campaign_file = os.path.join(TRAFFIC_DATA_DIR, campaign_id, 'traffic.json')
        if not os.path.exists(campaign_file):
            with open(campaign_file, 'w') as f:
                json.dump([], f)

        with open(campaign_file, 'r+') as f:
            try:
                data = json.load(f)
            except json.JSONDecodeError:
                data = []
            
            data.append(traffic_data)
            f.seek(0)
            json.dump(data, f, indent=2)
            f.truncate()
            
        logger.debug(f"Appended traffic data to {campaign_file}")
    except Exception as e:
        logger.error(f"Error appending traffic data: {str(e)}", exc_info=True)
        raise

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

    def __post_init__(self):
        if self.geo_locations is None:
            self.geo_locations = ["United States"]
        if self.user_profiles is None:
            self.user_profiles = []
        if self.rtb_config is None:
            self.rtb_config = {}
        if self.config is None:
            self.config = {}
        if self.created_at is None:
            self.created_at = datetime.utcnow()
        if self.updated_at is None:
            self.updated_at = datetime.utcnow()

def generate_traffic_background(config: TrafficConfig):
    """Generate traffic in the background"""
    thread_id = str(uuid.uuid4())
    active_threads[config.campaign_id] = thread_id
    
    try:
        logger.info(f"Starting background traffic generation for campaign {config.campaign_id}")
        logger.debug(f"Configuration: {config}")

        # Create campaign-specific directory and file
        campaign_dir = os.path.join(TRAFFIC_DATA_DIR, config.campaign_id)
        os.makedirs(campaign_dir, exist_ok=True)
        
        campaign_file = os.path.join(campaign_dir, 'traffic.json')
        if not os.path.exists(campaign_file):
            logger.info(f"Creating new campaign file: {campaign_file}")
            with open(campaign_file, 'w') as f:
                json.dump([], f)

        # Calculate total requests
        total_requests = config.requests_per_minute * (config.duration_minutes or 60)
        logger.info(f"Will generate {total_requests} total requests")

        # Generate traffic
        request_count = 0
        start_time = datetime.utcnow()
        end_time = start_time + timedelta(minutes=config.duration_minutes) if config.duration_minutes else None

        # Update campaign status to running
        update_campaign_status(config.campaign_id, "running", {
            "start_time": start_time.isoformat(),
            "total_requests": total_requests
        })

        while True:
            try:
                # Check if thread was stopped
                if active_threads.get(config.campaign_id) != thread_id:
                    logger.info(f"Traffic generation stopped for campaign {config.campaign_id}")
                    break

                # Check if we should stop
                if end_time and datetime.utcnow() >= end_time:
                    logger.info(f"Reached duration limit for campaign {config.campaign_id}")
                    break

                # Generate traffic data
                traffic_data = generate_traffic_data(config)
                logger.debug(f"Generated traffic data: {json.dumps(traffic_data, indent=2)}")

                # Simulate request
                response_data = simulate_request(traffic_data)
                logger.debug(f"Simulated request response: {json.dumps(response_data, indent=2)}")

                # Save to campaign-specific file
                with thread_locks.get(config.campaign_id, Lock()):
                    append_traffic_to_file(config.campaign_id, response_data)
                
                request_count += 1
                logger.debug(f"Saved request {request_count} for campaign {config.campaign_id}")

                # Update progress
                progress = (request_count / total_requests) * 100 if total_requests > 0 else 0
                update_campaign_status(config.campaign_id, "running", {
                    "progress_percentage": progress,
                    "total_requests": request_count,
                    "successful_requests": request_count if response_data.get('success') else request_count - 1
                })

                # Calculate sleep time
                sleep_time = 60 / config.requests_per_minute
                if config.config.get('randomize_timing', True):
                    sleep_time *= random.uniform(0.8, 1.2)
                logger.debug(f"Sleeping for {sleep_time:.2f} seconds")
                time.sleep(sleep_time)

            except Exception as e:
                logger.error(f"Error in traffic generation loop: {str(e)}", exc_info=True)
                update_campaign_status(config.campaign_id, "error", {
                    "error": str(e),
                    "last_request_count": request_count
                })
                time.sleep(1)  # Prevent tight loop on error

        # Update final status
        final_status = "completed" if request_count > 0 else "error"
        update_campaign_status(config.campaign_id, final_status, {
            "end_time": datetime.utcnow().isoformat(),
            "total_requests": request_count,
            "successful_requests": request_count if response_data.get('success') else request_count - 1
        })

        logger.info(f"Completed traffic generation for campaign {config.campaign_id}")
        logger.info(f"Generated {request_count} requests")

    except Exception as e:
        logger.error(f"Error in background traffic generation: {str(e)}", exc_info=True)
        update_campaign_status(config.campaign_id, "error", {
            "error": str(e)
        })
    finally:
        if active_threads.get(config.campaign_id) == thread_id:
            del active_threads[config.campaign_id]
        if config.campaign_id in thread_locks:
            del thread_locks[config.campaign_id]

@bp.route("/generate", methods=['POST'])
def generate_traffic():
    """Start traffic generation for a campaign"""
    try:
        logger.info("Received traffic generation request")
        data = request.get_json()
        logger.debug(f"Request data: {json.dumps(data, indent=2)}")

        if not data:
            logger.error("No data provided in request")
            return jsonify({
                "success": False,
                "message": "No data provided"
            }), 400

        # Validate required fields
        required_fields = ['campaign_id', 'target_url']
        missing_fields = [field for field in required_fields if field not in data]
        if missing_fields:
            logger.error(f"Missing required fields: {missing_fields}")
            return jsonify({
                "success": False,
                "message": f"Missing required fields: {', '.join(missing_fields)}"
            }), 400

        campaign_id = data['campaign_id']

        # Check if traffic generation is already running
        if campaign_id in active_threads:
            logger.warning(f"Traffic generation already running for campaign {campaign_id}")
            return jsonify({
                "success": False,
                "message": "Traffic generation already running for this campaign"
            }), 409

        # Create TrafficConfig object
        try:
            config = TrafficConfig(
                campaign_id=campaign_id,
                target_url=data['target_url'],
                requests_per_minute=data.get('requests_per_minute', 10),
                duration_minutes=data.get('duration_minutes', 60),
                geo_locations=data.get('geo_locations', ['United States']),
                rtb_config=data.get('rtb_config', {}),
                config=data.get('config', {})
            )
            logger.debug(f"Created TrafficConfig: {config}")
        except Exception as e:
            logger.error(f"Error creating TrafficConfig: {str(e)}", exc_info=True)
            return jsonify({
                "success": False,
                "message": f"Invalid configuration: {str(e)}"
            }), 400

        # Validate configuration
        if config.requests_per_minute <= 0:
            logger.error(f"Invalid requests_per_minute: {config.requests_per_minute}")
            return jsonify({
                "success": False,
                "message": "Requests per minute must be greater than 0"
            }), 400
        
        if config.duration_minutes is not None and config.duration_minutes <= 0:
            logger.error(f"Invalid duration_minutes: {config.duration_minutes}")
            return jsonify({
                "success": False,
                "message": "Duration must be greater than 0"
            }), 400

        # Create campaign-specific directory if it doesn't exist
        campaign_dir = os.path.join(TRAFFIC_DATA_DIR, campaign_id)
        os.makedirs(campaign_dir, exist_ok=True)
        logger.info(f"Ensured campaign directory exists: {campaign_dir}")

        # Initialize thread lock
        thread_locks[campaign_id] = Lock()

        # Start traffic generation in background thread
        logger.info(f"Starting traffic generation thread for campaign {campaign_id}")
        thread = threading.Thread(target=generate_traffic_background, args=(config,))
        thread.daemon = True
        thread.start()
        
        logger.info(f"Successfully started traffic generation for campaign {campaign_id}")
        
        # Return a proper response object
        response_data = {
            "success": True,
            "message": "Traffic generation started",
            "data": {
                "campaign_id": campaign_id,
                "requests_per_minute": config.requests_per_minute,
                "duration_minutes": config.duration_minutes,
                "status": "running",
                "start_time": datetime.utcnow().isoformat()
            }
        }
        logger.debug(f"Sending response: {json.dumps(response_data, indent=2)}")
        return jsonify(response_data)

    except Exception as e:
        logger.error(f"Error generating traffic: {str(e)}", exc_info=True)
        return jsonify({
            "success": False,
            "message": f"Internal server error: {str(e)}"
        }), 500

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
            "config": config.config
        }
        
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
        logger.info(f"Getting generated traffic for campaign {campaign_id}")
        traffic_file = os.path.join(TRAFFIC_DATA_DIR, f'{campaign_id}.json')
        
        if os.path.exists(traffic_file):
            with open(traffic_file, 'r') as f:
                traffic_data = json.load(f)
            logger.debug(f"Retrieved {len(traffic_data)} traffic entries")
            return jsonify({
                "success": True,
                "data": traffic_data
            })
        else:
            logger.warning(f"No traffic data found for campaign {campaign_id}")
            return jsonify({
                "success": True,
                "data": []
            })
    except Exception as e:
        logger.error(f"Error getting campaign traffic: {str(e)}", exc_info=True)
        return jsonify({
            "success": False,
            "message": f"Error getting campaign traffic: {str(e)}"
        }), 500

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
    """Clean up campaign resources and temporary files"""
    try:
        # Clean up campaign-specific files
        campaign_file = os.path.join(TRAFFIC_DATA_DIR, f'{campaign_id}.json')
        if os.path.exists(campaign_file):
            # Archive the file instead of deleting
            archive_dir = os.path.join(TRAFFIC_DATA_DIR, 'archives')
            os.makedirs(archive_dir, exist_ok=True)
            archive_file = os.path.join(archive_dir, f'{campaign_id}_{datetime.utcnow().strftime("%Y%m%d_%H%M%S")}.json')
            os.rename(campaign_file, archive_file)
            
        # Clean up temporary files
        temp_dir = os.path.join(TRAFFIC_DATA_DIR, 'temp')
        if os.path.exists(temp_dir):
            for file in os.listdir(temp_dir):
                if file.startswith(f'{campaign_id}_'):
                    os.remove(os.path.join(temp_dir, file))
                    
        return True
    except Exception as e:
        logger.error(f"Error cleaning up campaign resources: {str(e)}")
        return False

@bp.route("/cleanup/<campaign_id>", methods=['POST'])
def cleanup_campaign(campaign_id: str):
    """Clean up campaign resources and update status"""
    try:
        # Clean up resources
        cleanup_success = cleanup_campaign_resources(campaign_id)
        
        if cleanup_success:
            return jsonify({
                "success": True,
                "message": "Campaign resources cleaned up successfully"
            })
        else:
            return jsonify({
                "success": False,
                "message": "Failed to clean up campaign resources"
            }), 500
    except Exception as e:
        logger.error(f"Error in cleanup endpoint: {str(e)}")
        return jsonify({
            "success": False,
            "message": f"Error cleaning up campaign: {str(e)}"
        }), 500

@bp.route("/stop/<campaign_id>", methods=['POST'])
def stop_traffic_generation(campaign_id: str):
    """Stop traffic generation for a campaign"""
    try:
        logger.info(f"Stopping traffic generation for campaign {campaign_id}")
        
        # Update campaign status
        status_data = {
            "status": "stopped",
            "end_time": datetime.utcnow().isoformat()
        }
        update_campaign_status(campaign_id, "stopped", status_data)
        
        # Clean up resources
        cleanup_success = cleanup_campaign_resources(campaign_id)
        
        if cleanup_success:
            logger.info(f"Successfully stopped traffic generation for campaign {campaign_id}")
            return jsonify({
                "success": True,
                "message": "Traffic generation stopped successfully",
                "data": status_data
            })
        else:
            logger.error(f"Failed to clean up resources for campaign {campaign_id}")
            return jsonify({
                "success": False,
                "message": "Failed to clean up campaign resources"
            }), 500
    except Exception as e:
        logger.error(f"Error stopping traffic generation: {str(e)}", exc_info=True)
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
    """Get current campaign status"""
    try:
        logger.info(f"Getting status for campaign {campaign_id}")
        status_file = os.path.join(TRAFFIC_DATA_DIR, f'{campaign_id}_status.json')
        
        if os.path.exists(status_file):
            with open(status_file, 'r') as f:
                status_data = json.load(f)
            logger.debug(f"Retrieved status data: {status_data}")
            return jsonify({
                "success": True,
                "data": status_data
            })
        else:
            logger.warning(f"No status data found for campaign {campaign_id}")
            return jsonify({
                "success": False,
                "message": "No status data found for campaign"
            }), 404
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