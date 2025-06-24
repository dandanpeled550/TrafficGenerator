from flask import Blueprint, request, jsonify
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from datetime import datetime
from .logging_config import get_logger
# from bson import ObjectId # Commented out ObjectId import

# from app.database import get_database # Commented out database import

# Configure logging
logger = get_logger('Session')

bp = Blueprint('sessions', __name__)

@dataclass
class Session:
    # Required fields (no defaults)
    id: str
    name: str
    target_url: str
    status: str = "draft"
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    
    # Optional fields with defaults
    requests_per_minute: int = 10
    duration_minutes: Optional[int] = 60
    geo_locations: List[str] = field(default_factory=lambda: ["United States"])
    rtb_config: Optional[Dict[str, Any]] = None
    config: Optional[Dict[str, Any]] = None
    user_profile_ids: List[str] = field(default_factory=list)
    profile_user_counts: Optional[Dict[str, int]] = field(default_factory=dict)
    total_profile_users: int = 0
    log_file_path: Optional[str] = None
    log_level: Optional[str] = None
    log_format: Optional[str] = None
    user_agents: List[str] = field(default_factory=list)
    referrers: List[str] = field(default_factory=list)
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    total_requests: int = 0
    successful_requests: int = 0
    last_activity_time: Optional[datetime] = None
    progress_percentage: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        ensure_datetime_fields(self)
        return {
            'id': self.id,
            'name': self.name,
            'target_url': self.target_url,
            'status': self.status,
            'created_at': self.created_at.isoformat() if isinstance(self.created_at, datetime) else self.created_at,
            'updated_at': self.updated_at.isoformat() if isinstance(self.updated_at, datetime) else self.updated_at,
            'start_time': self.start_time.isoformat() if isinstance(self.start_time, datetime) else self.start_time,
            'end_time': self.end_time.isoformat() if isinstance(self.end_time, datetime) else self.end_time,
            'requests_per_minute': self.requests_per_minute,
            'duration_minutes': self.duration_minutes,
            'geo_locations': self.geo_locations,
            'rtb_config': self.rtb_config,
            'config': self.config,
            'user_profile_ids': self.user_profile_ids,
            'profile_user_counts': self.profile_user_counts,
            'total_profile_users': self.total_profile_users,
            'log_file_path': self.log_file_path,
            'log_level': self.log_level,
            'log_format': self.log_format,
            'user_agents': self.user_agents,
            'referrers': self.referrers,
            'total_requests': self.total_requests,
            'successful_requests': self.successful_requests,
            'last_activity_time': self.last_activity_time.isoformat() if isinstance(self.last_activity_time, datetime) else self.last_activity_time,
            'progress_percentage': self.progress_percentage
        }

# Initialize in-memory storage for sessions
sessions: Dict[str, Session] = {}

def ensure_datetime_fields(session):
    # List of all datetime fields
    datetime_fields = ['created_at', 'updated_at', 'start_time', 'end_time', 'last_activity_time']
    for field in datetime_fields:
        value = getattr(session, field, None)
        logger.debug(f"Field {field} before conversion: {value} (type: {type(value)})")
        if value is not None and not isinstance(value, datetime):
            if isinstance(value, str):
                try:
                    value = value.replace('Z', '+00:00')
                    value = datetime.fromisoformat(value)
                except Exception as e:
                    logger.warning(f"Failed to convert {field} from string to datetime: {e}")
                    value = None
            else:
                value = None
        setattr(session, field, value)
        logger.debug(f"Field {field} after conversion: {value} (type: {type(value)})")
    return session

@bp.route("/", methods=['POST'])
def create_session():
    """Create a new traffic session"""
    try:
        data = request.get_json()
        logger.info(f"[Session] Create request received: {data}")
        if not data:
            return jsonify({"error": "No data provided"}), 400

        # Validate required fields
        required_fields = ['name', 'target_url']
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400

        # Validate target_url format
        target_url = data['target_url']
        if not (isinstance(target_url, str) and (target_url.startswith('http://') or target_url.startswith('https://'))):
            return jsonify({"error": "Invalid target_url: must start with http:// or https://"}), 400

        session_id = f"session_{len(sessions) + 1}"
        
        # Ensure rtb_config has all required fields
        rtb_config = data.get('rtb_config', {})
        if not isinstance(rtb_config, dict):
            rtb_config = {}
        rtb_config.setdefault('device_brand', 'samsung')
        rtb_config.setdefault('device_models', [])
        rtb_config.setdefault('ad_formats', [])
        rtb_config.setdefault('app_categories', [])
        rtb_config.setdefault('generate_adid', True)
        rtb_config.setdefault('simulate_bid_requests', True)

        # Ensure profile_user_counts is a dictionary
        profile_user_counts = data.get('profile_user_counts', {})
        if not isinstance(profile_user_counts, dict):
            profile_user_counts = {}

        # Calculate total profile users
        total_profile_users = sum(profile_user_counts.values())
        
        new_session = Session(
            id=session_id,
            name=data['name'],
            target_url=data['target_url'],
            status="draft",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            requests_per_minute=data.get('requests_per_minute', 10),
            duration_minutes=data.get('duration_minutes', 60),
            geo_locations=data.get('geo_locations', ["United States"]),
            rtb_config=rtb_config,
            config=data.get('config', {}),
            user_profile_ids=data.get('user_profile_ids', []),
            profile_user_counts=profile_user_counts,
            total_profile_users=total_profile_users,
            log_file_path=data.get('log_file_path'),
            log_level=data.get('log_level'),
            log_format=data.get('log_format'),
            user_agents=data.get('user_agents', []),
            referrers=data.get('referrers', [])
        )
        new_session = ensure_datetime_fields(new_session)
        sessions[session_id] = new_session
        logger.info(f"[Session] Created: {new_session.to_dict()}")
        return jsonify(new_session.to_dict())
    except Exception as e:
        logger.error(f"[Session] Error creating: {str(e)}")
        return jsonify({"error": str(e)}), 500

