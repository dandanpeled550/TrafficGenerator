from flask import Blueprint, request, jsonify
from typing import List, Optional, Dict
from datetime import datetime
from dataclasses import dataclass, field

bp = Blueprint('profiles', __name__)

@dataclass
class UserProfileBase:
    name: str
    description: Optional[str] = None
    user_agent: Optional[str] = None
    geo_location: Optional[str] = None
    device_type: Optional[str] = None
    browser: Optional[str] = None
    os: Optional[str] = None
    referrer: Optional[str] = None
    custom_headers: Dict[str, str] = field(default_factory=dict)
    custom_cookies: Dict[str, str] = field(default_factory=dict)
    custom_params: Dict[str, str] = field(default_factory=dict)

@dataclass
class UserProfile(UserProfileBase):
    id: str
    created_at: datetime
    updated_at: datetime

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'user_agent': self.user_agent,
            'geo_location': self.geo_location,
            'device_type': self.device_type,
            'browser': self.browser,
            'os': self.os,
            'referrer': self.referrer,
            'custom_headers': self.custom_headers,
            'custom_cookies': self.custom_cookies,
            'custom_params': self.custom_params,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

# In-memory storage for user profiles
profiles_db: Dict[str, UserProfile] = {}

@bp.route("/", methods=['POST'])
def create_profile():
    data = request.get_json()
    profile_id = str(len(profiles_db) + 1)
    
    new_profile = UserProfile(
        id=profile_id,
        name=data['name'],
        description=data.get('description'),
        user_agent=data.get('user_agent'),
        geo_location=data.get('geo_location'),
        device_type=data.get('device_type'),
        browser=data.get('browser'),
        os=data.get('os'),
        referrer=data.get('referrer'),
        custom_headers=data.get('custom_headers', {}),
        custom_cookies=data.get('custom_cookies', {}),
        custom_params=data.get('custom_params', {}),
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    profiles_db[profile_id] = new_profile
    return jsonify(new_profile.to_dict()), 201

@bp.route("/", methods=['GET'])
def list_profiles():
    return jsonify([profile.to_dict() for profile in profiles_db.values()])

@bp.route("/<profile_id>", methods=['GET'])
def get_profile(profile_id):
    if profile_id not in profiles_db:
        return jsonify({"error": "Profile not found"}), 404
    return jsonify(profiles_db[profile_id].to_dict())

@bp.route("/<profile_id>", methods=['PUT'])
def update_profile(profile_id):
    if profile_id not in profiles_db:
        return jsonify({"error": "Profile not found"}), 404
    
    data = request.get_json()
    current_profile = profiles_db[profile_id]
    
    # Update fields if they exist in the request
    for key, value in data.items():
        if hasattr(current_profile, key):
            setattr(current_profile, key, value)
    
    current_profile.updated_at = datetime.utcnow()
    profiles_db[profile_id] = current_profile
    
    return jsonify(current_profile.to_dict())

@bp.route("/<profile_id>", methods=['DELETE'])
def delete_profile(profile_id):
    if profile_id not in profiles_db:
        return jsonify({"error": "Profile not found"}), 404
    
    del profiles_db[profile_id]
    return '', 204 