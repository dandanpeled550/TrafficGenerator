// Frontend-Backend Compatibility Test
// Tests all API endpoints from the frontend perspective

const API_BASE_URL = 'https://trafficgenerator-hz4s.onrender.com';

// Test configuration
const testConfig = {
  profile: {
    name: "Frontend Test Profile",
    description: "Profile created by frontend-backend compatibility test",
    demographics: {
      age_group: "25-34",
      gender: "any",
      interests: ["gaming", "social_media"]
    },
    device_preferences: {
      device_brand: "samsung",
      device_models: ["Galaxy S24"],
      operating_system: "android"
    },
    app_usage: {
      preferred_app_categories: ["Games", "Social Networking"],
      session_duration_avg_minutes: 45
    },
    rtb_specifics: {
      preferred_ad_formats: ["banner", "interstitial"],
      adid_persistence: "per_user"
    }
  },
  campaign: {
    name: "Frontend Test Campaign",
    target_url: "https://example.com/frontend-test",
    requests_per_minute: 10,
    duration_minutes: 1,
    geo_locations: ["United States"],
    rtb_config: {
      device_brand: "samsung",
      device_models: ["Galaxy S24"],
      ad_formats: ["banner"],
      app_categories: ["IAB9"]
    }
  }
};

// Test results
const testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
};

// Utility functions
const log = (message, type = 'info') => {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
  console.log(`${prefix} [${timestamp}] ${message}`);
};

const makeRequest = async (url, options = {}) => {
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    credentials: 'include'
  };
  
  const finalOptions = { ...defaultOptions, ...options };
  
  try {
    const response = await fetch(url, finalOptions);
    const data = await response.json();
    
    return {
      status: response.status,
      ok: response.ok,
      data: data
    };
  } catch (error) {
    return {
      status: 0,
      ok: false,
      data: { error: error.message }
    };
  }
};

const runTest = async (testName, testFunction) => {
  testResults.total++;
  log(`Running test: ${testName}`);
  
  try {
    const result = await testFunction();
    if (result.success) {
      testResults.passed++;
      log(`${testName}: PASSED`, 'success');
      testResults.details.push({ test: testName, status: 'PASSED', details: result.details });
    } else {
      testResults.failed++;
      log(`${testName}: FAILED - ${result.error}`, 'error');
      testResults.details.push({ test: testName, status: 'FAILED', error: result.error });
    }
  } catch (error) {
    testResults.failed++;
    log(`${testName}: FAILED - ${error.message}`, 'error');
    testResults.details.push({ test: testName, status: 'FAILED', error: error.message });
  }
};

// Test functions
const testHealthCheck = async () => {
  const response = await makeRequest(`${API_BASE_URL}/api/traffic/health`);
  
  if (response.ok && response.data.success) {
    return {
      success: true,
      details: `Status: ${response.data.data?.status || response.data.status}`
    };
  }
  
  return {
    success: false,
    error: `Health check failed: ${response.status} - ${JSON.stringify(response.data)}`
  };
};

const testProfileCreation = async () => {
  const response = await makeRequest(`${API_BASE_URL}/api/profiles/`, {
    method: 'POST',
    body: JSON.stringify(testConfig.profile)
  });
  
  if (response.ok && response.status === 201) {
    return {
      success: true,
      details: `Profile ID: ${response.data.id}`,
      profileId: response.data.id
    };
  }
  
  return {
    success: false,
    error: `Profile creation failed: ${response.status} - ${JSON.stringify(response.data)}`
  };
};

const testProfileListing = async () => {
  const response = await makeRequest(`${API_BASE_URL}/api/profiles/`);
  
  if (response.ok && Array.isArray(response.data)) {
    return {
      success: true,
      details: `Found ${response.data.length} profiles`
    };
  }
  
  return {
    success: false,
    error: `Profile listing failed: ${response.status} - ${JSON.stringify(response.data)}`
  };
};

