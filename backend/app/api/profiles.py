from fastapi import APIRouter, HTTPException, status
from typing import List, Optional
from bson import ObjectId
from datetime import datetime

from app.models import UserProfile, UserProfileCreate, UserProfileUpdate
from app.database import get_database

router = APIRouter()

@router.post("/", response_model=UserProfile, status_code=status.HTTP_201_CREATED)
async def create_profile(profile: UserProfileCreate):
    db = get_database()
    profile_dict = profile.model_dump(by_alias=True, exclude_none=True)
    profile_dict["created_at"] = datetime.now()
    profile_dict["updated_at"] = datetime.now()
    result = await db["user_profiles"].insert_one(profile_dict)
    created_profile = await db["user_profiles"].find_one({"_id": result.inserted_id})
    if created_profile:
        return UserProfile(**created_profile)
    raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create profile")

@router.get("/", response_model=List[UserProfile])
async def list_profiles():
    db = get_database()
    profiles = []
    async for profile in db["user_profiles"].find():
        profiles.append(UserProfile(**profile))
    return profiles

@router.get("/{profile_id}", response_model=UserProfile)
async def get_profile(profile_id: str):
    db = get_database()
    if not ObjectId.is_valid(profile_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid ObjectId format")
    profile = await db["user_profiles"].find_one({"_id": ObjectId(profile_id)})
    if profile:
        return UserProfile(**profile)
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")

@router.put("/{profile_id}", response_model=UserProfile)
async def update_profile(profile_id: str, profile_update: UserProfileUpdate):
    db = get_database()
    if not ObjectId.is_valid(profile_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid ObjectId format")

    update_data = profile_update.model_dump(by_alias=True, exclude_none=True)
    update_data["updated_at"] = datetime.now()

    if len(update_data) >= 1:
        result = await db["user_profiles"].update_one(
            {"_id": ObjectId(profile_id)},
            {"$set": update_data}
        )
        if result.modified_count == 1:
            updated_profile = await db["user_profiles"].find_one({"_id": ObjectId(profile_id)})
            if updated_profile:
                return UserProfile(**updated_profile)
    
    existing_profile = await db["user_profiles"].find_one({"_id": ObjectId(profile_id)})
    if existing_profile:
        return UserProfile(**existing_profile) # Return existing data if no update occurred
    
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found")

@router.delete("/{profile_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_profile(profile_id: str):
    db = get_database()
    if not ObjectId.is_valid(profile_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid ObjectId format")
    delete_result = await db["user_profiles"].delete_one({"_id": ObjectId(profile_id)})
    if delete_result.deleted_count == 1:
        return # No content
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found") 