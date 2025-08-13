#!/usr/bin/env python3
"""
Test script to verify the new RTB data structure with separate nodes for each RTB_ID
"""

import json
import sys
import os

# Add the backend directory to the path so we can import the traffic module
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

def test_rtb_structure():
    """Test that the new RTB structure has separate nodes for each RTB_ID"""
    
    print("🧪 Testing RTB Data Structure Restructuring...")
    
    try:
        # Import the traffic module
        from app.api.traffic import generate_rtb_data, generate_traffic_data, TrafficConfig
        
        print("✅ Successfully imported traffic module")
        
        # Test RTB data generation
        print("\n📊 Testing RTB data generation...")
        rtb_config = {
            "banner_w": 300,
            "banner_h": 250,
            "bidfloor": 0.05,
            "bidfloorcur": "USD",
            "site_id": "test_site",
            "site_name": "Test Site",
            "site_domain": "test.com",
            "ua": "Mozilla/5.0 (Test)",
            "ip": "192.168.1.100",
            "user_id": "test_user_123",
            "at": 2,
            "tmax": 150,
            "cur": ["USD", "EUR"]
        }
        
        rtb_data = generate_rtb_data(rtb_config)
        print(f"✅ Generated RTB data with ID: {rtb_data.get('id')}")
        print(f"   - Impressions: {len(rtb_data.get('imp', []))}")
        print(f"   - Site: {rtb_data.get('site', {}).get('name')}")
        print(f"   - Device UA: {rtb_data.get('device', {}).get('ua', '')[:50]}...")
        print(f"   - User ID: {rtb_data.get('user', {}).get('id')}")
        
        # Test traffic data generation with new structure
        print("\n🚀 Testing traffic data generation with new RTB structure...")
        config = TrafficConfig(
            campaign_id="test_campaign_rtb",
            target_url="https://example.com/test",
            requests_per_minute=5,
            duration_minutes=10,
            geo_locations=["United States", "Canada"],
            rtb_config=rtb_config,
            user_profile_ids=[],
            profile_user_counts={},
            total_profile_users=0
        )
        
        traffic_data = generate_traffic_data(config)
        print(f"✅ Generated traffic data with campaign ID: {traffic_data.get('campaign_id')}")
        
        # Check new RTB structure
        print("\n🔍 Checking new RTB structure...")
        
        # Check that RTB_ID is a separate node
        rtb_id = traffic_data.get('rtb_id')
        if rtb_id:
            print(f"✅ RTB_ID is a separate node: {rtb_id}")
        else:
            print("❌ RTB_ID not found as separate node")
            return False
        
        # Check other RTB fields
        rtb_fields = [
            'rtb_imp', 'rtb_site', 'rtb_device', 'rtb_user', 
            'rtb_auction_type', 'rtb_timeout', 'rtb_currency'
        ]
        
        for field in rtb_fields:
            if field in traffic_data:
                print(f"✅ {field} is a separate node")
            else:
                print(f"❌ {field} not found as separate node")
                return False
        
        # Check backward compatibility
        if 'rtb_data' in traffic_data:
            print("✅ Backward compatibility maintained with rtb_data")
        else:
            print("❌ Backward compatibility broken - rtb_data missing")
            return False
        
        # Verify the data matches
        if traffic_data['rtb_id'] == traffic_data['rtb_data']['id']:
            print("✅ RTB_ID matches the ID in legacy rtb_data")
        else:
            print("❌ RTB_ID mismatch with legacy rtb_data")
            return False
        
        print("\n🎉 All tests passed! The new RTB structure is working correctly.")
        print("\n📋 New Structure Summary:")
        print(f"   - rtb_id: {traffic_data['rtb_id']}")
        print(f"   - rtb_imp: {len(traffic_data['rtb_imp'])} impressions")
        print(f"   - rtb_site: {traffic_data['rtb_site']['name']}")
        print(f"   - rtb_device: {traffic_data['rtb_device']['ua'][:30]}...")
        print(f"   - rtb_user: {traffic_data['rtb_user']['id']}")
        print(f"   - rtb_auction_type: {traffic_data['rtb_auction_type']}")
        print(f"   - rtb_timeout: {traffic_data['rtb_timeout']}ms")
        print(f"   - rtb_currency: {traffic_data['rtb_currency']}")
        
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
    success = test_rtb_structure()
    sys.exit(0 if success else 1) 