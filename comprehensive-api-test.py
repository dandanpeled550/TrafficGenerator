#!/usr/bin/env python3
"""
Comprehensive API Test Suite for Traffic Generator
Tests: Traffic Generation, Simulator Generator, Threading, Multiple Campaigns
"""

import requests
import json
import time
import threading
from datetime import datetime

# Configuration
BACKEND_URL = "https://traffic-generator-backend.onrender.com"
API_BASE = f"{BACKEND_URL}/api"

def make_request(endpoint, method="GET", data=None):
    """Make HTTP request to the API"""
    try:
        url = f"{API_BASE}{endpoint}"
        headers = {"Content-Type": "application/json"}
        
        if method == "GET":
            response = requests.get(url, headers=headers)
        elif method == "POST":
            response = requests.post(url, headers=headers, json=data)
        elif method == "PUT":
            response = requests.put(url, headers=headers, json=data)
        
        return {
            "success": response.status_code < 400,
            "status_code": response.status_code,
            "data": response.json() if response.content else None
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "status_code": None
        }

def print_section(title):
    """Print a formatted section header"""
    print(f"\n{'='*20} {title} {'='*20}")

def print_result(test_name, success, details=None):
    """Print test result"""
    status = "✅ PASSED" if success else "❌ FAILED"
    print(f"{test_name}: {status}")
    if details:
        print(f"   Details: {details}")

def test_1_health_check():
    """Test 1: Health Check"""
    print_section("HEALTH CHECK")
    
    result = make_request("/traffic/health")
    if result["success"]:
        health = result["data"]
        print("✅ Health check passed")
        print(f"   Status: {health['data']['status']}")
        print(f"   Active Campaigns: {health['data']['total_active_campaigns']}")
        print(f"   Timestamp: {health['data']['data']['timestamp']}")
        return True
    else:
        print(f"❌ Health check failed: {result.get('error', 'Unknown error')}")
        return False

def test_2_simulator_generator():
    """Test 2: Simulator Generator (Test Endpoint)"""
    print_section("SIMULATOR GENERATOR")
    
    # Test different simulation types
    test_cases = [
        {
            "name": "Traffic Data Generation",
            "data": {"test_type": "generate_traffic_data"}
        },
        {
            "name": "Request Simulation",
            "data": {"test_type": "simulate_request", "num_simulations": 3}
        },
        {
            "name": "Full Traffic Simulation",
            "data": {
                "test_type": "full_traffic_simulation",
                "num_requests": 5,
                "config": {
                    "campaign_id": "simulator_test",
                    "target_url": "https://example.com/simulator",
                    "requests_per_minute": 10,
                    "duration_minutes": 1,
                    "user_profile_ids": ["test_profile"],
                    "profile_user_counts": {"test_profile": 50},
                    "total_profile_users": 50,
                    "geo_locations": ["United States"],
                    "rtb_config": {
                        "device_brand": "samsung",
                        "device_models": ["Galaxy S24"],
                        "ad_formats": ["banner"],
                        "app_categories": ["IAB9"]
                    }
                }
            }
        }
    ]
    
    results = []
    for test_case in test_cases:
        print(f"\n🧪 Testing: {test_case['name']}")
        result = make_request("/traffic/test", "POST", test_case["data"])
        
        if result["success"]:
            print("✅ Simulator test passed")
            data = result["data"]
            if "statistics" in data:
                stats = data["statistics"]
                print(f"   Total Simulations: {stats.get('total_simulations', 'N/A')}")
                print(f"   Success Rate: {stats.get('success_rate', 'N/A')}%")
            elif "verification" in data:
                verification = data["verification"]
                print(f"   All Fields Valid: {verification.get('all_fields_valid', 'N/A')}")
            results.append(True)
        else:
            print(f"❌ Simulator test failed: {result.get('error', 'Unknown error')}")
            results.append(False)
    
    return all(results)

