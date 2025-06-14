from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

# Nested Models for UserProfile
class Demographics(BaseModel):
    age_group: Optional[str] = None
    gender: Optional[str] = None
    interests: List[str] = Field(default_factory=list)
    # Add any other demographic fields as needed by the frontend

class DevicePreferences(BaseModel):
    device_brand: Optional[str] = None
    operating_system: Optional[str] = None
    device_models: List[str] = Field(default_factory=list)
    # Add any other device preference fields

class AppUsage(BaseModel):
    preferred_app_categories: List[str] = Field(default_factory=list)
    session_duration_avg_minutes: Optional[int] = None
    # Add any other app usage fields

class RtbSpecifics(BaseModel):
    preferred_ad_formats: List[str] = Field(default_factory=list)
    generate_adid: Optional[bool] = None
    adid_persistence: Optional[str] = None
    bid_request_parameters: Optional[Dict[str, Any]] = Field(default_factory=dict)
    # Add any other RTB specific fields

class BehavioralPatterns(BaseModel):
    browsing_frequency: Optional[str] = None
    peak_hours: Optional[str] = None
    content_consumption_rate: Optional[str] = None
    # Add any other behavioral pattern fields

class LocationData(BaseModel):
    country: Optional[str] = None
    city: Optional[str] = None
    ip_address: Optional[str] = None
    # Add any other location data fields

class TechnicalDetails(BaseModel):
    browser_type: Optional[str] = None
    connection_type: Optional[str] = None
    # Add any other technical detail fields

class UserProfile(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    profile_name: str
    description: Optional[str] = None
    
    # Nested fields
    demographics: Demographics = Field(default_factory=Demographics)
    device_preferences: DevicePreferences = Field(default_factory=DevicePreferences)
    app_usage: AppUsage = Field(default_factory=AppUsage)
    rtb_specifics: RtbSpecifics = Field(default_factory=RtbSpecifics)
    behavioral_patterns: BehavioralPatterns = Field(default_factory=BehavioralPatterns)
    location_data: LocationData = Field(default_factory=LocationData)
    technical_details: TechnicalDetails = Field(default_factory=TechnicalDetails)

    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda dt: dt.isoformat()
        }

class UserProfileCreate(UserProfile):
    id: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class UserProfileUpdate(BaseModel):
    profile_name: Optional[str] = None
    description: Optional[str] = None
    demographics: Optional[Demographics] = None
    device_preferences: Optional[DevicePreferences] = None
    app_usage: Optional[AppUsage] = None
    rtb_specifics: Optional[RtbSpecifics] = None
    behavioral_patterns: Optional[BehavioralPatterns] = None
    location_data: Optional[LocationData] = None
    technical_details: Optional[TechnicalDetails] = None
    updated_at: Optional[datetime] = None 