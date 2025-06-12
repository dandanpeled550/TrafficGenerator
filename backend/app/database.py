from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.server_api import ServerApi
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Database: # Renamed from DataBase to Database
    client: AsyncIOMotorClient = None
    db = None

DB = Database() # Renamed from db to DB for clarity

async def connect_to_mongo():
    print("Connecting to MongoDB...")
    MONGO_URI = os.getenv("MONGO_URI")
    if not MONGO_URI:
        print("MONGO_URI environment variable not set. Using default development URI.")
        MONGO_URI = "mongodb://localhost:27017/traffic_generator_db"
        
    try:
        DB.client = AsyncIOMotorClient(MONGO_URI, server_api=ServerApi('1'))
        DB.db = DB.client.get_database() # Get the database instance
        await DB.client.admin.command('ping') # Test connection
        print("Successfully connected to MongoDB!")
    except Exception as e:
        print(f"Could not connect to MongoDB: {e}")
        # Depending on criticality, you might want to re-raise or exit

async def close_mongo_connection():
    print("Closing MongoDB connection...")
    if DB.client:
        DB.client.close()
        print("MongoDB connection closed.")

def get_database():
    return DB.db 