@bp.route("/", methods=['GET'])
def list_sessions():
    """List all traffic sessions, updating total_requests and successful_requests from traffic files"""
    import os
    import json
    from app.api.traffic import TRAFFIC_DATA_DIR
    try:
        logger.info("[Session] List all request received")
        session_dicts = []
        for session in sessions.values():
            # Try to update total_requests and successful_requests from traffic file
            campaign_id = session.id
            campaign_file = os.path.join(TRAFFIC_DATA_DIR, campaign_id, 'traffic.json')
            if os.path.exists(campaign_file):
                try:
                    with open(campaign_file, 'r') as f:
                        traffic_data = json.load(f)
                    session.total_requests = len(traffic_data)
                    session.successful_requests = sum(1 for entry in traffic_data if entry.get('success', False))
                except Exception as e:
                    logger.warning(f"Could not read traffic file for session {campaign_id}: {e}")
                    session.total_requests = 0
                    session.successful_requests = 0
            else:
                session.total_requests = 0
                session.successful_requests = 0
            session_dicts.append(session.to_dict())
        logger.info(f"[Session] Listed all sessions: count={len(session_dicts)}")
        return jsonify(session_dicts)
    except Exception as e:
        logger.error(f"[Session] Error listing: {str(e)}")
        return jsonify({"error": str(e)}), 500

@bp.route("/<session_id>", methods=['GET'])
def get_session(session_id: str):
    """Get a specific traffic session"""
    try:
        logger.info(f"[Session] Get request received for: {session_id}")
        if session_id not in sessions:
            logger.warning(f"[Session] Not found: {session_id}")
            return jsonify({"error": "Session not found"}), 404
        logger.info(f"[Session] Fetched: {sessions[session_id].to_dict()}")
        return jsonify(sessions[session_id].to_dict())
    except Exception as e:
        logger.error(f"[Session] Error getting: {str(e)}")
        return jsonify({"error": str(e)}), 500

@bp.route("/<session_id>", methods=['PUT'])
def update_session(session_id: str):
    """Update a traffic session"""
    try:
        logger.info(f"[Session] Update request received for: {session_id}")
        if session_id not in sessions:
            logger.warning(f"[Session] Not found for update: {session_id}")
            return jsonify({"error": "Session not found"}), 404
            
        data = request.get_json()
        logger.info(f"[Session] Update data: {data}")
        if not data:
            return jsonify({"error": "No data provided"}), 400
            
        # Validate target_url format if updating
        if 'target_url' in data:
            target_url = data['target_url']
            if not (isinstance(target_url, str) and (target_url.startswith('http://') or target_url.startswith('https://'))):
                return jsonify({"error": "Invalid target_url: must start with http:// or https://"}), 400

        session = sessions[session_id]
        
        # Handle rtb_config update
        if 'rtb_config' in data:
            rtb_config = data['rtb_config']
            if not isinstance(rtb_config, dict):
                rtb_config = {}
            rtb_config.setdefault('device_brand', 'samsung')
            rtb_config.setdefault('device_models', [])
            rtb_config.setdefault('ad_formats', [])
            rtb_config.setdefault('app_categories', [])
            rtb_config.setdefault('generate_adid', True)
            rtb_config.setdefault('simulate_bid_requests', True)
            session.rtb_config = rtb_config

        # Handle profile_user_counts update
        if 'profile_user_counts' in data:
            profile_user_counts = data['profile_user_counts']
            if not isinstance(profile_user_counts, dict):
                profile_user_counts = {}
            session.profile_user_counts = profile_user_counts
            session.total_profile_users = sum(profile_user_counts.values())
        
        # Update other fields if provided
        for field, value in data.items():
            if field not in ['rtb_config', 'profile_user_counts'] and hasattr(session, field):
                if field in ['created_at', 'updated_at', 'start_time', 'end_time', 'last_activity_time']:
                    # Convert string to datetime if needed
                    if isinstance(value, str):
                        try:
                            value = value.replace('Z', '+00:00')
                            value = datetime.fromisoformat(value)
                        except ValueError as e:
                            logger.warning(f"Invalid datetime format for {field}: {value}, error: {str(e)}")
                            continue
                setattr(session, field, value)

        session = ensure_datetime_fields(session)
        session.updated_at = datetime.utcnow()
        logger.info(f"[Session] Updated: {session.to_dict()}")
        return jsonify(session.to_dict())
    except Exception as e:
        logger.error(f"[Session] Error updating: {str(e)}")
        return jsonify({"error": str(e)}), 500

@bp.route("/<session_id>", methods=['DELETE'])
def delete_session(session_id: str):
    """Delete a traffic session"""
    try:
        logger.info(f"[Session] Delete request received for: {session_id}")
        if session_id not in sessions:
            logger.warning(f"[Session] Not found for delete: {session_id}")
            return jsonify({"error": "Session not found"}), 404
        del sessions[session_id]
        logger.info(f"[Session] Deleted: {session_id}")
        return jsonify({"success": True, "message": f"Session {session_id} deleted"})
    except Exception as e:
        logger.error(f"[Session] Error deleting: {str(e)}")
        return jsonify({"error": str(e)}), 500 