#!/usr/bin/env python3
"""
Test script to verify the new file structure where each request is saved as a separate entity
"""

import json
import sys
import os
import tempfile
import shutil

# Add the backend directory to the path so we can import the traffic module
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

def test_file_structure():
    """Test that the new file structure saves each request as a separate entity"""
    
    print("🧪 Testing New File Structure...")
    
    try:
        # Import the traffic module
        from app.api.traffic import append_traffic_to_file
        
        print("✅ Successfully imported traffic module")
        
        # Create a temporary directory for testing
        temp_dir = tempfile.mkdtemp()
        test_campaign_id = "test_campaign_file_structure"
        test_campaign_dir = os.path.join(temp_dir, test_campaign_id)
        os.makedirs(test_campaign_dir)
        
        print(f"✅ Created temporary test directory: {test_campaign_dir}")
        
        # Mock the TRAFFIC_DATA_DIR
        import app.api.traffic as traffic_module
        original_traffic_dir = traffic_module.TRAFFIC_DATA_DIR
        traffic_module.TRAFFIC_DATA_DIR = temp_dir
        
        try:
            # Test data - multiple requests
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
                    "success": True,
                    "response_time": 200
                },
                {
                    "id": "request_003",
                    "timestamp": "2024-01-01T00:00:02Z", 
                    "campaign_id": test_campaign_id,
                    "target_url": "https://example.com/3",
                    "rtb_id": "rtb_003",
                    "rtb_imp": [{"id": "1", "banner": {"w": 728, "h": 90}}],
                    "rtb_site": {"id": "site3", "name": "Site 3"},
                    "rtb_device": {"ua": "Mozilla/5.0 (Test 3)"},
                    "rtb_user": {"id": "user_003"},
                    "success": False,
                    "response_time": 100
                }
            ]
            
            print(f"✅ Created {len(test_requests)} test requests")
            
            # Append each request to the file
            for i, request in enumerate(test_requests):
                print(f"📝 Appending request {i+1}: {request['id']}")
                success = append_traffic_to_file(test_campaign_id, request)
                if success:
                    print(f"   ✅ Successfully appended {request['id']}")
                else:
                    print(f"   ❌ Failed to append {request['id']}")
                    return False
            
            # Read the file and verify structure
            traffic_file = os.path.join(test_campaign_dir, 'traffic.json')
            if not os.path.exists(traffic_file):
                print("❌ Traffic file was not created")
                return False
            
            print(f"✅ Traffic file created: {traffic_file}")
            
            with open(traffic_file, 'r') as f:
                file_content = json.load(f)
            
            print(f"✅ File loaded, content type: {type(file_content)}")
            
            # Verify it's an object, not an array
            if isinstance(file_content, dict):
                print("✅ File content is a dictionary (object)")
            else:
                print(f"❌ File content is not a dictionary: {type(file_content)}")
                return False
            
            # Verify each request is a separate entity
            print(f"✅ File contains {len(file_content)} request entities")
            
            for request_id, request_data in file_content.items():
                print(f"   📋 Request: {request_id}")
                print(f"      - ID: {request_data.get('id')}")
                print(f"      - RTB ID: {request_data.get('rtb_id')}")
                print(f"      - Success: {request_data.get('success')}")
                print(f"      - Response Time: {request_data.get('response_time')}ms")
                
                # Verify RTB structure
                if request_data.get('rtb_id'):
                    print(f"      - ✅ RTB ID is separate field: {request_data['rtb_id']}")
                else:
                    print(f"      - ❌ RTB ID missing")
                
                if request_data.get('rtb_imp'):
                    print(f"      - ✅ RTB Impressions is separate field")
                else:
                    print(f"      - ❌ RTB Impressions missing")
                
                if request_data.get('rtb_site'):
                    print(f"      - ✅ RTB Site is separate field")
                else:
                    print(f"      - ❌ RTB Site missing")
                
                if request_data.get('rtb_device'):
                    print(f"      - ✅ RTB Device is separate field")
                else:
                    print(f"      - ❌ RTB Device missing")
                
                if request_data.get('rtb_user'):
                    print(f"      - ✅ RTB User is separate field")
                else:
                    print(f"      - ❌ RTB User missing")
            
            # Verify the structure matches what we expect
            expected_keys = ['request_001', 'request_002', 'request_003']
            for key in expected_keys:
                if key in file_content:
                    print(f"✅ Found expected request key: {key}")
                else:
                    print(f"❌ Missing expected request key: {key}")
                    return False
            
            print("\n🎉 File structure test passed!")
            print("\n📋 File Structure Summary:")
            print(f"   - File type: {type(file_content)}")
            print(f"   - Total requests: {len(file_content)}")
            print(f"   - Request keys: {list(file_content.keys())}")
            print(f"   - Each request is a separate entity with RTB fields")
            
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
    success = test_file_structure()
    sys.exit(0 if success else 1) 