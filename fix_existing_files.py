#!/usr/bin/env python3
"""
Script to manually fix existing corrupted traffic files
Run this from your project root directory
"""

import json
import os
import sys
from pathlib import Path

def fix_traffic_file(file_path):
    """Fix a single traffic file by converting from list to object structure"""
    
    print(f"🔧 Fixing file: {file_path}")
    
    try:
        # Read the current file
        with open(file_path, 'r') as f:
            data = json.load(f)
        
        print(f"   📊 Current structure: {type(data).__name__}")
        
        if isinstance(data, list):
            print(f"   ⚠️  Found old list structure with {len(data)} entries")
            
            # Convert list to object
            converted_data = {}
            for entry in data:
                entry_id = entry.get('id', f"request_{len(converted_data)}")
                converted_data[entry_id] = entry
            
            print(f"   ✅ Converted to object structure with {len(converted_data)} entities")
            
            # Backup the old file
            backup_path = str(file_path) + ".backup"
            os.rename(file_path, backup_path)
            print(f"   💾 Backed up old file to: {backup_path}")
            
            # Write the new structure
            with open(file_path, 'w') as f:
                json.dump(converted_data, f, indent=2)
            
            print(f"   ✅ Successfully fixed file structure")
            return True
            
        elif isinstance(data, dict):
            print(f"   ✅ File already has correct object structure with {len(data)} entities")
            return True
            
        else:
            print(f"   ❓ Unknown structure: {type(data)}")
            return False
            
    except json.JSONDecodeError as e:
        print(f"   ❌ JSON Error: {e}")
        return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False

def fix_all_traffic_files():
    """Find and fix all corrupted traffic files"""
    
    print("🚀 Traffic File Fixer")
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
        return
    
    print(f"✅ Found {len(traffic_files)} traffic file(s)")
    print()
    
    fixed_count = 0
    error_count = 0
    
    for file_path in traffic_files:
        print(f"📁 Processing: {file_path}")
        
        if fix_traffic_file(file_path):
            fixed_count += 1
        else:
            error_count += 1
        
        print("-" * 40)
    
    print("\n🎉 File Fixing Complete!")
    print(f"✅ Successfully fixed: {fixed_count} files")
    if error_count > 0:
        print(f"❌ Errors encountered: {error_count} files")
    
    print("\n💡 Next steps:")
    print("   1. Try calling the API endpoint again")
    print("   2. The files should now work correctly")
    print("   3. New requests will be saved in the correct format")

if __name__ == "__main__":
    fix_all_traffic_files() 