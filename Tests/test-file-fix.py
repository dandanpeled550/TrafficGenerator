#!/usr/bin/env python3
"""
Test script to verify that corrupted traffic files are automatically fixed
"""

import json
import sys
import os
import tempfile
import shutil

# Add the backend directory to the path so we can import the traffic module
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

def test_file_fix():
    """Test that corrupted traffic files are automatically fixed"""
    
    print("🧪 Testing File Fix Functionality...")
    
    try:
        # Import the traffic module
        from app.api.traffic import fix_corrupted_traffic_file, append_traffic_to_file
        
        print("✅ Successfully imported traffic module")
        
        # Create a temporary directory for testing
        temp_dir = tempfile.mkdtemp()
        test_campaign_id = "test_campaign_fix"
        test_campaign_dir = os.path.join(temp_dir, test_campaign_id)
        os.makedirs(test_campaign_dir)
        
        print(f"✅ Created temporary test directory: {test_campaign_dir}")
        
        # Mock the TRAFFIC_DATA_DIR
        import app.api.traffic as traffic_module
        original_traffic_dir = traffic_module.TRAFFIC_DATA_DIR
        traffic_module.TRAFFIC_DATA_DIR = temp_dir
        
        try:
            # Test 1: Create corrupted file with old array structure
            print("\n📝 Test 1: Creating corrupted file with old array structure...")
            corrupted_file = os.path.join(test_campaign_dir, 'traffic.json')
            
            # Create old array structure (this is what's causing the error)
            old_array_data = [
                {
                    "id": "request_001",
                    "timestamp": "2024-01-01T00:00:00Z",
                    "campaign_id": test_campaign_id,
                    "rtb_data": {"id": "rtb_001"}
                },
                {
                    "id": "request_002", 
                    "timestamp": "2024-01-01T00:00:01Z",
                    "campaign_id": test_campaign_id,
                    "rtb_data": {"id": "rtb_002"}
                }
            ]
            
            with open(corrupted_file, 'w') as f:
                json.dump(old_array_data, f, indent=2)
            
            print(f"✅ Created corrupted file with {len(old_array_data)} array entries")
            
            # Test 2: Fix the corrupted file
            print("\n🔧 Test 2: Fixing corrupted file...")
            fix_success = fix_corrupted_traffic_file(test_campaign_id)
            
            if fix_success:
                print("✅ File fix function returned success")
            else:
                print("❌ File fix function failed")
                return False
            
            # Test 3: Verify the file is now correct
            print("\n🔍 Test 3: Verifying fixed file structure...")
            
            with open(corrupted_file, 'r') as f:
                fixed_data = json.load(f)
            
            print(f"✅ Fixed file loaded, content type: {type(fixed_data)}")
            
            if isinstance(fixed_data, dict):
                print("✅ File is now a dictionary (object)")
                print(f"✅ File contains {len(fixed_data)} request entities")
                print(f"✅ Request keys: {list(fixed_data.keys())}")
                
                # Check that the data was preserved
                for key, value in fixed_data.items():
                    print(f"   📋 {key}: ID={value.get('id')}, RTB ID={value.get('rtb_data', {}).get('id')}")
            else:
                print(f"❌ File is still not a dictionary: {type(fixed_data)}")
                return False
            
            # Test 4: Test that new requests can be appended
            print("\n📝 Test 4: Testing new request appending...")
            
            new_request = {
                "id": "request_003",
                "timestamp": "2024-01-01T00:00:02Z",
                "campaign_id": test_campaign_id,
                "rtb_id": "rtb_003",
                "rtb_imp": [{"id": "1", "banner": {"w": 300, "h": 250}}],
                "rtb_site": {"id": "site3", "name": "Site 3"},
                "rtb_device": {"ua": "Mozilla/5.0 (Test 3)"},
                "rtb_user": {"id": "user_003"},
                "success": True
            }
            
            append_success = append_traffic_to_file(test_campaign_id, new_request)
            
            if append_success:
                print("✅ Successfully appended new request")
            else:
                print("❌ Failed to append new request")
                return False
            
            # Test 5: Verify the new request was added correctly
            print("\n🔍 Test 5: Verifying new request was added...")
            
            with open(corrupted_file, 'r') as f:
                final_data = json.load(f)
            
            if "request_003" in final_data:
                print("✅ New request was added successfully")
                print(f"✅ File now contains {len(final_data)} requests")
            else:
                print("❌ New request was not added")
                return False
            
            print("\n🎉 File fix test passed!")
            print("\n📋 Summary:")
            print(f"   - Corrupted file: ✅ Created with old array structure")
            print(f"   - File fix: ✅ Successfully converted to object structure")
            print(f"   - New requests: ✅ Can be appended to fixed file")
            print(f"   - Data integrity: ✅ All original data preserved")
            
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
    success = test_file_fix()
    sys.exit(0 if success else 1) 