const testCampaignCreation = async (profileId) => {
  const campaignData = {
    ...testConfig.campaign,
    user_profile_ids: [profileId],
    profile_user_counts: { [profileId]: 50 }
  };
  
  const response = await makeRequest(`${API_BASE_URL}/api/sessions/`, {
    method: 'POST',
    body: JSON.stringify(campaignData)
  });
  
  if (response.ok && response.status === 200) {
    return {
      success: true,
      details: `Campaign ID: ${response.data.id}`,
      campaignId: response.data.id
    };
  }
  
  return {
    success: false,
    error: `Campaign creation failed: ${response.status} - ${JSON.stringify(response.data)}`
  };
};

const testCampaignListing = async () => {
  const response = await makeRequest(`${API_BASE_URL}/api/sessions/`);
  
  if (response.ok && Array.isArray(response.data)) {
    return {
      success: true,
      details: `Found ${response.data.length} campaigns`
    };
  }
  
  return {
    success: false,
    error: `Campaign listing failed: ${response.status} - ${JSON.stringify(response.data)}`
  };
};

const testCampaignStatusUpdate = async (campaignId) => {
  const response = await makeRequest(`${API_BASE_URL}/api/traffic/campaigns/${campaignId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status: 'running' })
  });
  
  if (response.ok && response.status === 200) {
    return {
      success: true,
      details: `Status updated to: ${response.data.new_status}`
    };
  }
  
  return {
    success: false,
    error: `Status update failed: ${response.status} - ${JSON.stringify(response.data)}`
  };
};

const testCampaignInfo = async (campaignId) => {
  const response = await makeRequest(`${API_BASE_URL}/api/traffic/campaigns/${campaignId}/info`);
  
  if (response.ok && response.data.success) {
    return {
      success: true,
      details: `Campaign status: ${response.data.data.basic_info.status}`
    };
  }
  
  return {
    success: false,
    error: `Campaign info failed: ${response.status} - ${JSON.stringify(response.data)}`
  };
};

const testTrafficGeneration = async (campaignId) => {
  const response = await makeRequest(`${API_BASE_URL}/api/traffic/generate`, {
    method: 'POST',
    body: JSON.stringify({ campaign_id: campaignId })
  });
  
  if (response.ok && response.status === 200) {
    return {
      success: true,
      details: `Thread ID: ${response.data.thread_id}`
    };
  }
  
  return {
    success: false,
    error: `Traffic generation failed: ${response.status} - ${JSON.stringify(response.data)}`
  };
};

const testTrafficMonitoring = async (campaignId) => {
  const response = await makeRequest(`${API_BASE_URL}/api/traffic/campaigns/${campaignId}/info`);
  
  if (response.ok && response.data.success) {
    const stats = response.data.data.traffic_stats;
    return {
      success: true,
      details: `Requests: ${stats.total_requests}, Success: ${stats.successful_requests}`
    };
  }
  
  return {
    success: false,
    error: `Traffic monitoring failed: ${response.status} - ${JSON.stringify(response.data)}`
  };
};

const testTrafficStop = async (campaignId) => {
  const response = await makeRequest(`${API_BASE_URL}/api/traffic/stop/${campaignId}`, {
    method: 'POST'
  });
  
  if (response.ok && response.status === 200) {
    return {
      success: true,
      details: 'Traffic generation stopped successfully'
    };
  }
  
  return {
    success: false,
    error: `Traffic stop failed: ${response.status} - ${JSON.stringify(response.data)}`
  };
};

const testTrafficCleanup = async (campaignId) => {
  const response = await makeRequest(`${API_BASE_URL}/api/traffic/cleanup/${campaignId}`, {
    method: 'POST'
  });
  
  if (response.ok && response.status === 200) {
    return {
      success: true,
      details: 'Campaign cleanup completed'
    };
  }
  
  return {
    success: false,
    error: `Campaign cleanup failed: ${response.status} - ${JSON.stringify(response.data)}`
  };
};

const testTrafficSimulation = async () => {
  const response = await makeRequest(`${API_BASE_URL}/api/traffic/test`, {
    method: 'POST',
    body: JSON.stringify({ test_type: 'generate_traffic_data' })
  });
  
  if (response.ok && response.status === 200) {
    return {
      success: true,
      details: 'Traffic simulation test passed'
    };
  }
  
  return {
    success: false,
    error: `Traffic simulation failed: ${response.status} - ${JSON.stringify(response.data)}`
  };
};

const testErrorHandling = async () => {
  // Test non-existent campaign
  const response = await makeRequest(`${API_BASE_URL}/api/traffic/generate`, {
    method: 'POST',
    body: JSON.stringify({ campaign_id: 'non_existent_campaign' })
  });
  
  if (response.status === 404) {
    return {
      success: true,
      details: 'Error handling working correctly (404 for non-existent campaign)'
    };
  }
  
  return {
    success: false,
    error: `Error handling failed: Expected 404, got ${response.status}`
  };
};

// Main test execution
const runAllTests = async () => {
  log('🚀 Starting Frontend-Backend Compatibility Tests');
  log(`🌐 Backend URL: ${API_BASE_URL}`);
  log('==================================================');
  
  let profileId = null;
  let campaignId = null;
  
  // Basic connectivity tests
  await runTest('Health Check', testHealthCheck);
  await runTest('Traffic Simulation', testTrafficSimulation);
  await runTest('Error Handling', testErrorHandling);
  
  // Profile management tests
  await runTest('Profile Listing', testProfileListing);
  const profileResult = await runTest('Profile Creation', testProfileCreation);
  if (profileResult && profileResult.profileId) {
    profileId = profileResult.profileId;
  }
  
  // Campaign management tests
  await runTest('Campaign Listing', testCampaignListing);
  if (profileId) {
    const campaignResult = await runTest('Campaign Creation', () => testCampaignCreation(profileId));
    if (campaignResult && campaignResult.campaignId) {
      campaignId = campaignResult.campaignId;
    }
  }
  
  // Traffic generation tests
  if (campaignId) {
    await runTest('Campaign Info', () => testCampaignInfo(campaignId));
    await runTest('Campaign Status Update', () => testCampaignStatusUpdate(campaignId));
    await runTest('Traffic Generation Start', () => testTrafficGeneration(campaignId));
    
    // Wait a bit for traffic to generate
    log('⏳ Waiting 5 seconds for traffic generation...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    await runTest('Traffic Monitoring', () => testTrafficMonitoring(campaignId));
    await runTest('Traffic Stop', () => testTrafficStop(campaignId));
    await runTest('Traffic Cleanup', () => testTrafficCleanup(campaignId));
  }
  
  // Results summary
  log('==================================================');
  log('📊 FRONTEND-BACKEND COMPATIBILITY TEST RESULTS');
  log('==================================================');
  log(`🎯 Overall Result: ${testResults.passed}/${testResults.total} tests passed`);
  
  if (testResults.passed === testResults.total) {
    log('🎉 ALL TESTS PASSED! Frontend and backend are fully compatible!', 'success');
  } else {
    log(`⚠️  ${testResults.failed} test(s) failed - compatibility issues detected`, 'error');
  }
  
  // Detailed results
  log('\n📋 Detailed Results:');
  testResults.details.forEach(detail => {
    const status = detail.status === 'PASSED' ? '✅' : '❌';
    log(`${status} ${detail.test}: ${detail.status}`);
    if (detail.error) {
      log(`   Error: ${detail.error}`);
    }
    if (detail.details) {
      log(`   Details: ${detail.details}`);
    }
  });
  
  return testResults;
};

// Export for use in browser or Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runAllTests, testResults };
} else {
  // Browser environment
  window.FrontendBackendTest = { runAllTests, testResults };
}

// Auto-run if this script is executed directly
if (typeof window !== 'undefined') {
  // Browser environment - run when loaded
  window.addEventListener('load', () => {
    console.log('Frontend-Backend Compatibility Test loaded. Run window.FrontendBackendTest.runAllTests() to start testing.');
  });
} 