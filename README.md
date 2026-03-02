# Traffic Generator Platform

A sophisticated web application for simulating and generating realistic ad traffic for Real-Time Bidding (RTB) systems. This platform enables users to create campaigns, configure user profiles, and generate synthetic traffic data that mimics real user behavior patterns for testing and development purposes.

🔗 **Live Demo**: [https://trafficgenerator-1.onrender.com](https://trafficgenerator-1.onrender.com)

## ✨ Key Features

- 🎯 **Campaign Management**: Create and manage traffic generation campaigns with detailed configuration
- 👥 **User Profile System**: Design synthetic user personas with demographics, device preferences, and behavioral patterns  
- 🔄 **Real-Time Bidding Simulation**: Generate OpenRTB-compatible bid requests for ad tech testing
- 📊 **Live Analytics**: Real-time dashboard with traffic monitoring, charts, and campaign statistics
- 🧵 **Multi-threaded Generation**: Concurrent traffic generation with configurable request rates
- 🌍 **Geographic Targeting**: Location-based traffic simulation with IP geo-mapping
- 🤖 **AI-Powered Referrers**: OpenAI integration for generating realistic referrer URLs

## 🏗️ Architecture

### Backend (Python Flask)
- **REST API** with comprehensive traffic generation engine
- **Multi-threading** for concurrent campaign execution
- **File-based persistence** with JSON data storage
- **RTB simulation** with realistic device fingerprinting
- **Comprehensive logging** and monitoring

### Frontend (React + Vite)
- **Modern React SPA** with TypeScript support
- **Tailwind CSS + Radix UI** for beautiful, accessible components
- **Real-time charts** with Recharts integration
- **Responsive design** optimized for desktop and mobile

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Node.js 18+
- OpenAI API key (optional, for AI features)

### Local Development

**Backend Setup:**
```bash
cd backend
pip install -r requirements.txt
export FLASK_APP=app.main
export OPENAI_API_KEY=your_openai_key  # Optional
flask run
```

**Frontend Setup:**
```bash
cd frontend  
npm install
export VITE_API_URL=http://localhost:5000  # Backend URL
npm run dev
```

### Production Deployment
The application is configured for Render.com deployment with included `render.yaml`.

## 📚 Documentation

- **[Complete Project Summary](PROJECT_SUMMARY.md)** - Comprehensive technical overview
- **[API Documentation](backend/API_DOCUMENTATION.md)** - Complete REST API reference
- **[Deployment Guide](DEPLOYMENT_CHECKLIST.md)** - Production deployment checklist

## 🛠️ Technology Stack

### Backend Technologies
- Flask 3.0.2 (Web framework)
- Threading (Concurrent traffic generation) 
- Faker (Synthetic data generation)
- OpenAI API (AI-powered features)
- SQLAlchemy 2.0+ (Future database integration)

### Frontend Technologies  
- React 18 + Vite (Modern frontend framework)
- Tailwind CSS (Utility-first styling)
- Radix UI (Accessible component primitives)
- Framer Motion (Smooth animations)
- Recharts (Data visualization)

## 🎯 Use Cases

### Ad Tech Testing
- Validate RTB systems with realistic traffic patterns
- Test programmatic advertising integrations
- Simulate complex user journey scenarios

### Performance Testing
- Load test web applications with configurable traffic
- Validate analytics and tracking implementations  
- Stress test ad serving infrastructure

### Development & QA
- Generate synthetic data for testing environments
- Validate campaign tracking and attribution
- Test GDPR/CCPA compliance scenarios

## 📈 Traffic Generation Capabilities

- **Request Rates**: 1-1000 requests per minute
- **Campaign Duration**: Unlimited or time-bound
- **User Profiles**: Complex persona configuration
- **Geographic Simulation**: Multi-region targeting
- **Device Simulation**: Realistic device fingerprints
- **RTB Integration**: OpenRTB 2.5 compatible

## 🔒 Security Features

- CORS configuration for secure cross-origin requests
- Input validation and sanitization
- Comprehensive error handling
- Thread-safe concurrent operations
- Secure environment variable management

## 🤝 Contributing

This is a comprehensive traffic generation platform built for ad tech testing and development. The codebase is well-documented and modular for easy extension.

### Project Structure
```
TrafficGenerator/
├── backend/           # Python Flask API
├── frontend/          # React application  
├── Tests/            # Comprehensive test suite
└── docs/             # Documentation
```

## 📞 Support

For technical questions or feature requests, please review the comprehensive documentation in `PROJECT_SUMMARY.md` and `backend/API_DOCUMENTATION.md`.

---

**Built for Ad Tech Engineers, QA Teams, and Data Scientists**