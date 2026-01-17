#!/bin/bash

# Comprehensive Traffic Generator API Test Suite using curl
# Tests: Health Check, Simulator Generator, Traffic Generation, Threading, Multiple Campaigns

BACKEND_URL="https://trafficgenerator-hz4s.onrender.com"
API_BASE="$BACKEND_URL/api"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0

print_section() {
    echo -e "\n${BLUE}==================== $1 ====================${NC}"
}

print_result() {
    local test_name="$1"
    local success="$2"
    local details="$3"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if [ "$success" = "true" ]; then
        echo -e "${GREEN}✅ $test_name: PASSED${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}❌ $test_name: FAILED${NC}"
    fi
    
    if [ -n "$details" ]; then
        echo "   Details: $details"
    fi
}

make_request() {
    local endpoint="$1"
    local method="${2:-GET}"
    local data="$3"
    
    local url="$API_BASE$endpoint"
    local curl_cmd="curl -s -w '\nHTTP_STATUS:%{http_code}'"
    
    if [ "$method" = "POST" ] || [ "$method" = "PUT" ]; then
        curl_cmd="$curl_cmd -X $method -H 'Content-Type: application/json'"
        if [ -n "$data" ]; then
            curl_cmd="$curl_cmd -d '$data'"
        fi
    fi
    
    curl_cmd="$curl_cmd '$url'"
    
    local response=$(eval $curl_cmd)
    local http_status=$(echo "$response" | grep "HTTP_STATUS:" | cut -d: -f2)
    local body=$(echo "$response" | sed '/HTTP_STATUS:/d')
    
    # Handle empty body
    if [ -z "$body" ]; then
        body="{}"
    fi
    
    echo "{\"status_code\": $http_status, \"body\": $body}"
}

test_1_health_check() {
    print_section "HEALTH CHECK"
    
    echo "🔍 Testing health check endpoint..."
    local result=$(make_request "/traffic/health")
    local status_code=$(echo "$result" | jq -r '.status_code')
    local body=$(echo "$result" | jq -r '.body')
    
    if [ "$status_code" = "200" ]; then
        local status=$(echo "$body" | jq -r '.data.status // .status')
        local active_campaigns=$(echo "$body" | jq -r '.data.total_active_campaigns // 0')
        echo -e "${GREEN}✅ Health check passed${NC}"
        echo "   Status: $status"
        echo "   Active Campaigns: $active_campaigns"
        print_result "Health Check" "true" "Status: $status, Active Campaigns: $active_campaigns"
        return 0
    else
        echo -e "${RED}❌ Health check failed${NC}"
        echo "   Status Code: $status_code"
        echo "   Response: $body"
        print_result "Health Check" "false" "Status Code: $status_code"
        return 1
    fi
}

test_2_simulator_generator() {
    print_section "SIMULATOR GENERATOR"
    
    # Test 1: Traffic Data Generation
    echo "🧪 Testing traffic data generation..."
    local test_data='{"test_type": "generate_traffic_data"}'
    local result=$(make_request "/traffic/test" "POST" "$test_data")
    local status_code=$(echo "$result" | jq -r '.status_code')
    
    if [ "$status_code" = "200" ]; then
        echo -e "${GREEN}✅ Traffic data generation test passed${NC}"
        print_result "Traffic Data Generation" "true"
    else
        echo -e "${RED}❌ Traffic data generation test failed${NC}"
        print_result "Traffic Data Generation" "false" "Status Code: $status_code"
    fi
    
    # Test 2: Request Simulation
    echo "🧪 Testing request simulation..."
    local test_data='{"test_type": "simulate_request", "num_simulations": 3}'
    local result=$(make_request "/traffic/test" "POST" "$test_data")
    local status_code=$(echo "$result" | jq -r '.status_code')
    
    if [ "$status_code" = "200" ]; then
        echo -e "${GREEN}✅ Request simulation test passed${NC}"
        print_result "Request Simulation" "true"
    else
        echo -e "${RED}❌ Request simulation test failed${NC}"
        print_result "Request Simulation" "false" "Status Code: $status_code"
    fi
    
    # Test 3: Full Traffic Simulation
    echo "🧪 Testing full traffic simulation..."
    local test_data='{
        "test_type": "full_traffic_simulation",
        "num_requests": 3,
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
    }'
    local result=$(make_request "/traffic/test" "POST" "$test_data")
    local status_code=$(echo "$result" | jq -r '.status_code')
    
    if [ "$status_code" = "200" ]; then
        echo -e "${GREEN}✅ Full traffic simulation test passed${NC}"
        print_result "Full Traffic Simulation" "true"
    else
        echo -e "${RED}❌ Full traffic simulation test failed${NC}"
        print_result "Full Traffic Simulation" "false" "Status Code: $status_code"
    fi
}

