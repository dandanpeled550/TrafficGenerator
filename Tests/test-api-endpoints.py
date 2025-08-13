#!/usr/bin/env python3
"""
Test script to verify that the API endpoints work correctly with the new file structure
"""

import json
import sys
import os
import tempfile
import shutil
import time

# Add the backend directory to the path so we can import the traffic module
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

def test_api_endpoints():
    """Test that the API endpoints work correctly with the new file structure"""
    
    print("🧪 Testing API Endpoints with New File Structure...")
    
    try:
        # Import the traffic module
        from app.api.traffic import append_traffic_to_file, get_campaign_traffic, download_campaign_traffic, get_campaign_stats
        
        print("✅ Successfully imported traffic module")
        
        # Create a temporary directory for testing
        temp_dir = tempfile.mkdtemp()
        test_campaign_id = "test_campaign_api"
        test_campaign_dir = os.path.join(temp_dir, test_campaign_id)
        os.makedirs(test_campaign_dir)
        
        print(f"✅ Created temporary test directory: {test_campaign_dir}")
        
        # Mock the TRAFFIC_DATA_DIR
        import app.api.traffic as traffic_module
        original_traffic_dir = traffic_module.TRAFFIC_DATA_DIR
        traffic_module.TRAFFIC_DATA_DIR = temp_dir
        
        try:
            # Test data - multiple requests with RTB data
            test_requests = [
                {
                    "id": "request_001",
                    "timestamp": "2024-01-01T00:00:00Z",
                    "campaign_id": test_campaign_id,
                    "target_url": "https://example.com/1",
                    "rtb_id": "rtb_001",
                    "rtb_imp": [{"id": "1", "banner": {"w": 300, "h": 250}}],
                    "rtb_site": {"id": "site1", "name": "Site 1"},
                    "rtb_device": {"ua": "Mozilla/5.0 (Test 1)"},
                    "rtb_user": {"id": "user_001"},
                    "rtb_auction_type": 2,
                    "rtb_timeout": 120,
                    "rtb_currency": ["USD"],
                    "rtb_data": {
                        "id": "rtb_001",
                        "imp": [{"id": "1", "banner": {"w": 300, "h": 250}}],
                        "site": {"id": "site1", "name": "Site 1"},
                        "device": {"ua": "Mozilla/5.0 (Test 1)"},
                        "user": {"id": "user_001"}
                    },
                    "success": True,
                    "response_time": 150
                },
                {
                    "id": "request_002", 
                    "timestamp": "2024-01-01T00:00:01Z",
                    "campaign_id": test_campaign_id,
                    "target_url": "https://example.com/2",
                    "rtb_id": "rtb_002",
                    "rtb_imp": [{"id": "1", "banner": {"w": 320, "h": 50}}],
                    "rtb_site": {"id": "site2", "name": "Site 2"},
                    "rtb_device": {"ua": "Mozilla/5.0 (Test 2)"},
                    "rtb_user": {"id": "user_002"},
                    "rtb_auction_type": 2,
                    "rtb_timeout": 120,
                    "rtb_currency": ["USD"],
                    "rtb_data": {
                        "id": "rtb_002",
                        "imp": [{"id": "1", "banner": {"w": 320, "h": 50}}],
                        "site": {"id": "site2", "name": "Site 2"},
                        "device": {"ua": "Mozilla/5.0 (Test 2)"},
                        "user": {"id": "user_002"}
                    },
                    "success": True,
                    "response_time": 200
                }
            ]
            
            print(f"✅ Created {len(test_requests)} test requests")
            
            # Test 1: Append requests to file
            print("\n📝 Test 1: Appending requests to file...")
            for i, request in enumerate(test_requests):
                print(f"   📋 Appending request {i+1}: {request['id']}")
                success = append_traffic_to_file(test_campaign_id, request)
                if success:
                    print(f"      ✅ Successfully appended {request['id']}")
                else:
                    print(f"      ❌ Failed to append {request['id']}")
                    return False
            
            # Test 2: Verify file structure
            print("\n🔍 Test 2: Verifying file structure...")
            traffic_file = os.path.join(test_campaign_dir, 'traffic.json')
            if not os.path.exists(traffic_file):
                print("❌ Traffic file was not created")
                return False
            
            with open(traffic_file, 'r') as f:
                file_content = json.load(f)
            
            print(f"✅ File loaded, content type: {type(file_content)}")
            
            if isinstance(file_content, dict):
                print("✅ File content is a dictionary (object)")
                print(f"✅ File contains {len(file_content)} request entities")
                print(f"✅ Request keys: {list(file_content.keys())}")
            else:
                print(f"❌ File content is not a dictionary: {type(file_content)}")
                return False
            
            # Test 3: Test get_campaign_traffic endpoint
            print("\n🌐 Test 3: Testing get_campaign_traffic endpoint...")
            
            # Mock Flask request context
            from flask import Flask
            app = Flask(__name__)
            with app.test_request_context():
                try:
                    response = get_campaign_traffic(test_campaign_id)
                    response_data = response.get_json()
                    
                    if response_data.get('success'):
                        print("✅ get_campaign_traffic endpoint returned success")
                        print(f"   - Total requests: {response_data['metadata']['total_requests']}")
                        print(f"   - Successful requests: {response_data['metadata']['successful_requests']}")
                        
                        # Check that each request is a separate entity
                        request_entities = [k for k, v in response_data.items() 
                                          if k not in ['success', 'metadata'] and isinstance(v, dict)]
                        
                        if len(request_entities) == len(test_requests):
                            print(f"   - ✅ All {len(request_entities)} requests are separate entities")
                        else:
                            print(f"   - ❌ Expected {len(test_requests)} request entities, found {len(request_entities)}")
                            return False
                        
                        # Check RTB structure
                        for req_id in request_entities:
                            req_data = response_data[req_id]
                            if req_data.get('rtb_id'):
                                print(f"   - ✅ {req_id} has RTB ID: {req_data['rtb_id']}")
                            else:
                                print(f"   - ❌ {req_id} missing RTB ID")
                                return False
                    else:
                        print(f"❌ get_campaign_traffic endpoint failed: {response_data.get('message')}")
                        return False
                        
                except Exception as e:
                    print(f"❌ get_campaign_traffic endpoint error: {e}")
                    return False
            
            # Test 4: Test download_campaign_traffic endpoint
            print("\n📥 Test 4: Testing download_campaign_traffic endpoint...")
            
            with app.test_request_context():
                try:
                    response = download_campaign_traffic(test_campaign_id)
                    response_data = response.get_json()
                    
                    if response_data.get('success'):
                        print("✅ download_campaign_traffic endpoint returned success")
                        download_data = response_data['data']
                        print(f"   - Campaign ID: {download_data['campaign_id']}")
                        print(f"   - Total requests: {download_data['total_requests']}")
                        print(f"   - Filename: {response_data['filename']}")
                        
                        # Check that traffic_data contains all requests
                        traffic_data = download_data['traffic_data']
                        if len(traffic_data) == len(test_requests):
                            print(f"   - ✅ Download contains all {len(traffic_data)} requests")
                        else:
                            print(f"   - ❌ Download missing requests: expected {len(test_requests)}, got {len(traffic_data)}")
                            return False
                    else:
                        print(f"❌ download_campaign_traffic endpoint failed: {response_data.get('message')}")
                        return False
                        
                except Exception as e:
                    print(f"❌ download_campaign_traffic endpoint error: {e}")
                    return False
            
            print("\n🎉 All API endpoint tests passed!")
            print("\n📋 Summary:")
            print(f"   - File structure: ✅ Object-based with {len(file_content)} requests")
            print(f"   - get_campaign_traffic: ✅ Returns data with separate entities")
            print(f"   - download_campaign_traffic: ✅ Downloads complete data")
            print(f"   - RTB structure: ✅ Each request has separate RTB fields")
            
            return True
            
        finally:
            # Clean up
            traffic_module.TRAFFIC_DATA_DIR = original_traffic_dir
            shutil.rmtree(temp_dir)
            print(f"🧹 Cleaned up temporary directory: {temp_dir}")
        
    except ImportError as e:
        print(f"❌ Failed to import traffic module: {e}")
        print("   Make sure you're running this from the Tests directory")
        return False
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_api_endpoints()
    sys.exit(0 if success else 1) 