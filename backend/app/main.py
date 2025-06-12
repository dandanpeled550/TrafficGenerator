from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import traffic, sessions, profiles
import os
from dotenv import load_dotenv
# from app.database import connect_to_mongo, close_mongo_connection # Commented out database imports

# Load environment variables
load_dotenv()

app = FastAPI(
    title="Traffic Generator API",
    description="API for generating and managing traffic simulation sessions",
    version="1.0.0"
)

# Database connection events (Commented out for in-memory testing)
# @app.on_event("startup")
# async def startup_db_client():
#     await connect_to_mongo()

# @app.on_event("shutdown")
# async def shutdown_db_client():
#     await close_mongo_connection()

# Get CORS origins from environment variable
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(traffic.router, prefix="/api/traffic", tags=["traffic"])
app.include_router(sessions.router, prefix="/api/sessions", tags=["sessions"])
app.include_router(profiles.router, prefix="/api/profiles", tags=["profiles"])

@app.get("/")
async def root():
    return {
        "message": "Traffic Generator API is running",
        "version": "1.0.0",
        "environment": os.getenv("ENVIRONMENT", "development")
    }

@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring"""
    return {
        "status": "healthy",
        "version": "1.0.0"
    } 