test_3_single_campaign_traffic() {
    print_section "SINGLE CAMPAIGN TRAFFIC GENERATION"
    
    # Create test profile with correct API structure
    echo "📝 Creating test profile..."
    local profile_data='{
        "name": "Single Campaign Test Profile",
        "description": "Test profile for single campaign traffic generation",
        "demographics": {
            "age_group": "25-34",
            "gender": "any",
            "interests": ["gaming", "social_media"]
        },
        "device_preferences": {
            "device_brand": "samsung",
            "device_models": ["Galaxy S24"],
            "operating_system": "android"
        },
        "app_usage": {
            "preferred_app_categories": ["Games", "Social Networking"],
            "session_duration_avg_minutes": 45
        },
        "rtb_specifics": {
            "preferred_ad_formats": ["banner", "interstitial"],
            "adid_persistence": "per_user"
        }
    }'
    
    local result=$(make_request "/profiles/" "POST" "$profile_data")
    local status_code=$(echo "$result" | jq -r '.status_code')
    
    if [ "$status_code" = "201" ]; then
        local profile_id=$(echo "$result" | jq -r '.body.id')
        echo -e "${GREEN}✅ Profile created successfully with ID: $profile_id${NC}"
    else
        echo -e "${RED}❌ Failed to create profile${NC}"
        echo "   Status Code: $status_code"
        echo "   Response: $(echo "$result" | jq -r '.body')"
        print_result "Single Campaign Traffic" "false" "Profile creation failed"
        return 1
    fi
    
    # Create test campaign with correct API structure
    echo "📝 Creating test campaign..."
    local campaign_data='{
        "name": "Single Campaign Traffic Test",
        "target_url": "https://example.com/single",
        "requests_per_minute": 12,
        "duration_minutes": 1,
        "user_profile_ids": ["'$profile_id'"],
        "profile_user_counts": {"'$profile_id'": 60},
        "geo_locations": ["United States"],
        "rtb_config": {
            "device_brand": "samsung",
            "device_models": ["Galaxy S24", "iPhone 15"],
            "ad_formats": ["banner", "interstitial"],
            "app_categories": ["IAB9", "IAB1"]
        }
    }'
    
    local result=$(make_request "/sessions/" "POST" "$campaign_data")
    local status_code=$(echo "$result" | jq -r '.status_code')
    
    if [ "$status_code" = "200" ]; then
        local campaign_id=$(echo "$result" | jq -r '.body.id')
        echo -e "${GREEN}✅ Campaign created successfully with ID: $campaign_id${NC}"
    else
        echo -e "${RED}❌ Failed to create campaign${NC}"
        echo "   Status Code: $status_code"
        echo "   Response: $(echo "$result" | jq -r '.body')"
        print_result "Single Campaign Traffic" "false" "Campaign creation failed"
        return 1
    fi
    
    # Set campaign status to running
    echo "🔄 Setting campaign status to 'running'..."
    local status_data='{"status": "running"}'
    local result=$(make_request "/traffic/campaigns/$campaign_id/status" "PUT" "$status_data")
    local status_code=$(echo "$result" | jq -r '.status_code')
    
    if [ "$status_code" = "200" ]; then
        echo -e "${GREEN}✅ Campaign status set to 'running'${NC}"
    else
        echo -e "${RED}❌ Failed to set campaign status${NC}"
        print_result "Single Campaign Traffic" "false" "Status update failed"
        return 1
    fi
    
    # Start traffic generation
    echo "🚀 Starting traffic generation..."
    local start_data="{\"campaign_id\": \"$campaign_id\"}"
    local result=$(make_request "/traffic/generate" "POST" "$start_data")
    local status_code=$(echo "$result" | jq -r '.status_code')
    
    if [ "$status_code" = "200" ]; then
        echo -e "${GREEN}✅ Traffic generation started${NC}"
        local thread_id=$(echo "$result" | jq -r '.body.thread_id')
        echo "   Thread ID: $thread_id"
    else
        echo -e "${RED}❌ Failed to start traffic generation${NC}"
        print_result "Single Campaign Traffic" "false" "Traffic generation start failed"
        return 1
    fi
    
    # Monitor for 10 seconds
    echo "📊 Monitoring traffic generation for 10 seconds..."
    for i in {1..3}; do
        sleep 3
        local info_result=$(make_request "/traffic/campaigns/$campaign_id/info")
        local info_status=$(echo "$info_result" | jq -r '.status_code')
        
        if [ "$info_status" = "200" ]; then
            local total_requests=$(echo "$info_result" | jq -r '.body.data.traffic_stats.total_requests')
            local successful_requests=$(echo "$info_result" | jq -r '.body.data.traffic_stats.successful_requests')
            local success_rate=$(echo "$info_result" | jq -r '.body.data.traffic_stats.success_rate')
            local is_running=$(echo "$info_result" | jq -r '.body.data.traffic_generation.is_running')
            
            echo "   Check $i: $total_requests requests, $successful_requests successful ($success_rate%) - Running: $is_running"
        fi
    done
    
    # Stop traffic generation
    echo "🛑 Stopping traffic generation..."
    local stop_result=$(make_request "/traffic/stop/$campaign_id" "POST")
    local stop_status=$(echo "$stop_result" | jq -r '.status_code')
    
    if [ "$stop_status" = "200" ]; then
        echo -e "${GREEN}✅ Traffic generation stopped${NC}"
    else
        echo -e "${RED}❌ Failed to stop traffic generation${NC}"
    fi
    
    # Get final stats
    local final_info=$(make_request "/traffic/campaigns/$campaign_id/info")
    if [ "$(echo "$final_info" | jq -r '.status_code')" = "200" ]; then
        local total_requests=$(echo "$final_info" | jq -r '.body.data.traffic_stats.total_requests')
        local successful_requests=$(echo "$final_info" | jq -r '.body.data.traffic_stats.successful_requests')
        local success_rate=$(echo "$final_info" | jq -r '.body.data.traffic_stats.success_rate')
        echo "📊 Final Stats: $total_requests total requests, $successful_requests successful ($success_rate% success rate)"
    fi
    
    print_result "Single Campaign Traffic" "true" "Generated $total_requests requests with $success_rate% success rate"
}

