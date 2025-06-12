from fastapi import APIRouter, HTTPException, status
from typing import List, Optional, Dict
# from bson import ObjectId # Commented out ObjectId import
from datetime import datetime

# from app.database import get_database # Commented out database import
from app.models import UserProfile, UserProfileCreate, UserProfileUpdate

router = APIRouter()

# In-memory storage for user profiles (temporarily for testing)
profiles_db: Dict[str, UserProfile] = {}

@router.post("/", response_model=UserProfile, status_code=status.HTTP_201_CREATED)
async def create_profile(profile: UserProfileCreate):
    # db = get_database() # Commented out database access
    profile_id = str(len(profiles_db) + 1) # Generate a simple ID
    new_profile = UserProfile(
        id=profile_id,
        **profile.model_dump(exclude_none=True),
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    profiles_db[profile_id] = new_profile
    return new_profile

@router.get("/", response_model=List[UserProfile])
async def list_profiles():
    # db = get_database() # Commented out database access
    # profiles = [] # Commented out database query
    # async for profile in db["user_profiles"].find(): # Commented out database query
    #     profiles.append(UserProfile(**profile)) # Commented out database query
    return list(profiles_db.values())

@router.get("/{profile_id}", response_model=UserProfile)
async def get_profile(profile_id: str):
    # db = get_database() # Commented out database access
    # if not ObjectId.is_valid(profile_id): # Commented out ObjectId check
    #     raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid ObjectId format") # Commented out ObjectId check
    # profile = await db["user_profiles"].find_one({"_id": ObjectId(profile_id)}) # Commented out database query
    if profile_id not in profiles_db: # In-memory check
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    return profiles_db[profile_id]

@router.put("/{profile_id}", response_model=UserProfile)
async def update_profile(profile_id: str, profile_update: UserProfileUpdate):
    # db = get_database() # Commented out database access
    # if not ObjectId.is_valid(profile_id): # Commented out ObjectId check
    #     raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid ObjectId format") # Commented out ObjectId check

    # update_data = profile_update.model_dump(by_alias=True, exclude_none=True) # Commented out database update data
    # update_data["updated_at"] = datetime.now() # Commented out database update time

    # if len(update_data) >= 1: # Commented out database update condition
    #     result = await db["user_profiles"].update_one( # Commented out database update
    #         {"_id": ObjectId(profile_id)}, # Commented out database update
    #         {"$set": update_data} # Commented out database update
    #     ) # Commented out database update
    #     if result.modified_count == 1: # Commented out database update result
    #         updated_profile = await db["user_profiles"].find_one({"_id": ObjectId(profile_id)}) # Commented out database update result
    #         if updated_profile: # Commented out database update result
    #             return UserProfile(**updated_profile) # Commented out database update result
    
    # existing_profile = await db["user_profiles"].find_one({"_id": ObjectId(profile_id)}) # Commented out database existence check
    # if existing_profile: # Commented out database existence check
    #     return UserProfile(**existing_profile) # Return existing data if no update occurred # Commented out database existence check
    
    if profile_id not in profiles_db: # In-memory check
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    
    current_profile = profiles_db[profile_id]
    update_data = profile_update.model_dump(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(current_profile, key, value)
        
    current_profile.updated_at = datetime.utcnow()
    profiles_db[profile_id] = current_profile

    return current_profile

@router.delete("/{profile_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_profile(profile_id: str):
    # db = get_database() # Commented out database access
    # if not ObjectId.is_valid(profile_id): # Commented out ObjectId check
    #     raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid ObjectId format") # Commented out ObjectId check
    # delete_result = await db["user_profiles"].delete_one({"_id": ObjectId(profile_id)}) # Commented out database delete
    # if delete_result.deleted_count == 1: # Commented out database delete result
    #     return # No content # Commented out database delete result
    if profile_id not in profiles_db: # In-memory check
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")
    
    del profiles_db[profile_id]
    return # No content 