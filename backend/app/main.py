from flask import Flask, jsonify
from flask_cors import CORS
import os
from dotenv import load_dotenv
from app.api import traffic, sessions, profiles

# Load environment variables
load_dotenv()

app = Flask(__name__)

# Get CORS origins from environment variable
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")

# Configure CORS
CORS(app, resources={
    r"/*": {
        "origins": cors_origins,
        "allow_headers": ["*"],
        "methods": ["*"]
    }
})

# Register blueprints
app.register_blueprint(traffic.bp, url_prefix='/api/traffic')
app.register_blueprint(sessions.bp, url_prefix='/api/sessions')
app.register_blueprint(profiles.bp, url_prefix='/api/profiles')

@app.route("/")
def root():
    return jsonify({
        "message": "Traffic Generator API is running",
        "version": "1.0.0",
        "environment": os.getenv("ENVIRONMENT", "development")
    })

@app.route("/health")
def health_check():
    """Health check endpoint for monitoring"""
    return jsonify({
        "status": "healthy",
        "version": "1.0.0"
    })

@app.route("/api/health")
def api_health_check():
    return jsonify({
        "status": "healthy",
        "version": "1.0.0"
    }) 