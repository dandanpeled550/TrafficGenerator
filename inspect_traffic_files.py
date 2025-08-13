#!/usr/bin/env python3
"""
Simple script to inspect the structure of traffic.json files locally
Run this from your project root directory
"""

import json
import os
import sys
from pathlib import Path

def inspect_traffic_files():
    """Inspect all traffic.json files in the backend directory"""
    
    print("🔍 Inspecting Traffic Files Structure...")
    print("=" * 50)
    
    # Look for traffic files in the backend directory
    backend_dir = Path("backend")
    if not backend_dir.exists():
        print("❌ Backend directory not found. Make sure you're running this from the project root.")
        return
    
    # Find all traffic.json files
    traffic_files = list(backend_dir.rglob("traffic.json"))
    
    if not traffic_files:
        print("❌ No traffic.json files found in the backend directory.")
        print("   Make sure you have generated some traffic data first.")
        return
    
    print(f"✅ Found {len(traffic_files)} traffic file(s):")
    print()
    
    for i, file_path in enumerate(traffic_files, 1):
        print(f"📁 File {i}: {file_path}")
        print("-" * 40)
        
        try:
            # Read and analyze the file
            with open(file_path, 'r') as f:
                data = json.load(f)
            
            # Analyze structure
            data_type = type(data).__name__
            print(f"📊 File Type: {data_type}")
            
            if isinstance(data, list):
                print(f"📈 Array Structure: {len(data)} entries")
                print("⚠️  This is the OLD structure (will cause API errors)")
                
                # Show first few entries
                for j, entry in enumerate(data[:3]):  # Show first 3
                    print(f"   Entry {j+1}: {entry.get('id', 'No ID')} - {entry.get('timestamp', 'No timestamp')}")
                
                if len(data) > 3:
                    print(f"   ... and {len(data) - 3} more entries")
                
            elif isinstance(data, dict):
                print(f"📋 Object Structure: {len(data)} request entities")
                print("✅ This is the NEW structure (API will work)")
                
                # Show request keys and basic info
                for j, (key, value) in enumerate(list(data.items())[:5]):  # Show first 5
                    if isinstance(value, dict):
                        req_id = value.get('id', 'No ID')
                        timestamp = value.get('timestamp', 'No timestamp')
                        rtb_id = value.get('rtb_id', 'No RTB ID')
                        success = value.get('success', 'Unknown')
                        print(f"   {key}: ID={req_id}, RTB_ID={rtb_id}, Success={success}, Time={timestamp}")
                    else:
                        print(f"   {key}: {type(value).__name__} = {value}")
                
                if len(data) > 5:
                    print(f"   ... and {len(data) - 5} more requests")
                
            else:
                print(f"❓ Unknown structure: {data_type}")
                print(f"   Content preview: {str(data)[:100]}...")
            
            # Check for RTB data structure
            print("\n🔍 RTB Data Analysis:")
            if isinstance(data, dict):
                # New structure
                rtb_fields = ['rtb_id', 'rtb_imp', 'rtb_site', 'rtb_device', 'rtb_user']
                for field in rtb_fields:
                    count = sum(1 for req in data.values() if isinstance(req, dict) and req.get(field))
                    print(f"   {field}: {count} requests have this field")
                
                # Check legacy rtb_data
                legacy_count = sum(1 for req in data.values() if isinstance(req, dict) and req.get('rtb_data'))
                print(f"   rtb_data (legacy): {legacy_count} requests have this field")
                
            elif isinstance(data, list):
                # Old structure
                rtb_count = sum(1 for entry in data if isinstance(entry, dict) and entry.get('rtb_data'))
                print(f"   rtb_data: {rtb_count} entries have RTB data")
            
            print()
            
        except json.JSONDecodeError as e:
            print(f"❌ JSON Error: {e}")
            print("   This file is corrupted and needs to be fixed.")
        except Exception as e:
            print(f"❌ Error reading file: {e}")
        
        print("=" * 50)
        print()

def inspect_specific_campaign(campaign_id):
    """Inspect a specific campaign's traffic file"""
    
    print(f"🔍 Inspecting Campaign: {campaign_id}")
    print("=" * 50)
    
    # Look for the specific campaign file
    backend_dir = Path("backend")
    campaign_file = backend_dir / "app" / "api" / "traffic_data" / campaign_id / "traffic.json"
    
    if not campaign_file.exists():
        print(f"❌ Campaign file not found: {campaign_file}")
        return
    
    try:
        with open(campaign_file, 'r') as f:
            data = json.load(f)
        
        print(f"📁 File: {campaign_file}")
        print(f"📊 Type: {type(data).__name__}")
        
        if isinstance(data, dict):
            print(f"📋 Structure: Object with {len(data)} request entities")
            print("\n📋 Request Details:")
            
            for key, value in data.items():
                if isinstance(value, dict):
                    print(f"\n   🔑 {key}:")
                    print(f"      ID: {value.get('id', 'N/A')}")
                    print(f"      Timestamp: {value.get('timestamp', 'N/A')}")
                    print(f"      Success: {value.get('success', 'N/A')}")
                    print(f"      RTB ID: {value.get('rtb_id', 'N/A')}")
                    
                    # Show RTB structure
                    rtb_fields = ['rtb_imp', 'rtb_site', 'rtb_device', 'rtb_user']
                    for field in rtb_fields:
                        if value.get(field):
                            print(f"      {field}: ✅ Present")
                        else:
                            print(f"      {field}: ❌ Missing")
                    
                    # Show legacy rtb_data
                    if value.get('rtb_data'):
                        print(f"      rtb_data: ✅ Present (legacy)")
                    else:
                        print(f"      rtb_data: ❌ Missing")
                        
        elif isinstance(data, list):
            print(f"📈 Structure: Array with {len(data)} entries")
            print("⚠️  This is the OLD structure that will cause API errors!")
            print("\n📋 Entry Details:")
            
            for i, entry in enumerate(data):
                if isinstance(entry, dict):
                    print(f"\n   📍 Entry {i+1}:")
                    print(f"      ID: {entry.get('id', 'N/A')}")
                    print(f"      Timestamp: {entry.get('timestamp', 'N/A')}")
                    print(f"      Success: {entry.get('success', 'N/A')}")
                    
                    if entry.get('rtb_data'):
                        rtb_data = entry['rtb_data']
                        print(f"      rtb_data: ✅ Present")
                        print(f"         RTB ID: {rtb_data.get('id', 'N/A')}")
                        print(f"         Impressions: {len(rtb_data.get('imp', []))}")
                        print(f"         Site: {rtb_data.get('site', {}).get('name', 'N/A')}")
                    else:
                        print(f"      rtb_data: ❌ Missing")
        
        print("\n" + "=" * 50)
        
    except Exception as e:
        print(f"❌ Error: {e}")

def main():
    """Main function"""
    
    print("🚀 Traffic File Inspector")
    print("=" * 50)
    
    if len(sys.argv) > 1:
        # Inspect specific campaign
        campaign_id = sys.argv[1]
        inspect_specific_campaign(campaign_id)
    else:
        # Inspect all traffic files
        inspect_traffic_files()
    
    print("\n💡 Usage:")
    print("   python inspect_traffic_files.py                    # Inspect all files")
    print("   python inspect_traffic_files.py campaign_123      # Inspect specific campaign")
    print("\n🔧 If you see OLD structure (arrays), the API will auto-fix them!")

if __name__ == "__main__":
    main() 