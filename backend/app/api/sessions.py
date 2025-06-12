from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from bson import ObjectId

from app.database import get_database # Import get_database

router = APIRouter()

class SessionBase(BaseModel):
    name: str
    target_url: str
    requests_per_minute: int = 10
    duration_minutes: Optional[int] = 60
    geo_locations: List[str] = Field(default_factory=list)
    rtb_config: Optional[Dict[str, Any]] = Field(default_factory=dict)
    config: Optional[Dict[str, Any]] = Field(default_factory=dict)
    user_profile_ids: List[str] = Field(default_factory=list)
    profile_user_counts: Optional[Dict[str, int]] = Field(default_factory=dict)
    total_profile_users: int = 0
    log_file_path: Optional[str] = None
    log_level: Optional[str] = None
    log_format: Optional[str] = None
    user_agents: List[str] = Field(default_factory=list)
    referrers: List[str] = Field(default_factory=list)

class SessionCreate(SessionBase):
    pass

class SessionUpdate(SessionBase):
    status: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    total_requests: Optional[int] = None
    successful_requests: Optional[int] = None
    last_activity_time: Optional[datetime] = None
    progress_percentage: Optional[int] = None

class Session(SessionBase):
    id: Optional[str] = Field(None, alias="_id") # Make id optional and use alias
    status: str
    created_at: datetime
    updated_at: datetime
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    total_requests: int = 0
    successful_requests: int = 0
    last_activity_time: Optional[datetime] = None
    progress_percentage: int = 0

    class Config:
        populate_by_name = True
        json_encoders = {
            datetime: lambda dt: dt.isoformat()
        }

@router.post("/", response_model=Session, status_code=status.HTTP_201_CREATED)
async def create_session(session: SessionCreate):
    db = get_database()
    session_dict = session.model_dump(by_alias=True, exclude_none=True) # Use model_dump for Pydantic v2
    session_dict["status"] = "draft"
    session_dict["created_at"] = datetime.utcnow()
    session_dict["updated_at"] = datetime.utcnow()
    
    result = await db["sessions"].insert_one(session_dict)
    created_session = await db["sessions"].find_one({"_id": result.inserted_id})
    if created_session:
        return Session(**created_session)
    raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create session")

@router.get("/", response_model=List[Session])
async def list_sessions():
    db = get_database()
    sessions = []
    async for session in db["sessions"].find():
        sessions.append(Session(**session))
    return sessions

@router.get("/{session_id}", response_model=Session)
async def get_session(session_id: str):
    db = get_database()
    if not ObjectId.is_valid(session_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid session ID format")
    session = await db["sessions"].find_one({"_id": ObjectId(session_id)})
    if session:
        return Session(**session)
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

@router.put("/{session_id}", response_model=Session)
async def update_session(session_id: str, session_update: SessionUpdate):
    db = get_database()
    if not ObjectId.is_valid(session_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid session ID format")

    update_data = session_update.model_dump(by_alias=True, exclude_none=True)
    update_data["updated_at"] = datetime.utcnow()

    if len(update_data) >= 1:
        result = await db["sessions"].update_one(
            {"_id": ObjectId(session_id)},
            {"$set": update_data}
        )
        if result.modified_count == 1:
            updated_session = await db["sessions"].find_one({"_id": ObjectId(session_id)})
            if updated_session:
                return Session(**updated_session)
    
    existing_session = await db["sessions"].find_one({"_id": ObjectId(session_id)})
    if existing_session:
        return Session(**existing_session) # Return existing data if no update occurred

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found or no changes made")

@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(session_id: str):
    db = get_database()
    if not ObjectId.is_valid(session_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid session ID format")
    delete_result = await db["sessions"].delete_one({"_id": ObjectId(session_id)})
    if delete_result.deleted_count == 1:
        return # No content
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found") 