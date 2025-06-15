import os
import json
from flask import Blueprint, request, jsonify
from typing import List, Optional, Dict, Any
import threading
import random
import time
from datetime import datetime
from dataclasses import dataclass
import logging

# Configure logging
logger = logging.getLogger(__name__)

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
    """Background task to generate traffic"""
    start_time = time.time()
    request_count = 0
    
    logger.info(f"Starting traffic generation for campaign {config.campaign_id}")
    logger.info(f"Configuration: requests_per_minute={config.requests_per_minute}, duration_minutes={config.duration_minutes}")
    
    while True:
        # Check if we should stop
        if config.duration_minutes and (time.time() - start_time) > (config.duration_minutes * 60):
            logger.info(f"Traffic generation completed for campaign {config.campaign_id}. Duration limit reached.")
            break
            
        # Generate traffic batch
        batch_size = min(config.requests_per_minute, 10)  # Process in smaller batches
        logger.debug(f"Generating batch of {batch_size} requests for campaign {config.campaign_id}")
        
        for i in range(batch_size):
            try:
                # Generate traffic data
                traffic_data = generate_traffic_data(config)
                logger.debug(f"Generated traffic data for request {i+1}/{batch_size}: {traffic_data}")
                
                # Simulate request
                response_data = simulate_request(traffic_data)
                logger.debug(f"Simulated request response: {response_data}")
                
                # Save to file
                append_traffic_to_file(config.campaign_id, response_data)
                logger.debug(f"Saved traffic data to file for campaign {config.campaign_id}")
                
                request_count += 1
                
            except Exception as e:
                logger.error(f"Error generating traffic for campaign {config.campaign_id}: {str(e)}", exc_info=True)
        
        # Update campaign status
        try:
            status_data = {
                "total_requests": request_count,
                "elapsed_time": time.time() - start_time,
                "requests_per_minute": request_count / ((time.time() - start_time) / 60)
            }
            update_campaign_status(config.campaign_id, "running", status_data)
            logger.info(f"Updated campaign status for {config.campaign_id}: {status_data}")
        except Exception as e:
            logger.error(f"Error updating campaign status: {str(e)}", exc_info=True)
        
        # Wait for next batch
        sleep_time = 60 / config.requests_per_minute
        logger.debug(f"Waiting {sleep_time:.2f} seconds before next batch")
        time.sleep(sleep_time)

@bp.route("/generate", methods=['POST'])
def generate_traffic():
    try:
        data = request.get_json()
        if not data:
            logger.error("No data provided in request")
            return jsonify({
                "success": False,
                "message": "No data provided"
            }), 400
        
        logger.info(f"Received traffic generation request: {data}")
        
        # Remove any fields that aren't part of TrafficConfig
        valid_fields = {
            'campaign_id', 'target_url', 'requests_per_minute', 'duration_minutes',
            'geo_locations', 'rtb_config', 'config', 'user_profiles', 'log_file_path',
            'status', 'created_at', 'updated_at', 'start_time', 'end_time',
            'total_requests', 'successful_requests', 'last_activity_time',
            'progress_percentage'
        }
        filtered_data = {k: v for k, v in data.items() if k in valid_fields}
        logger.debug(f"Filtered configuration data: {filtered_data}")
        
        # Validate required fields
        required_fields = ['campaign_id', 'target_url']
        missing_fields = [field for field in required_fields if field not in filtered_data]
        if missing_fields:
            logger.error(f"Missing required fields: {missing_fields}")
            return jsonify({
                "success": False,
                "message": f"Missing required fields: {', '.join(missing_fields)}"
            }), 400
        
        try:
            config = TrafficConfig(**filtered_data)
            logger.info(f"Created TrafficConfig object: {config}")
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

        # Start traffic generation in background thread
        thread = threading.Thread(target=generate_traffic_background, args=(config,))
        thread.daemon = True
        thread.start()
        
        logger.info(f"Started traffic generation thread for campaign {config.campaign_id}")
        return jsonify({
            "success": True,
            "message": "Traffic generation started",
            "data": {"campaign_id": config.campaign_id}
        })
    except Exception as e:
        logger.error(f"Error generating traffic: {str(e)}", exc_info=True)
        return jsonify({
            "success": False,
            "message": f"Internal server error: {str(e)}"
        }), 500

def generate_traffic_data(config: TrafficConfig) -> Dict[str, Any]:
    """Generate traffic data based on configuration"""
    logger.debug(f"Generating traffic data for campaign {config.campaign_id}")
    
    # Ensure geo_locations is not empty
    if not config.geo_locations:
        logger.warning(f"No geo_locations provided for campaign {config.campaign_id}, using default")
        config.geo_locations = ["United States"]
    
    traffic_data = {
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
    logger.debug(f"Generated traffic data: {traffic_data}")
    return traffic_data

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
    """Health check endpoint"""
    try:
        return jsonify({
            "success": True,
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat()
        })
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}", exc_info=True)
        return jsonify({
            "success": False,
            "status": "unhealthy",
            "error": str(e)
        }), 500 