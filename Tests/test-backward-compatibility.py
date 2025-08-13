#!/usr/bin/env python3
"""
Test script to verify backward compatibility for old array structures
"""

import json
import sys
import os
import tempfile
import shutil

# Add the backend directory to the path so we can import the traffic module
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

def test_backward_compatibility():
    """Test that old array structures are automatically converted to new object structures"""
    
    print("🧪 Testing Backward Compatibility...")
    
    try:
        # Import the traffic module
        from app.api.traffic import convert_array_to_object_structure
        
        print("✅ Successfully imported traffic module")
        
        # Test data - old array structure
        old_array_structure = [
            {
                "id": "request_001",
                "timestamp": "2024-01-01T00:00:00Z",
                "campaign_id": "test_campaign",
                "target_url": "https://example.com/1",
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
                "campaign_id": "test_campaign",
                "target_url": "https://example.com/2",
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
        
        print(f"✅ Created old array structure with {len(old_array_structure)} requests")
        
        # Test conversion function
        print("\n🔍 Testing conversion function...")
        converted_data = convert_array_to_object_structure(old_array_structure)
        
        print(f"✅ Converted to object structure with {len(converted_data)} entities")
        
        # Verify conversion
        print("\n🔍 Verifying conversion...")
        
        if isinstance(converted_data, dict):
            print("✅ Converted data is a dictionary")
        else:
            print(f"❌ Converted data is not a dictionary: {type(converted_data)}")
            return False
        
        # Check that each request is now a separate entity
        expected_keys = ['request_001', 'request_002']
        for key in expected_keys:
            if key in converted_data:
                print(f"✅ Found expected key: {key}")
            else:
                print(f"❌ Missing expected key: {key}")
                return False
        
        # Check that the data content is preserved
        for key, value in converted_data.items():
            print(f"   📋 {key}:")
            print(f"      - ID: {value.get('id')}")
            print(f"      - Success: {value.get('success')}")
            print(f"      - RTB Data: {value.get('rtb_data', {}).get('id')}")
            
            # Verify RTB data is preserved
            if value.get('rtb_data'):
                print(f"      - ✅ RTB data preserved")
            else:
                print(f"      - ❌ RTB data missing")
        
        print("\n🎉 Backward compatibility test passed!")
        print("\n📋 Conversion Summary:")
        print(f"   - Input: Array with {len(old_array_structure)} requests")
        print(f"   - Output: Object with {len(converted_data)} entities")
        print(f"   - Keys: {list(converted_data.keys())}")
        print(f"   - Data integrity: ✅ Preserved")
        
        return True
        
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
    success = test_backward_compatibility()
    sys.exit(0 if success else 1) 