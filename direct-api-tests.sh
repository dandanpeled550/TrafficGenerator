#!/bin/bash

# Direct API Tests for Traffic Generator Backend
# Tests each endpoint individually with detailed output

BACKEND_URL="https://trafficgenerator-hz4s.onrender.com"
API_BASE="$BACKEND_URL/api"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0

print_header() {
    echo -e "\n${BLUE}==================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}==================================================${NC}"
}

print_test() {
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
        echo "   $details"
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

# ============================================================================
# 1. HEALTH CHECK ENDPOINTS
# ============================================================================

test_health() {
    print_header "1. HEALTH CHECK ENDPOINTS"
    
    echo -e "\n${CYAN}Testing /traffic/health${NC}"
    result=$(make_request "/traffic/health")
    status_code=$(echo "$result" | jq -r '.status_code')
    body=$(echo "$result" | jq -r '.body')
    
    if [ "$status_code" = "200" ]; then
        status=$(echo "$body" | jq -r '.data.status // .status')
        active_campaigns=$(echo "$body" | jq -r '.data.total_active_campaigns // 0')
        print_test "Traffic Health Check" "true" "Status: $status, Active Campaigns: $active_campaigns"
    else
        print_test "Traffic Health Check" "false" "Status Code: $status_code"
    fi
}

# ============================================================================
# 2. TRAFFIC SIMULATION ENDPOINTS
# ============================================================================

test_traffic_simulation() {
    print_header "2. TRAFFIC SIMULATION ENDPOINTS"
    
    echo -e "\n${CYAN}Testing traffic data generation${NC}"
    test_data='{"test_type": "generate_traffic_data"}'
    result=$(make_request "/traffic/test" "POST" "$test_data")
    status_code=$(echo "$result" | jq -r '.status_code')
    
    if [ "$status_code" = "200" ]; then
        print_test "Traffic Data Generation" "true" "Status Code: $status_code"
    else
        print_test "Traffic Data Generation" "false" "Status Code: $status_code"
    fi
    
    echo -e "\n${CYAN}Testing request simulation${NC}"
    test_data='{"test_type": "simulate_request", "num_simulations": 3}'
    result=$(make_request "/traffic/test" "POST" "$test_data")
    status_code=$(echo "$result" | jq -r '.status_code')
    
    if [ "$status_code" = "200" ]; then
        print_test "Request Simulation" "true" "Status Code: $status_code"
    else
        print_test "Request Simulation" "false" "Status Code: $status_code"
    fi
}

# ============================================================================
# 3. PROFILES ENDPOINTS
# ============================================================================

test_profiles() {
    print_header "3. PROFILES ENDPOINTS"
    
    echo -e "\n${CYAN}Testing GET /profiles/ (list profiles)${NC}"
    result=$(make_request "/profiles/")
    status_code=$(echo "$result" | jq -r '.status_code')
    
    if [ "$status_code" = "200" ]; then
        profiles_count=$(echo "$result" | jq -r '.body | length')
        print_test "List Profiles" "true" "Found $profiles_count profiles"
    else
        print_test "List Profiles" "false" "Status Code: $status_code"
    fi
    
    echo -e "\n${CYAN}Testing POST /profiles/ (create profile)${NC}"
    profile_data='{
        "name": "Direct Test Profile",
        "description": "Profile created by direct API test",
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
    
    result=$(make_request "/profiles/" "POST" "$profile_data")
    status_code=$(echo "$result" | jq -r '.status_code')
    body=$(echo "$result" | jq -r '.body')
    
    if [ "$status_code" = "201" ]; then
        profile_id=$(echo "$body" | jq -r '.id')
        echo "   Created Profile ID: $profile_id"
        print_test "Create Profile" "true" "Profile ID: $profile_id"
        echo "$profile_id" > /tmp/test_profile_id
    else
        print_test "Create Profile" "false" "Status Code: $status_code"
        echo "   Response: $body"
        return 1
    fi
}

# ============================================================================
# 4. SESSIONS/CAMPAIGNS ENDPOINTS
# ============================================================================

test_sessions() {
    print_header "4. SESSIONS/CAMPAIGNS ENDPOINTS"
    
    if [ ! -f /tmp/test_profile_id ]; then
        echo -e "${RED}❌ No profile ID found. Run profiles test first.${NC}"
        return 1
    fi
    profile_id=$(cat /tmp/test_profile_id)
    
    echo -e "\n${CYAN}Testing GET /sessions/ (list sessions)${NC}"
    result=$(make_request "/sessions/")
    status_code=$(echo "$result" | jq -r '.status_code')
    
    if [ "$status_code" = "200" ]; then
        sessions_count=$(echo "$result" | jq -r '.body | length')
        print_test "List Sessions" "true" "Found $sessions_count sessions"
    else
        print_test "List Sessions" "false" "Status Code: $status_code"
    fi
    
    echo -e "\n${CYAN}Testing POST /sessions/ (create campaign)${NC}"
    campaign_data='{
        "name": "Direct Test Campaign",
        "target_url": "https://example.com/direct-test",
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
    
    result=$(make_request "/sessions/" "POST" "$campaign_data")
    status_code=$(echo "$result" | jq -r '.status_code')
    body=$(echo "$result" | jq -r '.body')
    
    if [ "$status_code" = "200" ]; then
        campaign_id=$(echo "$body" | jq -r '.id')
        echo "   Created Campaign ID: $campaign_id"
        print_test "Create Campaign" "true" "Campaign ID: $campaign_id"
        echo "$campaign_id" > /tmp/test_campaign_id
    else
        print_test "Create Campaign" "false" "Status Code: $status_code"
        echo "   Response: $body"
        return 1
    fi
}

# ============================================================================
# 5. TRAFFIC GENERATION ENDPOINTS
# ============================================================================

test_traffic_generation() {
    print_header "5. TRAFFIC GENERATION ENDPOINTS"
    
    if [ ! -f /tmp/test_campaign_id ]; then
        echo -e "${RED}❌ No campaign ID found. Run sessions test first.${NC}"
        return 1
    fi
    campaign_id=$(cat /tmp/test_campaign_id)
    
    echo -e "\n${CYAN}Testing GET /traffic/campaigns/{id}/info${NC}"
    result=$(make_request "/traffic/campaigns/$campaign_id/info")
    status_code=$(echo "$result" | jq -r '.status_code')
    
    if [ "$status_code" = "200" ]; then
        current_status=$(echo "$result" | jq -r '.body.data.basic_info.status')
        print_test "Get Campaign Info" "true" "Status: $current_status"
    else
        print_test "Get Campaign Info" "false" "Status Code: $status_code"
    fi
    
    echo -e "\n${CYAN}Testing PUT /traffic/campaigns/{id}/status (set to running)${NC}"
    status_data='{"status": "running"}'
    result=$(make_request "/traffic/campaigns/$campaign_id/status" "PUT" "$status_data")
    status_code=$(echo "$result" | jq -r '.status_code')
    
    if [ "$status_code" = "200" ]; then
        new_status=$(echo "$result" | jq -r '.body.new_status')
        print_test "Set Campaign Status" "true" "New Status: $new_status"
    else
        print_test "Set Campaign Status" "false" "Status Code: $status_code"
    fi
    
    echo -e "\n${CYAN}Testing POST /traffic/generate${NC}"
    start_data="{\"campaign_id\": \"$campaign_id\"}"
    result=$(make_request "/traffic/generate" "POST" "$start_data")
    status_code=$(echo "$result" | jq -r '.status_code')
    body=$(echo "$result" | jq -r '.body')
    
    if [ "$status_code" = "200" ]; then
        thread_id=$(echo "$body" | jq -r '.thread_id')
        print_test "Start Traffic Generation" "true" "Thread ID: $thread_id"
    else
        print_test "Start Traffic Generation" "false" "Status Code: $status_code"
        echo "   Response: $body"
    fi
    
    echo -e "\n${CYAN}Monitoring traffic generation for 10 seconds...${NC}"
    for i in {1..3}; do
        sleep 3
        result=$(make_request "/traffic/campaigns/$campaign_id/info")
        status_code=$(echo "$result" | jq -r '.status_code')
        
        if [ "$status_code" = "200" ]; then
            total_requests=$(echo "$result" | jq -r '.body.data.traffic_stats.total_requests')
            successful_requests=$(echo "$result" | jq -r '.body.data.traffic_stats.successful_requests')
            success_rate=$(echo "$result" | jq -r '.body.data.traffic_stats.success_rate')
            is_running=$(echo "$result" | jq -r '.body.data.traffic_generation.is_running')
            
            echo "   Check $i: $total_requests requests, $successful_requests successful ($success_rate%) - Running: $is_running"
        fi
    done
    
    echo -e "\n${CYAN}Testing POST /traffic/stop/{id}${NC}"
    result=$(make_request "/traffic/stop/$campaign_id" "POST")
    status_code=$(echo "$result" | jq -r '.status_code')
    
    if [ "$status_code" = "200" ]; then
        print_test "Stop Traffic Generation" "true" "Status Code: $status_code"
    else
        print_test "Stop Traffic Generation" "false" "Status Code: $status_code"
    fi
}

# ============================================================================
# 6. ERROR HANDLING TESTS
# ============================================================================

test_error_handling() {
    print_header "6. ERROR HANDLING TESTS"
    
    echo -e "\n${CYAN}Testing non-existent campaign${NC}"
    result=$(make_request "/traffic/generate" "POST" '{"campaign_id": "non_existent_campaign"}')
    status_code=$(echo "$result" | jq -r '.status_code')
    
    if [ "$status_code" = "404" ]; then
        print_test "Non-existent Campaign" "true" "Correctly returned 404"
    else
        print_test "Non-existent Campaign" "false" "Expected 404, got $status_code"
    fi
    
    echo -e "\n${CYAN}Testing missing campaign_id${NC}"
    result=$(make_request "/traffic/generate" "POST" '{}')
    status_code=$(echo "$result" | jq -r '.status_code')
    
    if [ "$status_code" = "400" ]; then
        print_test "Missing Campaign ID" "true" "Correctly returned 400"
    else
        print_test "Missing Campaign ID" "false" "Expected 400, got $status_code"
    fi
}

# ============================================================================
# 7. CLEANUP TESTS
# ============================================================================

test_cleanup() {
    print_header "7. CLEANUP TESTS"
    
    if [ -f /tmp/test_campaign_id ]; then
        campaign_id=$(cat /tmp/test_campaign_id)
        echo -e "\n${CYAN}Testing POST /traffic/cleanup/{id}${NC}"
        result=$(make_request "/traffic/cleanup/$campaign_id" "POST")
        status_code=$(echo "$result" | jq -r '.status_code')
        
        if [ "$status_code" = "200" ]; then
            print_test "Cleanup Campaign" "true" "Status Code: $status_code"
        else
            print_test "Cleanup Campaign" "false" "Status Code: $status_code"
        fi
    fi
    
    if [ -f /tmp/test_profile_id ]; then
        profile_id=$(cat /tmp/test_profile_id)
        echo -e "\n${CYAN}Testing DELETE /profiles/{id}${NC}"
        result=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X DELETE "$API_BASE/profiles/$profile_id")
        status_code=$(echo "$result" | grep "HTTP_STATUS:" | cut -d: -f2)
        
        if [ "$status_code" = "200" ]; then
            print_test "Delete Profile" "true" "Status Code: $status_code"
        else
            print_test "Delete Profile" "false" "Status Code: $status_code"
        fi
    fi
    
    # Clean up temporary files
    rm -f /tmp/test_profile_id /tmp/test_campaign_id
}

