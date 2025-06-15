from flask import Blueprint, request, jsonify
from typing import List, Optional, Dict
from datetime import datetime
from dataclasses import dataclass, field
import uuid
import logging

logger = logging.getLogger(__name__)

bp = Blueprint('profiles', __name__)

# In-memory storage for profiles
profiles: Dict[str, 'UserProfile'] = {}

@dataclass
class UserProfile:
    id: str
    name: str
    description: str
    demographics: Dict = field(default_factory=lambda: {
        'age_group': 'any',
        'gender': 'any',
        'interests': []
    })
    device_preferences: Dict = field(default_factory=lambda: {
        'device_brand': 'samsung',
        'device_models': [],
        'operating_system': 'android'
    })
    app_usage: Dict = field(default_factory=lambda: {
        'preferred_app_categories': [],
        'session_duration_avg_minutes': 15
    })
    rtb_specifics: Dict = field(default_factory=lambda: {
        'preferred_ad_formats': [],
        'adid_persistence': 'per_user'
    })
    created_at: str = field(default_factory=lambda: str(uuid.uuid4()))
    updated_at: str = field(default_factory=lambda: str(uuid.uuid4()))

@bp.route('/', methods=['POST'])
def create_profile():
    try:
        data = request.get_json()
        logger.info(f"Creating profile with data: {data}")
        
        profile_id = str(uuid.uuid4())
        profile = UserProfile(
            id=profile_id,
            name=data['name'],
            description=data['description'],
            demographics=data.get('demographics', {}),
            device_preferences=data.get('device_preferences', {}),
            app_usage=data.get('app_usage', {}),
            rtb_specifics=data.get('rtb_specifics', {})
        )
        profiles[profile_id] = profile
        logger.info(f"Created profile: {profile}")
        return jsonify(profile.__dict__), 201
    except Exception as e:
        logger.error(f"Error creating profile: {str(e)}")
        return jsonify({"error": str(e)}), 400

@bp.route('/', methods=['GET'])
def get_profiles():
    try:
        logger.info("Fetching all profiles")
        return jsonify([profile.__dict__ for profile in profiles.values()])
    except Exception as e:
        logger.error(f"Error fetching profiles: {str(e)}")
        return jsonify({"error": str(e)}), 500

@bp.route('/<profile_id>', methods=['GET'])
def get_profile(profile_id):
    try:
        logger.info(f"Fetching profile: {profile_id}")
        if profile_id not in profiles:
            return jsonify({"error": "Profile not found"}), 404
        return jsonify(profiles[profile_id].__dict__)
    except Exception as e:
        logger.error(f"Error fetching profile: {str(e)}")
        return jsonify({"error": str(e)}), 500

@bp.route('/<profile_id>', methods=['PUT'])
def update_profile(profile_id):
    try:
        if profile_id not in profiles:
            return jsonify({"error": "Profile not found"}), 404
        
        data = request.get_json()
        logger.info(f"Updating profile {profile_id} with data: {data}")
        
        profile = profiles[profile_id]
        profile.name = data.get('name', profile.name)
        profile.description = data.get('description', profile.description)
        profile.demographics = data.get('demographics', profile.demographics)
        profile.device_preferences = data.get('device_preferences', profile.device_preferences)
        profile.app_usage = data.get('app_usage', profile.app_usage)
        profile.rtb_specifics = data.get('rtb_specifics', profile.rtb_specifics)
        profile.updated_at = str(uuid.uuid4())
        
        logger.info(f"Updated profile: {profile}")
        return jsonify(profile.__dict__)
    except Exception as e:
        logger.error(f"Error updating profile: {str(e)}")
        return jsonify({"error": str(e)}), 500

@bp.route('/<profile_id>', methods=['DELETE'])
def delete_profile(profile_id):
    try:
        logger.info(f"Deleting profile: {profile_id}")
        if profile_id not in profiles:
            return jsonify({"error": "Profile not found"}), 404
        
        del profiles[profile_id]
        return jsonify({"message": "Profile deleted successfully"})
    except Exception as e:
        logger.error(f"Error deleting profile: {str(e)}")
        return jsonify({"error": str(e)}), 500 