from flask import Blueprint, request, jsonify
from typing import List, Optional, Dict
from datetime import datetime
from dataclasses import dataclass, field
import uuid
from .logging_config import get_logger

logger = get_logger('Profile')

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
        logger.info(f"[Profile] Create request received: {data}")
        
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
        logger.info(f"[Profile] Created: {profile}")
        return jsonify(profile.__dict__), 201
    except Exception as e:
        logger.error(f"[Profile] Error creating: {str(e)}")
        return jsonify({"error": str(e)}), 400

@bp.route('/', methods=['GET'])
def get_profiles():
    try:
        logger.info("[Profile] Fetch all request received")
        result = [profile.__dict__ for profile in profiles.values()]
        logger.info(f"[Profile] Fetched all profiles: count={len(result)}")
        return jsonify(result)
    except Exception as e:
        logger.error(f"[Profile] Error fetching all: {str(e)}")
        return jsonify({"error": str(e)}), 500

@bp.route('/<profile_id>', methods=['GET'])
def get_profile(profile_id):
    try:
        logger.info(f"[Profile] Fetch request received for: {profile_id}")
        if profile_id not in profiles:
            logger.warning(f"[Profile] Not found: {profile_id}")
            return jsonify({"error": "Profile not found"}), 404
        logger.info(f"[Profile] Fetched: {profiles[profile_id]}")
        return jsonify(profiles[profile_id].__dict__)
    except Exception as e:
        logger.error(f"[Profile] Error fetching: {str(e)}")
        return jsonify({"error": str(e)}), 500

@bp.route('/<profile_id>', methods=['PUT'])
def update_profile(profile_id):
    try:
        logger.info(f"[Profile] Update request received for: {profile_id}")
        if profile_id not in profiles:
            logger.warning(f"[Profile] Not found for update: {profile_id}")
            return jsonify({"error": "Profile not found"}), 404
        data = request.get_json()
        logger.info(f"[Profile] Update data: {data}")
        profile = profiles[profile_id]
        profile.name = data.get('name', profile.name)
        profile.description = data.get('description', profile.description)
        profile.demographics = data.get('demographics', profile.demographics)
        profile.device_preferences = data.get('device_preferences', profile.device_preferences)
        profile.app_usage = data.get('app_usage', profile.app_usage)
        profile.rtb_specifics = data.get('rtb_specifics', profile.rtb_specifics)
        profile.updated_at = str(uuid.uuid4())
        logger.info(f"[Profile] Updated: {profile}")
        return jsonify(profile.__dict__)
    except Exception as e:
        logger.error(f"[Profile] Error updating: {str(e)}")
        return jsonify({"error": str(e)}), 500

@bp.route('/<profile_id>', methods=['DELETE'])
def delete_profile(profile_id):
    try:
        logger.info(f"[Profile] Delete request received for: {profile_id}")
        if profile_id not in profiles:
            logger.warning(f"[Profile] Not found for delete: {profile_id}")
            return jsonify({"error": "Profile not found"}), 404
        del profiles[profile_id]
        logger.info(f"[Profile] Deleted: {profile_id}")
        return jsonify({"message": "Profile deleted successfully"})
    except Exception as e:
        logger.error(f"[Profile] Error deleting: {str(e)}")
        return jsonify({"error": str(e)}), 500 