# ============================================================================
# MAIN TEST EXECUTION
# ============================================================================

main() {
    echo -e "${BLUE}🚀 DIRECT API TESTS FOR TRAFFIC GENERATOR${NC}"
    echo -e "${BLUE}==================================================${NC}"
    echo "🌐 Backend URL: $BACKEND_URL"
    echo "⏰ Test started at: $(date)"
    
    if ! command -v jq &> /dev/null; then
        echo -e "${RED}❌ jq is required but not installed. Please install jq to run this test suite.${NC}"
        exit 1
    fi
    
    test_health
    test_traffic_simulation
    test_profiles
    test_sessions
    test_traffic_generation
    test_error_handling
    test_cleanup
    
    echo -e "\n${BLUE}==================================================${NC}"
    echo -e "${BLUE}📊 DIRECT API TEST RESULTS SUMMARY${NC}"
    echo -e "${BLUE}==================================================${NC}"
    
    echo -e "\n🎯 Overall Result: $PASSED_TESTS/$TOTAL_TESTS tests passed"
    
    if [ $PASSED_TESTS -eq $TOTAL_TESTS ]; then
        echo -e "\n${GREEN}🎉 ALL DIRECT API TESTS PASSED!${NC}"
    else
        echo -e "\n${YELLOW}⚠️  $((TOTAL_TESTS - PASSED_TESTS)) test(s) failed${NC}"
    fi
}

main 