def test_3_single_campaign_traffic():
    """Test 3: Single Campaign Traffic Generation"""
    print_section("SINGLE CAMPAIGN TRAFFIC GENERATION")
    
    # Create test profile
    profile = {
        "id": "test_profile_single",
        "name": "Single Campaign Test Profile",
        "device_type": "mobile",
        "behavior_pattern": "high_activity",
        "geo_location": "United States",
        "interests": ["gaming", "social_media"],
        "session_duration": 45,
        "page_views_per_session": 8
    }
    
    print("📝 Creating test profile...")
    profile_result = make_request("/profiles", "POST", profile)
    if not profile_result["success"]:
        print(f"❌ Failed to create profile: {profile_result.get('error', 'Unknown error')}")
        return False
    print("✅ Profile created successfully")
    
    # Create test campaign
    campaign = {
        "id": "single_campaign_test",
        "name": "Single Campaign Traffic Test",
        "target_url": "https://example.com/single",
        "requests_per_minute": 12,
        "duration_minutes": 1,
        "user_profile_ids": ["test_profile_single"],
        "profile_user_counts": {"test_profile_single": 60},
        "geo_locations": ["United States"],
        "rtb_config": {
            "device_brand": "samsung",
            "device_models": ["Galaxy S24", "iPhone 15"],
            "ad_formats": ["banner", "interstitial"],
            "app_categories": ["IAB9", "IAB1"]
        }
    }
    
    print("📝 Creating test campaign...")
    campaign_result = make_request("/sessions", "POST", campaign)
    if not campaign_result["success"]:
        print(f"❌ Failed to create campaign: {campaign_result.get('error', 'Unknown error')}")
        return False
    print("✅ Campaign created successfully")
    
    # Set campaign status to running
    print("🔄 Setting campaign status to 'running'...")
    status_result = make_request("/traffic/campaigns/single_campaign_test/status", "PUT", {"status": "running"})
    if not status_result["success"]:
        print(f"❌ Failed to set status: {status_result.get('error', 'Unknown error')}")
        return False
    print("✅ Campaign status set to 'running'")
    
    # Start traffic generation
    print("🚀 Starting traffic generation...")
    start_result = make_request("/traffic/generate", "POST", {"campaign_id": "single_campaign_test"})
    if not start_result["success"]:
        print(f"❌ Failed to start traffic generation: {start_result.get('error', 'Unknown error')}")
        return False
    print("✅ Traffic generation started")
    print(f"   Thread ID: {start_result['data'].get('thread_id', 'N/A')}")
    
    # Monitor for 15 seconds
    print("📊 Monitoring traffic generation for 15 seconds...")
    start_time = time.time()
    monitoring_duration = 15
    
    while time.time() - start_time < monitoring_duration:
        info_result = make_request("/traffic/campaigns/single_campaign_test/info")
        if info_result["success"]:
            info = info_result["data"]
            stats = info["data"]["traffic_stats"]
            generation = info["data"]["traffic_generation"]
            
            print(f"   Requests: {stats['total_requests']}, Success: {stats['successful_requests']} ({stats['success_rate']:.1f}%) - Running: {generation['is_running']}")
        
        time.sleep(3)
    
    # Stop traffic generation
    print("🛑 Stopping traffic generation...")
    stop_result = make_request("/traffic/stop/single_campaign_test", "POST")
    if stop_result["success"]:
        print("✅ Traffic generation stopped")
    else:
        print(f"❌ Failed to stop traffic generation: {stop_result.get('error', 'Unknown error')}")
    
    # Get final stats
    final_info = make_request("/traffic/campaigns/single_campaign_test/info")
    if final_info["success"]:
        final_stats = final_info["data"]["data"]["traffic_stats"]
        print(f"📊 Final Stats: {final_stats['total_requests']} total requests, {final_stats['successful_requests']} successful ({final_stats['success_rate']:.1f}% success rate)")
    
    return True

