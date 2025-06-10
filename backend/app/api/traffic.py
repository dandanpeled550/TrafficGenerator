from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import asyncio
import random
import time
from datetime import datetime

router = APIRouter()

class TrafficConfig(BaseModel):
    campaign_id: str
    target_url: str
    requests_per_minute: int = 10
    duration_minutes: Optional[int] = 60
    geo_locations: List[str] = ["United States"]
    rtb_config: Optional[Dict[str, Any]] = None
    config: Optional[Dict[str, Any]] = None
    user_profiles: List[Dict[str, Any]] = []

class TrafficResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None

@router.post("/generate", response_model=TrafficResponse)
async def generate_traffic(config: TrafficConfig):
    try:
        # Validate configuration
        if config.requests_per_minute <= 0:
            raise HTTPException(status_code=400, detail="Requests per minute must be greater than 0")
        
        if config.duration_minutes is not None and config.duration_minutes <= 0:
            raise HTTPException(status_code=400, detail="Duration must be greater than 0")

        # Start traffic generation in background
        asyncio.create_task(generate_traffic_background(config))
        
        return TrafficResponse(
            success=True,
            message="Traffic generation started",
            data={"campaign_id": config.campaign_id}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def generate_traffic_background(config: TrafficConfig):
    """Background task to generate traffic"""
    start_time = time.time()
    request_count = 0
    
    while True:
        # Check if we should stop
        if config.duration_minutes and (time.time() - start_time) > (config.duration_minutes * 60):
            break
            
        # Generate traffic batch
        batch_size = min(config.requests_per_minute, 10)  # Process in smaller batches
        for _ in range(batch_size):
            try:
                # Generate traffic data
                traffic_data = generate_traffic_data(config)
                
                # Simulate request
                await simulate_request(traffic_data)
                
                request_count += 1
                
            except Exception as e:
                print(f"Error generating traffic: {str(e)}")
        
        # Wait for next batch
        await asyncio.sleep(60 / config.requests_per_minute)

def generate_traffic_data(config: TrafficConfig) -> Dict[str, Any]:
    """Generate traffic data based on configuration"""
    return {
        "timestamp": datetime.utcnow().isoformat(),
        "campaign_id": config.campaign_id,
        "target_url": config.target_url,
        "geo_location": random.choice(config.geo_locations),
        "user_agent": random.choice([
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            "Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15"
        ]),
        "rtb_data": generate_rtb_data(config.rtb_config) if config.rtb_config else None
    }

def generate_rtb_data(rtb_config: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """Generate RTB data if RTB configuration is provided"""
    if not rtb_config:
        return None
        
    return {
        "device_brand": rtb_config.get("device_brand", "samsung"),
        "device_model": random.choice(rtb_config.get("device_models", ["Galaxy S24"])),
        "ad_format": random.choice(rtb_config.get("ad_formats", ["banner"])),
        "app_category": random.choice(rtb_config.get("app_categories", ["IAB9"])),
        "adid": generate_adid() if rtb_config.get("generate_adid", True) else None
    }

def generate_adid() -> str:
    """Generate a random advertising ID"""
    return f"{random.randint(10000000, 99999999)}-{random.randint(1000, 9999)}-{random.randint(1000, 9999)}-{random.randint(1000, 9999)}"

async def simulate_request(traffic_data: Dict[str, Any]):
    """Simulate making a request with the generated traffic data"""
    # Here you would typically make an actual HTTP request
    # For now, we'll just simulate it with a small delay
    await asyncio.sleep(random.uniform(0.1, 0.5))
    return True 