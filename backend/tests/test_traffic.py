import pytest
import json
import os
from datetime import datetime, timedelta
from app import create_app
from app.api.traffic import TRAFFIC_DATA_DIR

@pytest.fixture
def app():
    app = create_app()
    app.config['TESTING'] = True
    return app

@pytest.fixture
def client(app):
    return app.test_client()

@pytest.fixture
def test_campaign_data():
    return {
        "campaign_id": "test_campaign_1",
        "target_url": "https://example.com",
        "requests_per_minute": 10,
        "duration_minutes": 1,
        "geo_locations": ["United States"],
        "rtb_config": {
            "device_brand": "samsung",
            "device_models": ["Galaxy S24"],
            "ad_formats": ["banner"],
            "app_categories": ["IAB9"],
            "generate_adid": True,
            "simulate_bid_requests": True
        },
        "config": {
            "randomize_timing": True,
            "follow_redirects": True,
            "simulate_browsing": False,
            "enable_logging": True,
            "log_level": "info",
            "log_format": "csv"
        }
    }

def test_generate_traffic_success(client, test_campaign_data):
    """Test successful traffic generation"""
    response = client.post('/api/traffic/generate',
                          data=json.dumps(test_campaign_data),
                          content_type='application/json')
    
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['success'] is True
    assert 'campaign_id' in data['data']
    assert data['data']['campaign_id'] == test_campaign_data['campaign_id']
    assert 'status' in data['data']
    assert data['data']['status'] == 'running'

def test_generate_traffic_missing_fields(client):
    """Test traffic generation with missing required fields"""
    response = client.post('/api/traffic/generate',
                          data=json.dumps({}),
                          content_type='application/json')
    
    assert response.status_code == 400
    data = json.loads(response.data)
    assert data['success'] is False
    assert 'Missing required fields' in data['message']

def test_generate_traffic_invalid_config(client, test_campaign_data):
    """Test traffic generation with invalid configuration"""
    test_campaign_data['requests_per_minute'] = 0
    response = client.post('/api/traffic/generate',
                          data=json.dumps(test_campaign_data),
                          content_type='application/json')
    
    assert response.status_code == 400
    data = json.loads(response.data)
    assert data['success'] is False
    assert 'Requests per minute must be greater than 0' in data['message']

def test_get_campaign_traffic(client, test_campaign_data):
    """Test getting campaign traffic data"""
    # First generate some traffic
    client.post('/api/traffic/generate',
                data=json.dumps(test_campaign_data),
                content_type='application/json')
    
    # Wait a bit for traffic to be generated
    import time
    time.sleep(2)
    
    # Get the traffic data
    response = client.get(f'/api/traffic/generated/{test_campaign_data["campaign_id"]}')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['success'] is True
    assert isinstance(data['data'], list)

def test_get_campaign_stats(client, test_campaign_data):
    """Test getting campaign statistics"""
    # First generate some traffic
    client.post('/api/traffic/generate',
                data=json.dumps(test_campaign_data),
                content_type='application/json')
    
    # Wait a bit for traffic to be generated
    import time
    time.sleep(2)
    
    # Get the stats
    response = client.get(f'/api/traffic/stats/{test_campaign_data["campaign_id"]}')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['success'] is True
    assert 'total_requests' in data['data']
    assert 'successful_requests' in data['data']
    assert 'success_rate' in data['data']

def test_stop_traffic_generation(client, test_campaign_data):
    """Test stopping traffic generation"""
    # First start traffic generation
    client.post('/api/traffic/generate',
                data=json.dumps(test_campaign_data),
                content_type='application/json')
    
    # Stop the traffic generation
    response = client.post(f'/api/traffic/stop/{test_campaign_data["campaign_id"]}')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['success'] is True
    assert 'message' in data
    assert 'Traffic generation stopped' in data['message']

def test_health_check(client):
    """Test health check endpoint"""
    response = client.get('/api/traffic/health')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['success'] is True
    assert data['status'] == 'healthy'

def test_cleanup_after_tests(client, test_campaign_data):
    """Clean up test files after tests"""
    campaign_file = os.path.join(TRAFFIC_DATA_DIR, f'{test_campaign_data["campaign_id"]}.json')
    status_file = os.path.join(TRAFFIC_DATA_DIR, f'{test_campaign_data["campaign_id"]}_status.json')
    
    if os.path.exists(campaign_file):
        os.remove(campaign_file)
    if os.path.exists(status_file):
        os.remove(status_file) 