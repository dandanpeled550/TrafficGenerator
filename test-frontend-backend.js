// Test script to verify frontend-backend connection
const API_BASE_URL = 'https://trafficgenerator-hz4s.onrender.com';

const testFrontendBackendConnection = async () => {
  console.log('🧪 Testing Frontend-Backend Connection...\n');

  const tests = [
    {
      name: 'Health Check',
      url: `${API_BASE_URL}/health`,
      method: 'GET'
    },
    {
      name: 'Traffic Health Check',
      url: `${API_BASE_URL}/api/traffic/health`,
      method: 'GET'
    },
    {
      name: 'Sessions List',
      url: `${API_BASE_URL}/api/sessions/`,
      method: 'GET'
    },
    {
      name: 'Profiles List',
      url: `${API_BASE_URL}/api/profiles/`,
      method: 'GET'
    },
    {
      name: 'Traffic Test - Simulate Request',
      url: `${API_BASE_URL}/api/traffic/test`,
      method: 'POST',
      body: JSON.stringify({
        test_type: 'simulate_request',
        num_simulations: 2
      })
    }
  ];

  const results = [];

  for (const test of tests) {
    try {
      console.log(`📡 Testing: ${test.name}`);
      
      const options = {
        method: test.method,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Origin': 'https://trafficgenerator-1.onrender.com'
        }
      };

      if (test.body) {
        options.body = test.body;
      }

      const startTime = Date.now();
      const response = await fetch(test.url, options);
      const endTime = Date.now();
      
      const responseTime = endTime - startTime;
      const data = await response.json();

      const result = {
        test: test.name,
        success: response.ok,
        status: response.status,
        responseTime: `${responseTime}ms`,
        data: data
      };

      results.push(result);

      if (response.ok) {
        console.log(`✅ ${test.name}: SUCCESS (${responseTime}ms)`);
        console.log(`   Status: ${response.status}`);
        if (data.success !== undefined) {
          console.log(`   API Success: ${data.success}`);
        }
      } else {
        console.log(`❌ ${test.name}: FAILED (${responseTime}ms)`);
        console.log(`   Status: ${response.status}`);
        console.log(`   Error: ${data.error || data.message || 'Unknown error'}`);
      }
      console.log('');

    } catch (error) {
      console.log(`❌ ${test.name}: ERROR`);
      console.log(`   Error: ${error.message}`);
      console.log('');
      
      results.push({
        test: test.name,
        success: false,
        error: error.message
      });
    }
  }

  // Summary
  console.log('📊 Test Summary:');
  console.log('================');
  
  const successfulTests = results.filter(r => r.success);
  const failedTests = results.filter(r => !r.success);
  
  console.log(`✅ Successful: ${successfulTests.length}/${results.length}`);
  console.log(`❌ Failed: ${failedTests.length}/${results.length}`);
  
  if (failedTests.length > 0) {
    console.log('\n❌ Failed Tests:');
    failedTests.forEach(test => {
      console.log(`   - ${test.test}: ${test.error || `Status ${test.status}`}`);
    });
  }

  console.log('\n🎯 Frontend-Backend Connection Status:');
  if (successfulTests.length === results.length) {
    console.log('✅ EXCELLENT - All tests passed! Frontend and backend are properly connected.');
  } else if (successfulTests.length >= results.length * 0.8) {
    console.log('⚠️  GOOD - Most tests passed. Minor issues may exist.');
  } else {
    console.log('❌ POOR - Multiple connection issues detected.');
  }

  return results;
};

// Run the test
testFrontendBackendConnection()
  .then(results => {
    console.log('\n🏁 Test completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Test failed with error:', error);
    process.exit(1);
  }); 