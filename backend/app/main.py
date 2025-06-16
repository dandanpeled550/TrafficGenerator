from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import logging
from logging.handlers import RotatingFileHandler
from dotenv import load_dotenv
from app.api import traffic, sessions, profiles

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create logs directory if it doesn't exist
logs_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'logs')
os.makedirs(logs_dir, exist_ok=True)

# Set up file handler
file_handler = RotatingFileHandler(
    os.path.join(logs_dir, 'app.log'),
    maxBytes=1024 * 1024,  # 1MB
    backupCount=10
)
file_handler.setFormatter(logging.Formatter(
    '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
))
file_handler.setLevel(logging.INFO)
logger.addHandler(file_handler)

app = Flask(__name__)

# Get CORS origins from environment variable
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,https://trafficgenerator-1.onrender.com").split(",")
logger.info(f"Configured CORS origins: {cors_origins}")

# Configure CORS with more detailed options
CORS(app, resources={
    r"/*": {
        "origins": cors_origins,
        "allow_headers": ["Content-Type", "Authorization"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "supports_credentials": True,
        "expose_headers": ["Content-Type", "Authorization"]
    }
})

# Register blueprints
app.register_blueprint(traffic.bp, url_prefix='/api/traffic')
app.register_blueprint(sessions.bp, url_prefix='/api/sessions')
app.register_blueprint(profiles.bp, url_prefix='/api/profiles')

# Add a catch-all route for undefined API endpoints
@app.route('/api/<path:path>')
def catch_all(path):
    logger.warning(f"Undefined API endpoint accessed: /api/{path}")
    return jsonify({
        "error": "Not Found",
        "message": f"API endpoint /api/{path} does not exist"
    }), 404

@app.before_request
def log_request_info():
    logger.info('Headers: %s', request.headers)
    logger.info('Body: %s', request.get_data())

@app.after_request
def log_response_info(response):
    logger.info('Response: %s', response.get_data())
    return response

@app.route("/")
def root():
    logger.info("Root endpoint accessed")
    return jsonify({
        "message": "Traffic Generator API is running",
        "version": "1.0.0",
        "environment": os.getenv("ENVIRONMENT", "development"),
        "cors_origins": cors_origins
    })

@app.route("/health")
def health_check():
    """Health check endpoint for monitoring"""
    logger.info("Health check endpoint accessed")
    return jsonify({
        "status": "healthy",
        "version": "1.0.0",
        "cors_origins": cors_origins
    })

@app.route("/api/health")
def api_health_check():
    logger.info("API health check endpoint accessed")
    return jsonify({
        "status": "healthy",
        "version": "1.0.0",
        "cors_origins": cors_origins
    })

# Add error handlers
@app.errorhandler(404)
def not_found(error):
    logger.error("404 error: %s", str(error))
    return jsonify({
        "error": "Not Found",
        "message": str(error)
    }), 404

@app.errorhandler(500)
def internal_error(error):
    logger.error("500 error: %s", str(error))
    return jsonify({
        "error": "Internal Server Error",
        "message": str(error)
    }), 500

@app.errorhandler(Exception)
def handle_exception(error):
    logger.error("Unhandled exception: %s", str(error))
    return jsonify({
        "error": "Unhandled Exception",
        "message": str(error)
    }), 500

if __name__ == '__main__':
    logger.info("Starting Flask application")
    app.run(host='0.0.0.0', port=int(os.getenv('PORT', 8000))) 