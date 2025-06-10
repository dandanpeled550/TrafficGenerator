from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

router = APIRouter()

class SessionBase(BaseModel):
    name: str
    target_url: str
    requests_per_minute: int = 10
    duration_minutes: Optional[int] = 60
    geo_locations: List[str] = ["United States"]
    rtb_config: Optional[Dict[str, Any]] = None
    config: Optional[Dict[str, Any]] = None
    user_profile_ids: List[str] = []

class SessionCreate(SessionBase):
    pass

class SessionUpdate(SessionBase):
    status: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    total_requests: Optional[int] = None
    successful_requests: Optional[int] = None
    last_activity_time: Optional[datetime] = None

class Session(SessionBase):
    id: str
    status: str
    created_at: datetime
    updated_at: datetime
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    total_requests: int = 0
    successful_requests: int = 0
    last_activity_time: Optional[datetime] = None

    class Config:
        from_attributes = True

# In-memory storage for sessions (replace with database in production)
sessions: Dict[str, Session] = {}

@router.post("/", response_model=Session)
async def create_session(session: SessionCreate):
    """Create a new traffic session"""
    session_id = f"session_{len(sessions) + 1}"
    new_session = Session(
        id=session_id,
        **session.dict(),
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
    update_data = session_update.dict(exclude_unset=True)
    
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