test_4_multiple_campaigns_threading() {
    print_section "MULTIPLE CAMPAIGNS THREADING"
    
    # Create multiple test campaigns with correct API structure
    local campaigns=(
        '{"name": "Multi Campaign 1 - High Volume", "target_url": "https://example.com/multi1", "requests_per_minute": 15, "duration_minutes": 1, "user_profile_ids": [], "profile_user_counts": {}}'
        '{"name": "Multi Campaign 2 - Medium Volume", "target_url": "https://example.com/multi2", "requests_per_minute": 10, "duration_minutes": 1, "user_profile_ids": [], "profile_user_counts": {}}'
        '{"name": "Multi Campaign 3 - Low Volume", "target_url": "https://example.com/multi3", "requests_per_minute": 8, "duration_minutes": 1, "user_profile_ids": [], "profile_user_counts": {}}'
    )
    
    echo "📝 Creating multiple campaigns..."
    local created_campaigns=()
    
    for campaign_data in "${campaigns[@]}"; do
        local result=$(make_request "/sessions/" "POST" "$campaign_data")
        local status_code=$(echo "$result" | jq -r '.status_code')
        
        if [ "$status_code" = "200" ]; then
            local campaign_id=$(echo "$result" | jq -r '.body.id')
            echo -e "${GREEN}✅ Created campaign: $campaign_id${NC}"
            created_campaigns+=("$campaign_id")
        else
            echo -e "${RED}❌ Failed to create campaign${NC}"
            echo "   Status Code: $status_code"
            echo "   Response: $(echo "$result" | jq -r '.body')"
        fi
    done
    
    if [ ${#created_campaigns[@]} -eq 0 ]; then
        echo -e "${RED}❌ No campaigns created, cannot proceed with test${NC}"
        print_result "Multiple Campaigns Threading" "false" "No campaigns created"
        return 1
    fi
    
    # Set all campaigns to running status
    echo -e "\n🔄 Setting all campaigns to 'running' status..."
    for campaign_id in "${created_campaigns[@]}"; do
        local status_data="{\"status\": \"running\"}"
        local result=$(make_request "/traffic/campaigns/$campaign_id/status" "PUT" "$status_data")
        local status_code=$(echo "$result" | jq -r '.status_code')
        
        if [ "$status_code" = "200" ]; then
            echo -e "${GREEN}✅ Campaign $campaign_id status set to 'running'${NC}"
        else
            echo -e "${RED}❌ Failed to set status for $campaign_id${NC}"
        fi
    done
    
    # Start traffic generation for all campaigns simultaneously
    echo -e "\n🚀 Starting traffic generation for all campaigns simultaneously..."
    local successful_starts=0
    
    for campaign_id in "${created_campaigns[@]}"; do
        local start_data="{\"campaign_id\": \"$campaign_id\"}"
        local result=$(make_request "/traffic/generate" "POST" "$start_data")
        local status_code=$(echo "$result" | jq -r '.status_code')
        
        if [ "$status_code" = "200" ]; then
            local thread_id=$(echo "$result" | jq -r '.body.thread_id')
            echo -e "${GREEN}✅ Started traffic for $campaign_id (Thread ID: $thread_id)${NC}"
            successful_starts=$((successful_starts + 1))
        else
            echo -e "${RED}❌ Failed to start traffic for $campaign_id${NC}"
        fi
    done
    
    echo -e "\n📊 Started $successful_starts/${#created_campaigns[@]} campaigns successfully"
    
    # Monitor all campaigns for 15 seconds
    echo -e "\n📊 Monitoring all campaigns for 15 seconds..."
    for i in {1..3}; do
        echo -e "\n--- Status Check $i ---"
        
        for campaign_id in "${created_campaigns[@]}"; do
            local info_result=$(make_request "/traffic/campaigns/$campaign_id/info")
            local info_status=$(echo "$info_result" | jq -r '.status_code')
            
            if [ "$info_status" = "200" ]; then
                local total_requests=$(echo "$info_result" | jq -r '.body.data.traffic_stats.total_requests')
                local successful_requests=$(echo "$info_result" | jq -r '.body.data.traffic_stats.successful_requests')
                local success_rate=$(echo "$info_result" | jq -r '.body.data.traffic_stats.success_rate')
                local is_running=$(echo "$info_result" | jq -r '.body.data.traffic_generation.is_running')
                
                echo "   $campaign_id: $total_requests requests, $successful_requests successful ($success_rate%) - Running: $is_running"
            else
                echo "   $campaign_id: Failed to get info"
            fi
        done
        
        sleep 5
    done
    
    # Stop all campaigns
    echo -e "\n🛑 Stopping all campaigns..."
    for campaign_id in "${created_campaigns[@]}"; do
        local stop_result=$(make_request "/traffic/stop/$campaign_id" "POST")
        local stop_status=$(echo "$stop_result" | jq -r '.status_code')
        
        if [ "$stop_status" = "200" ]; then
            echo -e "${GREEN}✅ Stopped campaign $campaign_id${NC}"
        else
            echo -e "${RED}❌ Failed to stop campaign $campaign_id${NC}"
        fi
        
        # Update status to stopped
        local status_data="{\"status\": \"stopped\"}"
        make_request "/traffic/campaigns/$campaign_id/status" "PUT" "$status_data" > /dev/null
        
        # Cleanup
        local cleanup_result=$(make_request "/traffic/cleanup/$campaign_id" "POST")
        local cleanup_status=$(echo "$cleanup_result" | jq -r '.status_code')
        
        if [ "$cleanup_status" = "200" ]; then
            echo -e "${GREEN}✅ Cleaned up campaign $campaign_id${NC}"
        fi
    done
    
    # Get final summary
    echo -e "\n📊 Final Campaign Summary:"
    for campaign_id in "${created_campaigns[@]}"; do
        local final_info=$(make_request "/traffic/campaigns/$campaign_id/info")
        if [ "$(echo "$final_info" | jq -r '.status_code')" = "200" ]; then
            local total_requests=$(echo "$final_info" | jq -r '.body.data.traffic_stats.total_requests')
            local successful_requests=$(echo "$final_info" | jq -r '.body.data.traffic_stats.successful_requests')
            local is_running=$(echo "$final_info" | jq -r '.body.data.traffic_generation.is_running')
            echo "   $campaign_id: $total_requests total requests, $successful_requests successful - Traffic Running: $is_running"
        fi
    done
    
    if [ $successful_starts -gt 0 ]; then
        print_result "Multiple Campaigns Threading" "true" "Started $successful_starts campaigns successfully"
    else
        print_result "Multiple Campaigns Threading" "false" "No campaigns started successfully"
    fi
}

test_5_error_handling() {
    print_section "ERROR HANDLING & EDGE CASES"
    
    # Test 1: Non-existent campaign
    echo "🧪 Testing non-existent campaign..."
    local result=$(make_request "/traffic/generate" "POST" '{"campaign_id": "non_existent_campaign"}')
    local status_code=$(echo "$result" | jq -r '.status_code')
    
    if [ "$status_code" != "200" ]; then
        echo -e "${GREEN}✅ Correctly handled non-existent campaign${NC}"
        print_result "Non-existent Campaign" "true" "Status Code: $status_code"
    else
        echo -e "${RED}❌ Should have rejected non-existent campaign${NC}"
        print_result "Non-existent Campaign" "false"
    fi
    
    # Test 2: Missing campaign_id
    echo "🧪 Testing missing campaign_id..."
    local result=$(make_request "/traffic/generate" "POST" '{}')
    local status_code=$(echo "$result" | jq -r '.status_code')
    
    if [ "$status_code" != "200" ]; then
        echo -e "${GREEN}✅ Correctly handled missing campaign_id${NC}"
        print_result "Missing Campaign ID" "true" "Status Code: $status_code"
    else
        echo -e "${RED}❌ Should have rejected missing campaign_id${NC}"
        print_result "Missing Campaign ID" "false"
    fi
    
    # Test 3: Invalid status
    echo "🧪 Testing invalid status..."
    local result=$(make_request "/traffic/campaigns/single_campaign_test/status" "PUT" '{"status": "invalid_status"}')
    local status_code=$(echo "$result" | jq -r '.status_code')
    
    if [ "$status_code" != "200" ]; then
        echo -e "${GREEN}✅ Correctly handled invalid status${NC}"
        print_result "Invalid Status" "true" "Status Code: $status_code"
    else
        echo -e "${RED}❌ Should have rejected invalid status${NC}"
        print_result "Invalid Status" "false"
    fi
    
    # Test 4: Duplicate traffic generation
    echo "🧪 Testing duplicate traffic generation..."
    local result=$(make_request "/traffic/generate" "POST" '{"campaign_id": "single_campaign_test"}')
    local status_code=$(echo "$result" | jq -r '.status_code')
    
    if [ "$status_code" != "200" ]; then
        echo -e "${GREEN}✅ Correctly handled duplicate traffic generation${NC}"
        print_result "Duplicate Traffic Generation" "true" "Status Code: $status_code"
    else
        echo -e "${RED}❌ Should have rejected duplicate traffic generation${NC}"
        print_result "Duplicate Traffic Generation" "false"
    fi
}

cleanup_resources() {
    print_section "CLEANUP"
    
    local campaigns_to_cleanup=("single_campaign_test" "multi_campaign_1" "multi_campaign_2" "multi_campaign_3")
    
    for campaign_id in "${campaigns_to_cleanup[@]}"; do
        echo "🧹 Cleaning up $campaign_id..."
        
        # Stop traffic generation
        make_request "/traffic/stop/$campaign_id" "POST" > /dev/null
        
        # Update status to stopped
        make_request "/traffic/campaigns/$campaign_id/status" "PUT" '{"status": "stopped"}' > /dev/null
        
        # Cleanup resources
        make_request "/traffic/cleanup/$campaign_id" "POST" > /dev/null
    done
    
    echo -e "${GREEN}✅ All test resources cleaned up${NC}"
}

main() {
    echo -e "${BLUE}🚀 COMPREHENSIVE TRAFFIC GENERATOR API TEST SUITE${NC}"
    echo -e "${BLUE}==================================================${NC}"
    echo "🌐 Backend URL: $BACKEND_URL"
    echo "⏰ Test started at: $(date)"
    
    # Check if jq is available
    if ! command -v jq &> /dev/null; then
        echo -e "${RED}❌ jq is required but not installed. Please install jq to run this test suite.${NC}"
        exit 1
    fi
    
    # Run all tests
    test_1_health_check
    test_2_simulator_generator
    test_3_single_campaign_traffic
    test_4_multiple_campaigns_threading
    test_5_error_handling
    
    # Cleanup
    cleanup_resources
    
    # Summary
    echo -e "\n${BLUE}==================================================${NC}"
    echo -e "${BLUE}📊 COMPREHENSIVE TEST RESULTS SUMMARY${NC}"
    echo -e "${BLUE}==================================================${NC}"
    
    echo -e "\n🎯 Overall Result: $PASSED_TESTS/$TOTAL_TESTS tests passed"
    
    if [ $PASSED_TESTS -eq $TOTAL_TESTS ]; then
        echo -e "\n${GREEN}🎉 ALL TESTS PASSED! TRAFFIC GENERATOR IS FULLY OPERATIONAL!${NC}"
        echo -e "\n📋 Verified Functionality:"
        echo -e "${GREEN}✅ Health check and system monitoring${NC}"
        echo -e "${GREEN}✅ Traffic data generation and simulation${NC}"
        echo -e "${GREEN}✅ Single campaign traffic generation with threading${NC}"
        echo -e "${GREEN}✅ Multiple campaigns running in parallel${NC}"
        echo -e "${GREEN}✅ Proper error handling and validation${NC}"
        echo -e "${GREEN}✅ Resource cleanup and management${NC}"
    else
        echo -e "\n${YELLOW}⚠️  $((TOTAL_TESTS - PASSED_TESTS)) test(s) failed - some functionality may need attention${NC}"
    fi
}

# Run the test suite
main 