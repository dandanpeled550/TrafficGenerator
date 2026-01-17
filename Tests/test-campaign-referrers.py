#!/usr/bin/env python3
"""
Test script to verify campaign referrer generation functionality.
This script tests that campaigns generate their own referrer dictionaries
based on assigned profiles and geo locations.
"""

import requests
import json
import time
from typing import Dict, Any

# Configuration
BASE_URL = "http://localhost:5000"  # Adjust if your backend runs on different port
API_BASE = f"{BASE_URL}/api"

def log(message: str, level: str = "INFO"):
    """Log messages with timestamp"""
    timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] {level}: {message}")

def test_campaign_referrer_generation():
    """Test the complete flow of campaign referrer generation"""
    
    log("Starting campaign referrer generation test...")
    
    try:
        # Step 1: Create a test profile with interests and countries
        log("Step 1: Creating test user profile...")
        profile_data = {
            "name": "Test Profile for Referrers",
            "description": "Profile to test campaign referrer generation",
            "demographics": {
                "age_group": "25-34",
                "gender": "all",
                "interests": ["technology", "gaming"],
                "countries": ["United States", "Canada"]
            },
            "device_preferences": {
                "device_brand": "samsung",
                "operating_system": "android",
                "browser": "chrome"
            }
        }
        
        profile_response = requests.post(f"{API_BASE}/profiles/", json=profile_data)
        if profile_response.status_code != 200:
            log(f"Failed to create profile: {profile_response.text}", "ERROR")
            return False
        
        profile = profile_response.json()
        profile_id = profile["id"]
        log(f"Created profile with ID: {profile_id}")
        
        # Step 2: Create a campaign with this profile
        log("Step 2: Creating campaign with the profile...")
        campaign_data = {
            "name": "Test Campaign for Referrers",
            "target_url": "https://example.com/test",
            "user_profile_ids": [profile_id],
            "profile_user_counts": {profile_id: 100},
            "geo_locations": ["United States", "Canada"],
            "requests_per_minute": 10,
            "duration_minutes": 60
        }
        
        campaign_response = requests.post(f"{API_BASE}/sessions/", json=campaign_data)
        if campaign_response.status_code != 200:
            log(f"Failed to create campaign: {campaign_response.text}", "ERROR")
            return False
        
        campaign = campaign_response.json()
        campaign_id = campaign["id"]
        log(f"Created campaign with ID: {campaign_id}")
        
        # Step 3: Verify campaign referrers were generated
        log("Step 3: Verifying campaign referrers...")
        if "campaign_referrers" not in campaign:
            log("Campaign missing campaign_referrers field", "ERROR")
            return False
        
        campaign_referrers = campaign["campaign_referrers"]
        if not campaign_referrers:
            log("Campaign referrers dictionary is empty", "ERROR")
            return False
        
        log(f"Campaign has {len(campaign_referrers)} referrer combinations")
        
        # Step 4: Check specific referrer combinations
        expected_combinations = [
            "technology|United States",
            "technology|Canada", 
            "gaming|United States",
            "gaming|Canada"
        ]
        
        for combination in expected_combinations:
            if combination in campaign_referrers:
                referrers = campaign_referrers[combination]
                log(f"✓ {combination}: {len(referrers)} referrers")
                if referrers:
                    log(f"  Sample referrer: {referrers[0]}")
                else:
                    log(f"  Warning: No referrers for {combination}", "WARN")
            else:
                log(f"✗ Missing referrer combination: {combination}", "ERROR")
                return False
        
        # Step 5: Test referrer regeneration on update
        log("Step 5: Testing referrer regeneration on campaign update...")
        update_data = {
            "geo_locations": ["United States", "Canada", "United Kingdom"]
        }
        
        update_response = requests.put(f"{API_BASE}/sessions/{campaign_id}", json=update_data)
        if update_response.status_code != 200:
            log(f"Failed to update campaign: {update_response.text}", "ERROR")
            return False
        
        updated_campaign = update_response.json()
        updated_referrers = updated_campaign.get("campaign_referrers", {})
        
        # Check if new combinations were added
        uk_combinations = [
            "technology|United Kingdom",
            "gaming|United Kingdom"
        ]
        
        for combination in uk_combinations:
            if combination in updated_referrers:
                log(f"✓ New combination added: {combination}")
            else:
                log(f"✗ New combination missing: {combination}", "ERROR")
                return False
        
        log("All tests passed! Campaign referrer generation is working correctly.", "SUCCESS")
        return True
        
    except Exception as e:
        log(f"Test failed with exception: {str(e)}", "ERROR")
        return False
    
    finally:
        # Cleanup: Delete test data
        log("Cleaning up test data...")
        try:
            if 'campaign_id' in locals():
                requests.delete(f"{API_BASE}/sessions/{campaign_id}")
                log("Deleted test campaign")
            
            if 'profile_id' in locals():
                requests.delete(f"{API_BASE}/profiles/{profile_id}")
                log("Deleted test profile")
                
        except Exception as e:
            log(f"Cleanup failed: {str(e)}", "WARN")