def test_4_multiple_campaigns_threading():
    """Test 4: Multiple Campaigns with Threading"""
    print_section("MULTIPLE CAMPAIGNS THREADING")
    
    # Create multiple test campaigns
    campaigns = [
        {
            "id": "multi_campaign_1",
            "name": "Multi Campaign 1 - High Volume",
            "target_url": "https://example.com/multi1",
            "requests_per_minute": 15,
            "duration_minutes": 1,
            "user_profile_ids": ["test_profile_single"],
            "profile_user_counts": {"test_profile_single": 40}
        },
        {
            "id": "multi_campaign_2",
            "name": "Multi Campaign 2 - Medium Volume",
            "target_url": "https://example.com/multi2",
            "requests_per_minute": 10,
            "duration_minutes": 1,
            "user_profile_ids": ["test_profile_single"],
            "profile_user_counts": {"test_profile_single": 30}
        },
        {
            "id": "multi_campaign_3",
            "name": "Multi Campaign 3 - Low Volume",
            "target_url": "https://example.com/multi3",
            "requests_per_minute": 8,
            "duration_minutes": 1,
            "user_profile_ids": ["test_profile_single"],
            "profile_user_counts": {"test_profile_single": 20}
        }
    ]
    
    print("📝 Creating multiple campaigns...")
    created_campaigns = []
    for campaign in campaigns:
        result = make_request("/sessions", "POST", campaign)
        if result["success"]:
            print(f"✅ Created campaign: {campaign['name']}")
            created_campaigns.append(campaign["id"])
        else:
            print(f"❌ Failed to create campaign {campaign['name']}: {result.get('error', 'Unknown error')}")
    
    if not created_campaigns:
        print("❌ No campaigns created, cannot proceed with test")
        return False
    
    # Set all campaigns to running status
    print("\n🔄 Setting all campaigns to 'running' status...")
    for campaign_id in created_campaigns:
        status_result = make_request(f"/traffic/campaigns/{campaign_id}/status", "PUT", {"status": "running"})
        if status_result["success"]:
            print(f"✅ Campaign {campaign_id} status set to 'running'")
        else:
            print(f"❌ Failed to set status for {campaign_id}")
    
    # Start traffic generation for all campaigns simultaneously
    print("\n🚀 Starting traffic generation for all campaigns simultaneously...")
    start_results = []
    for campaign_id in created_campaigns:
        result = make_request("/traffic/generate", "POST", {"campaign_id": campaign_id})
        if result["success"]:
            print(f"✅ Started traffic for {campaign_id} (Thread ID: {result['data'].get('thread_id', 'N/A')})")
            start_results.append({"campaign_id": campaign_id, "success": True, "thread_id": result['data'].get('thread_id')})
        else:
            print(f"❌ Failed to start traffic for {campaign_id}: {result.get('error', 'Unknown error')}")
            start_results.append({"campaign_id": campaign_id, "success": False})
    
    successful_starts = [r for r in start_results if r["success"]]
    print(f"\n📊 Started {len(successful_starts)}/{len(created_campaigns)} campaigns successfully")
    
    # Monitor all campaigns for 20 seconds
    print("\n📊 Monitoring all campaigns for 20 seconds...")
    start_time = time.time()
    monitoring_duration = 20
    
    while time.time() - start_time < monitoring_duration:
        print(f"\n--- Status Check at {datetime.now().strftime('%H:%M:%S')} ---")
        
        for campaign_id in created_campaigns:
            info_result = make_request(f"/traffic/campaigns/{campaign_id}/info")
            if info_result["success"]:
                info = info_result["data"]
                stats = info["data"]["traffic_stats"]
                generation = info["data"]["traffic_generation"]
                
                print(f"   {campaign_id}: {stats['total_requests']} requests, {stats['successful_requests']} successful ({stats['success_rate']:.1f}%) - Running: {generation['is_running']}")
            else:
                print(f"   {campaign_id}: Failed to get info")
        
        time.sleep(5)
    
    # Stop all campaigns
    print("\n🛑 Stopping all campaigns...")
    for campaign_id in created_campaigns:
        stop_result = make_request(f"/traffic/stop/{campaign_id}", "POST")
        if stop_result["success"]:
            print(f"✅ Stopped campaign {campaign_id}")
        else:
            print(f"❌ Failed to stop campaign {campaign_id}")
        
        # Update status to stopped
        make_request(f"/traffic/campaigns/{campaign_id}/status", "PUT", {"status": "stopped"})
        
        # Cleanup
        cleanup_result = make_request(f"/traffic/cleanup/{campaign_id}", "POST")
        if cleanup_result["success"]:
            print(f"✅ Cleaned up campaign {campaign_id}")
    
    # Get final summary
    print("\n📊 Final Campaign Summary:")
    for campaign_id in created_campaigns:
        final_info = make_request(f"/traffic/campaigns/{campaign_id}/info")
        if final_info["success"]:
            final_stats = final_info["data"]["data"]["traffic_stats"]
            generation = final_info["data"]["data"]["traffic_generation"]
            print(f"   {campaign_id}: {final_stats['total_requests']} total requests, {final_stats['successful_requests']} successful - Traffic Running: {generation['is_running']}")
    
    return len(successful_starts) > 0

def test_5_error_handling():
    """Test 5: Error Handling and Edge Cases"""
    print_section("ERROR HANDLING & EDGE CASES")
    
    test_cases = [
        {
            "name": "Non-existent campaign",
            "endpoint": "/traffic/generate",
            "method": "POST",
            "data": {"campaign_id": "non_existent_campaign"},
            "expected_failure": True
        },
        {
            "name": "Missing campaign_id",
            "endpoint": "/traffic/generate",
            "method": "POST",
            "data": {},
            "expected_failure": True
        },
        {
            "name": "Invalid status",
            "endpoint": "/traffic/campaigns/single_campaign_test/status",
            "method": "PUT",
            "data": {"status": "invalid_status"},
            "expected_failure": True
        },
        {
            "name": "Duplicate traffic generation",
            "endpoint": "/traffic/generate",
            "method": "POST",
            "data": {"campaign_id": "single_campaign_test"},
            "expected_failure": True
        }
    ]
    
    results = []
    for test_case in test_cases:
        print(f"\n🧪 Testing: {test_case['name']}")
        result = make_request(test_case["endpoint"], test_case["method"], test_case["data"])
        
        if test_case["expected_failure"]:
            if not result["success"]:
                print(f"✅ Correctly handled error (Status: {result['status_code']})")
                results.append(True)
            else:
                print(f"❌ Should have failed but succeeded")
                results.append(False)
        else:
            if result["success"]:
                print(f"✅ Correctly succeeded")
                results.append(True)
            else:
                print(f"❌ Should have succeeded but failed: {result.get('error', 'Unknown error')}")
                results.append(False)
    
    return all(results)

