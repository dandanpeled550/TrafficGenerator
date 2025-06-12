from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
# from bson import ObjectId # Commented out ObjectId import

# from app.database import get_database # Commented out database import

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
    id: str # Revert to str for in-memory
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
        # populate_by_name = True # Not needed for in-memory
        # json_encoders = { # Not needed for in-memory
        #     datetime: lambda dt: dt.isoformat()
        # }
        from_attributes = True # Restore from_attributes for Pydantic v2

# In-memory storage for sessions (temporarily for testing)
sessions: Dict[str, Session] = {}

@router.post("/", response_model=Session)
async def create_session(session: SessionCreate):
    """Create a new traffic session"""
    session_id = f"session_{len(sessions) + 1}"
    new_session = Session(
        id=session_id,
        **session.model_dump(), # Use model_dump for Pydantic v2
        status="draft",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    sessions[session_id] = new_session
    return new_session

@router.get("/", response_model=List[Session])
async def list_sessions():
    """List all traffic sessions"""
    return list(sessions.values())

@router.get("/{session_id}", response_model=Session)
async def get_session(session_id: str):
    """Get a specific traffic session"""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    return sessions[session_id]

@router.put("/{session_id}", response_model=Session)
async def update_session(session_id: str, session_update: SessionUpdate):
    """Update a traffic session"""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    current_session = sessions[session_id]
    update_data = session_update.model_dump(exclude_unset=True) # Use model_dump for Pydantic v2
    
    for key, value in update_data.items():
        setattr(current_session, key, value)
    
    current_session.updated_at = datetime.utcnow()
    sessions[session_id] = current_session
    
    return current_session

@router.delete("/{session_id}")
async def delete_session(session_id: str):
    """Delete a traffic session"""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    del sessions[session_id]
    return {"message": "Session deleted successfully"} 