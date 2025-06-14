from flask import Blueprint, request, jsonify
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from datetime import datetime
# from bson import ObjectId # Commented out ObjectId import

# from app.database import get_database # Commented out database import

bp = Blueprint('sessions', __name__)

@dataclass
class Session:
    # Required fields (no defaults)
    id: str
    name: str
    target_url: str
    status: str
    created_at: datetime
    updated_at: datetime
    
    # Optional fields with defaults
    requests_per_minute: int = 10
    duration_minutes: Optional[int] = 60
    geo_locations: List[str] = field(default_factory=list)
    rtb_config: Optional[Dict[str, Any]] = field(default_factory=dict)
    config: Optional[Dict[str, Any]] = field(default_factory=dict)
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
    progress_percentage: int = 0

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'target_url': self.target_url,
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
            'status': self.status,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'start_time': self.start_time.isoformat() if self.start_time else None,
            'end_time': self.end_time.isoformat() if self.end_time else None,
            'total_requests': self.total_requests,
            'successful_requests': self.successful_requests,
            'last_activity_time': self.last_activity_time.isoformat() if self.last_activity_time else None,
            'progress_percentage': self.progress_percentage
        }

# In-memory storage for sessions (temporarily for testing)
sessions: Dict[str, Session] = {}

@bp.route("/", methods=['POST'])
def create_session():
    """Create a new traffic session"""
    data = request.get_json()
    session_id = f"session_{len(sessions) + 1}"
    
    new_session = Session(
        id=session_id,
        name=data['name'],
        target_url=data['target_url'],
        status="draft",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
        requests_per_minute=data.get('requests_per_minute', 10),
        duration_minutes=data.get('duration_minutes', 60),
        geo_locations=data.get('geo_locations', []),
        rtb_config=data.get('rtb_config', {}),
        config=data.get('config', {}),
        user_profile_ids=data.get('user_profile_ids', []),
        profile_user_counts=data.get('profile_user_counts', {}),
        total_profile_users=data.get('total_profile_users', 0),
        log_file_path=data.get('log_file_path'),
        log_level=data.get('log_level'),
        log_format=data.get('log_format'),
        user_agents=data.get('user_agents', []),
        referrers=data.get('referrers', [])
    )
    
    sessions[session_id] = new_session
    return jsonify(new_session.to_dict()), 201

@bp.route("/", methods=['GET'])
def list_sessions():
    """List all traffic sessions"""
    return jsonify([session.to_dict() for session in sessions.values()])

@bp.route("/<session_id>", methods=['GET'])
def get_session(session_id):
    """Get a specific traffic session"""
    if session_id not in sessions:
        return jsonify({"error": "Session not found"}), 404
    return jsonify(sessions[session_id].to_dict())

@bp.route("/<session_id>", methods=['PUT'])
def update_session(session_id):
    """Update a traffic session"""
    if session_id not in sessions:
        return jsonify({"error": "Session not found"}), 404
    
    data = request.get_json()
    current_session = sessions[session_id]
    
    # Update fields if they exist in the request
    for key, value in data.items():
        if hasattr(current_session, key):
            setattr(current_session, key, value)
    
    current_session.updated_at = datetime.utcnow()
    sessions[session_id] = current_session
    
    return jsonify(current_session.to_dict())

@bp.route("/<session_id>", methods=['DELETE'])
def delete_session(session_id):
    """Delete a traffic session"""
    if session_id not in sessions:
        return jsonify({"error": "Session not found"}), 404
    
    del sessions[session_id]
    return '', 204 