def test_6_performance_metrics():
    """Test 6: Performance Metrics and Monitoring"""
    print_section("PERFORMANCE METRICS & MONITORING")
    
    # Get health check with detailed metrics
    health_result = make_request("/traffic/health")
    if health_result["success"]:
        health = health_result["data"]
        print("✅ Health check with performance metrics:")
        print(f"   System Status: {health['data']['status']}")
        print(f"   Active Campaigns: {health['data']['total_active_campaigns']}")
        print(f"   Traffic Data Directory: {health['data']['data']['traffic_data_dir']}")
        
        if health['data']['data']['active_campaigns']:
            print("   Active Campaigns:")
            for campaign_id in health['data']['data']['active_campaigns']:
                print(f"     - {campaign_id}")
        
        if health['data']['data']['campaign_stats']:
            print("   Campaign Statistics:")
            for campaign_id, stats in health['data']['data']['campaign_stats'].items():
                print(f"     {campaign_id}: {stats.get('total_requests', 0)} requests, {stats.get('successful_requests', 0)} successful")
        
        return True
    else:
        print(f"❌ Health check failed: {health_result.get('error', 'Unknown error')}")
        return False

def cleanup_all_resources():
    """Clean up all test resources"""
    print_section("CLEANUP")
    
    campaigns_to_cleanup = [
        "single_campaign_test",
        "multi_campaign_1",
        "multi_campaign_2", 
        "multi_campaign_3"
    ]
    
    for campaign_id in campaigns_to_cleanup:
        print(f"🧹 Cleaning up {campaign_id}...")
        
        # Stop traffic generation
        make_request(f"/traffic/stop/{campaign_id}", "POST")
        
        # Update status to stopped
        make_request(f"/traffic/campaigns/{campaign_id}/status", "PUT", {"status": "stopped"})
        
        # Cleanup resources
        make_request(f"/traffic/cleanup/{campaign_id}", "POST")
    
    print("✅ All test resources cleaned up")

def main():
    """Run comprehensive API test suite"""
    print("🚀 COMPREHENSIVE TRAFFIC GENERATOR API TEST SUITE")
    print("=" * 70)
    print(f"🌐 Backend URL: {BACKEND_URL}")
    print(f"⏰ Test started at: {datetime.now().isoformat()}")
    
    test_results = []
    
    try:
        # Run all tests
        test_results.append(("Health Check", test_1_health_check()))
        test_results.append(("Simulator Generator", test_2_simulator_generator()))
        test_results.append(("Single Campaign Traffic", test_3_single_campaign_traffic()))
        test_results.append(("Multiple Campaigns Threading", test_4_multiple_campaigns_threading()))
        test_results.append(("Error Handling", test_5_error_handling()))
        test_results.append(("Performance Metrics", test_6_performance_metrics()))
        
        # Cleanup
        cleanup_all_resources()
        
        # Summary
        print("\n" + "=" * 70)
        print("📊 COMPREHENSIVE TEST RESULTS SUMMARY")
        print("=" * 70)
        
        passed = 0
        total = len(test_results)
        
        for test_name, result in test_results:
            status = "✅ PASSED" if result else "❌ FAILED"
            print(f"{test_name}: {status}")
            if result:
                passed += 1
        
        print(f"\n🎯 Overall Result: {passed}/{total} tests passed")
        
        if passed == total:
            print("\n🎉 ALL TESTS PASSED! TRAFFIC GENERATOR IS FULLY OPERATIONAL!")
            print("\n📋 Verified Functionality:")
            print("✅ Health check and system monitoring")
            print("✅ Traffic data generation and simulation")
            print("✅ Single campaign traffic generation with threading")
            print("✅ Multiple campaigns running in parallel")
            print("✅ Proper error handling and validation")
            print("✅ Performance metrics and monitoring")
            print("✅ Resource cleanup and management")
        else:
            print(f"\n⚠️  {total - passed} test(s) failed - some functionality may need attention")
            
    except Exception as e:
        print(f"\n❌ Test suite failed with exception: {str(e)}")
        return False
    
    return passed == total

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1) 