def test_referrer_generation_edge_cases():
    """Test edge cases in referrer generation"""
    
    log("Testing referrer generation edge cases...")
    
    try:
        # Test 1: Campaign with no profiles
        log("Test 1: Campaign with no profiles...")
        campaign_data = {
            "name": "Empty Campaign Test",
            "target_url": "https://example.com/empty",
            "user_profile_ids": [],
            "geo_locations": ["United States"]
        }
        
        response = requests.post(f"{API_BASE}/sessions/", json=campaign_data)
        if response.status_code != 200:
            log(f"Failed to create empty campaign: {response.text}", "ERROR")
            return False
        
        campaign = response.json()
        if campaign.get("campaign_referrers"):
            log("Warning: Empty campaign has referrers", "WARN")
        else:
            log("✓ Empty campaign correctly has no referrers")
        
        # Cleanup
        requests.delete(f"{API_BASE}/sessions/{campaign['id']}")
        
        # Test 2: Campaign with profile but no interests
        log("Test 2: Profile with no interests...")
        profile_data = {
            "name": "No Interests Profile",
            "description": "Profile without interests",
            "demographics": {
                "age_group": "25-34",
                "gender": "all",
                "countries": ["United States"]
            },
            "device_preferences": {
                "device_brand": "samsung",
                "operating_system": "android"
            }
        }
        
        profile_response = requests.post(f"{API_BASE}/profiles/", json=profile_data)
        if profile_response.status_code != 200:
            log(f"Failed to create no-interests profile: {profile_response.text}", "ERROR")
            return False
        
        profile_id = profile_response["id"]
        
        campaign_data = {
            "name": "No Interests Campaign",
            "target_url": "https://example.com/no-interests",
            "user_profile_ids": [profile_id],
            "profile_user_counts": {profile_id: 50},
            "geo_locations": ["United States"]
        }
        
        campaign_response = requests.post(f"{API_BASE}/sessions/", json=campaign_data)
        if campaign_response.status_code != 200:
            log(f"Failed to create no-interests campaign: {campaign_response.text}", "ERROR")
            return False
        
        campaign = campaign_response.json()
        if not campaign.get("campaign_referrers"):
            log("✓ Campaign with no interests correctly has no referrers")
        else:
            log("Warning: Campaign with no interests has referrers", "WARN")
        
        # Cleanup
        requests.delete(f"{API_BASE}/sessions/{campaign['id']}")
        requests.delete(f"{API_BASE}/profiles/{profile_id}")
        
        log("Edge case tests completed", "SUCCESS")
        return True
        
    except Exception as e:
        log(f"Edge case tests failed: {str(e)}", "ERROR")
        return False

if __name__ == "__main__":
    log("=== Campaign Referrer Generation Test Suite ===")
    
    # Check if backend is running
    try:
        health_response = requests.get(f"{BASE_URL}/health")
        if health_response.status_code != 200:
            log("Backend health check failed", "ERROR")
            exit(1)
        log("Backend is running and healthy")
    except requests.exceptions.ConnectionError:
        log("Cannot connect to backend. Make sure it's running on localhost:5000", "ERROR")
        exit(1)
    
    # Run tests
    success = True
    
    if not test_campaign_referrer_generation():
        success = False
    
    if not test_referrer_generation_edge_cases():
        success = False
    
    if success:
        log("=== ALL TESTS PASSED ===", "SUCCESS")
        exit(0)
    else:
        log("=== SOME TESTS FAILED ===", "ERROR")
        exit(1) 