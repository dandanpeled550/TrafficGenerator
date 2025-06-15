from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from datetime import datetime

# Nested Models for UserProfile
@dataclass
class Demographics:
    age_group: Optional[str] = None
    gender: Optional[str] = None
    interests: List[str] = field(default_factory=list)
    # Add any other demographic fields as needed by the frontend

@dataclass
class DevicePreferences:
    device_brand: Optional[str] = None
    operating_system: Optional[str] = None
    device_models: List[str] = field(default_factory=list)
    # Add any other device preference fields

@dataclass
class AppUsage:
    preferred_app_categories: List[str] = field(default_factory=list)
    session_duration_avg_minutes: Optional[int] = None
    # Add any other app usage fields

@dataclass
class RtbSpecifics:
    preferred_ad_formats: List[str] = field(default_factory=list)
    generate_adid: Optional[bool] = None
    adid_persistence: Optional[str] = None
    bid_request_parameters: Optional[Dict[str, Any]] = field(default_factory=dict)
    # Add any other RTB specific fields

@dataclass
class BehavioralPatterns:
    browsing_frequency: Optional[str] = None
    peak_hours: Optional[str] = None
    content_consumption_rate: Optional[str] = None
    # Add any other behavioral pattern fields

@dataclass
class LocationData:
    country: Optional[str] = None
    city: Optional[str] = None
    ip_address: Optional[str] = None
    # Add any other location data fields

@dataclass
class UserProfile:
    id: Optional[str] = None
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
    demographics: Optional[Demographics] = None
    device_preferences: Optional[DevicePreferences] = None
    app_usage: Optional[AppUsage] = None
    rtb_specifics: Optional[RtbSpecifics] = None
    behavioral_patterns: Optional[BehavioralPatterns] = None
    location_data: Optional[LocationData] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

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
            'demographics': self.demographics.__dict__ if self.demographics else None,
            'device_preferences': self.device_preferences.__dict__ if self.device_preferences else None,
            'app_usage': self.app_usage.__dict__ if self.app_usage else None,
            'rtb_specifics': self.rtb_specifics.__dict__ if self.rtb_specifics else None,
            'behavioral_patterns': self.behavioral_patterns.__dict__ if self.behavioral_patterns else None,
            'location_data': self.location_data.__dict__ if self.location_data else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class UserProfileCreate(UserProfile):
    id: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    demographics: Optional[Demographics] = None
    device_preferences: Optional[DevicePreferences] = None
    app_usage: Optional[AppUsage] = None
    rtb_specifics: Optional[RtbSpecifics] = None
    behavioral_patterns: Optional[BehavioralPatterns] = None
    location_data: Optional[LocationData] = None
    updated_at: Optional[datetime] = None 