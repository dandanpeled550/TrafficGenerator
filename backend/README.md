# Traffic Generator Backend

This is the Python backend for the Traffic Generator application. It provides APIs for generating and managing traffic simulation sessions.

## Local Development Setup

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Create a .env file:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Run the development server:
```bash
uvicorn app.main:app --reload
```

The API will be available at http://localhost:8000

## Deployment to Render

1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Configure the service:
   - Name: traffic-generator-api
   - Environment: Python
   - Build Command: `cd backend && pip install -r requirements.txt`
   - Start Command: `cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - Add environment variables from .env.example

4. Deploy!

## API Documentation

Once the server is running, you can access the API documentation at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Main Features

1. Traffic Generation
   - Generate simulated traffic with configurable parameters
   - Support for RTB (Real-Time Bidding) traffic
   - Customizable user profiles and geo-locations

2. Session Management
   - Create and manage traffic sessions
   - Monitor session status and statistics
   - Configure session parameters

3. User Profiles
   - Manage user profiles for traffic simulation
   - Customize user behavior patterns

4. Logging
   - Track traffic generation logs
   - Monitor performance metrics

## Development

The backend is built using:
- FastAPI for the web framework
- Pydantic for data validation
- SQLAlchemy for database operations (to be implemented)
- AsyncIO for asynchronous operations

## Project Structure

```
backend/
├── app/
│   ├── api/
│   │   ├── traffic.py      # Traffic generation endpoints
│   │   ├── sessions.py     # Session management endpoints
│   │   ├── profiles.py     # User profile endpoints
│   │   └── logs.py         # Logging endpoints
│   ├── models/             # Database models
│   ├── utils/              # Utility functions
│   └── main.py            # Main application file
├── requirements.txt       # Python dependencies
├── Procfile              # Render deployment configuration
└── README.md             # This file
```

## Environment Variables

Required environment variables:
- `ENVIRONMENT`: development/production
- `CORS_ORIGINS`: Comma-separated list of allowed origins
- `PORT`: Port to run the server on (set by Render)
- `SECRET_KEY`: Secret key for JWT tokens
- `ALGORITHM`: Algorithm for JWT tokens
- `ACCESS_TOKEN_EXPIRE_MINUTES`: JWT token expiration time

## Health Check

The API includes a health check endpoint at `/health` that returns the current status of the service. This is useful for monitoring and load balancers 