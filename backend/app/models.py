from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class UserProfile(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    profile_name: str
    description: Optional[str] = None
    age_range: Optional[str] = None
    gender: Optional[str] = None
    interests: List[str] = Field(default_factory=list)
    demographics: Optional[dict] = Field(default_factory=dict)
    browsing_history: Optional[List[str]] = Field(default_factory=list)
    search_queries: Optional[List[str]] = Field(default_factory=list)
    purchase_history: Optional[List[dict]] = Field(default_factory=list)
    location_data: Optional[str] = None
    device_type: Optional[str] = None
    os: Optional[str] = None
    browser: Optional[str] = None
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
    age_range: Optional[str] = None
    gender: Optional[str] = None
    interests: Optional[List[str]] = None
    demographics: Optional[dict] = None
    browsing_history: Optional[List[str]] = None
    search_queries: Optional[List[str]] = None
    purchase_history: Optional[List[dict]] = None
    location_data: Optional[str] = None
    device_type: Optional[str] = None
    os: Optional[str] = None
    browser: Optional[str] = None
    updated_at: Optional[datetime] = None 