const axios = require('axios');

const BACKEND_URL = 'https://traffic-generator-backend.onrender.com';

// Test configuration
const TEST_CONFIG = {
    profiles: [
        {
            id: 'profile_mobile_1',
            name: 'Mobile Users - High Activity',
            device_type: 'mobile',
            behavior_pattern: 'high_activity',
            geo_location: 'United States',
            interests: ['gaming', 'social_media'],
            session_duration: 45,
            page_views_per_session: 8
        },
        {
            id: 'profile_desktop_1', 
            name: 'Desktop Users - Business',
            device_type: 'desktop',
            behavior_pattern: 'business',
            geo_location: 'Canada',
            interests: ['technology', 'business'],
            session_duration: 30,
            page_views_per_session: 5
        },
        {
            id: 'profile_tablet_1',
            name: 'Tablet Users - Casual',
            device_type: 'tablet', 
            behavior_pattern: 'casual',
            geo_location: 'United Kingdom',
            interests: ['entertainment', 'shopping'],
            session_duration: 25,
            page_views_per_session: 4
        }
    ],
    campaigns: [
        {
            id: 'campaign_1',
            name: 'High Volume Mobile Campaign',
            target_url: 'https://example.com/mobile',
            requests_per_minute: 15,
            duration_minutes: 2,
            user_profile_ids: ['profile_mobile_1'],
            profile_user_counts: { 'profile_mobile_1': 100 }
        },
        {
            id: 'campaign_2', 
            name: 'Business Desktop Campaign',
            target_url: 'https://example.com/business',
            requests_per_minute: 10,
            duration_minutes: 3,
            user_profile_ids: ['profile_desktop_1'],
            profile_user_counts: { 'profile_desktop_1': 75 }
        },
        {
            id: 'campaign_3',
            name: 'Multi-Profile Campaign',
            target_url: 'https://example.com/mixed',
            requests_per_minute: 12,
            duration_minutes: 2,
            user_profile_ids: ['profile_mobile_1', 'profile_tablet_1'],
            profile_user_counts: { 'profile_mobile_1': 50, 'profile_tablet_1': 30 }
        }
    ]
};

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function makeRequest(endpoint, method = 'GET', data = null) {
    try {
        const config = {
            method,
            url: `${BACKEND_URL}${endpoint}`,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        if (data) {
            config.data = data;
        }
        
        const response = await axios(config);
        return { success: true, data: response.data };
    } catch (error) {
        return { 
            success: false, 
            error: error.response?.data || error.message,
            status: error.response?.status
        };
    }
}

async function createTestProfiles() {
    console.log('\n🔧 Creating test profiles...');
    
    for (const profile of TEST_CONFIG.profiles) {
        const result = await makeRequest('/profiles', 'POST', profile);
        if (result.success) {
            console.log(`✅ Created profile: ${profile.name}`);
        } else {
            console.log(`❌ Failed to create profile ${profile.name}:`, result.error);
        }
    }
}

async function createTestCampaigns() {
    console.log('\n🎯 Creating test campaigns...');
    
    for (const campaign of TEST_CONFIG.campaigns) {
        const result = await makeRequest('/sessions', 'POST', campaign);
        if (result.success) {
            console.log(`✅ Created campaign: ${campaign.name} (ID: ${campaign.id})`);
        } else {
            console.log(`❌ Failed to create campaign ${campaign.name}:`, result.error);
        }
    }
}

async function updateCampaignStatus(campaignId, status) {
    console.log(`🔄 Updating campaign ${campaignId} status to: ${status}`);
    
    const result = await makeRequest(`/traffic/campaigns/${campaignId}/status`, 'PUT', { status });
    if (result.success) {
        console.log(`✅ Campaign ${campaignId} status updated to ${status}`);
        return result.data;
    } else {
        console.log(`❌ Failed to update campaign ${campaignId} status:`, result.error);
        return null;
    }
}

async function getCampaignInfo(campaignId) {
    const result = await makeRequest(`/traffic/campaigns/${campaignId}/info`);
    if (result.success) {
        return result.data;
    } else {
        console.log(`❌ Failed to get campaign info for ${campaignId}:`, result.error);
        return null;
    }
}

async function startTrafficGeneration(campaignId) {
    console.log(`🚀 Starting traffic generation for campaign ${campaignId}...`);
    
    const result = await makeRequest('/traffic/generate', 'POST', { campaign_id: campaignId });
    if (result.success) {
        console.log(`✅ Traffic generation started for campaign ${campaignId}`);
        return result.data;
    } else {
        console.log(`❌ Failed to start traffic generation for campaign ${campaignId}:`, result.error);
        return null;
    }
}

async function monitorCampaign(campaignId, duration = 30) {
    console.log(`📊 Monitoring campaign ${campaignId} for ${duration} seconds...`);
    
    const startTime = Date.now();
    const endTime = startTime + (duration * 1000);
    
    while (Date.now() < endTime) {
        const info = await getCampaignInfo(campaignId);
        if (info) {
            const stats = info.data.traffic_stats;
            const generation = info.data.traffic_generation;
            
            console.log(`📈 Campaign ${campaignId}: ${stats.total_requests} requests, ${stats.successful_requests} successful (${stats.success_rate.toFixed(1)}% success rate) - Traffic running: ${generation.is_running}`);
        }
        
        await sleep(5000); // Check every 5 seconds
    }
}

async function stopCampaign(campaignId) {
    console.log(`🛑 Stopping campaign ${campaignId}...`);
    
    const result = await makeRequest(`/traffic/stop/${campaignId}`, 'POST');
    if (result.success) {
        console.log(`✅ Campaign ${campaignId} stopped successfully`);
        return result.data;
    } else {
        console.log(`❌ Failed to stop campaign ${campaignId}:`, result.error);
        return null;
    }
}

async function cleanupCampaign(campaignId) {
    console.log(`🧹 Cleaning up campaign ${campaignId}...`);
    
    const result = await makeRequest(`/traffic/cleanup/${campaignId}`, 'POST');
    if (result.success) {
        console.log(`✅ Campaign ${campaignId} cleaned up successfully`);
        return result.data;
    } else {
        console.log(`❌ Failed to cleanup campaign ${campaignId}:`, result.error);
        return null;
    }
}

async function testMultipleCampaignManagement() {
    console.log('🚀 Testing Improved Multiple Campaign Management');
    console.log('=' .repeat(60));
    
    try {
        // Step 1: Create test profiles and campaigns
        await createTestProfiles();
        await createTestCampaigns();
        
        // Step 2: Test campaign status management
        console.log('\n📋 Testing Campaign Status Management...');
        
        for (const campaign of TEST_CONFIG.campaigns) {
            // First, try to start traffic generation without setting status to 'running'
            console.log(`\n🔍 Testing campaign ${campaign.id} - attempting to start traffic without proper status...`);
            const startResult = await startTrafficGeneration(campaign.id);
            
            if (!startResult) {
                console.log(`✅ Correctly rejected traffic generation for campaign ${campaign.id} (status not 'running')`);
            }
            
            // Now set status to 'running'
            await updateCampaignStatus(campaign.id, 'running');
            
            // Get campaign info to verify status
            const info = await getCampaignInfo(campaign.id);
            if (info) {
                console.log(`✅ Campaign ${campaign.id} status: ${info.data.basic_info.status}`);
            }
        }
        
        // Step 3: Start traffic generation for all campaigns
        console.log('\n🚀 Starting Traffic Generation for All Campaigns...');
        
        const startPromises = TEST_CONFIG.campaigns.map(async (campaign) => {
            const result = await startTrafficGeneration(campaign.id);
            if (result) {
                console.log(`✅ Started traffic generation for ${campaign.name}`);
                return { campaign: campaign.id, success: true };
            } else {
                console.log(`❌ Failed to start traffic generation for ${campaign.name}`);
                return { campaign: campaign.id, success: false };
            }
        });
        
        const startResults = await Promise.all(startPromises);
        const successfulStarts = startResults.filter(r => r.success);
        
        console.log(`\n📊 Traffic generation started for ${successfulStarts.length}/${TEST_CONFIG.campaigns.length} campaigns`);
        
        // Step 4: Monitor campaigns for a short period
        console.log('\n📊 Monitoring Campaigns...');
        
        const monitorPromises = successfulStarts.map(async ({ campaign }) => {
            await monitorCampaign(campaign, 15); // Monitor for 15 seconds
        });
        
        await Promise.all(monitorPromises);
        
        // Step 5: Check final status of all campaigns
        console.log('\n📋 Final Campaign Status Check...');
        
        for (const campaign of TEST_CONFIG.campaigns) {
            const info = await getCampaignInfo(campaign.id);
            if (info) {
                const stats = info.data.traffic_stats;
                const generation = info.data.traffic_generation;
                
                console.log(`📊 Campaign ${campaign.id}:`);
                console.log(`   - Status: ${info.data.basic_info.status}`);
                console.log(`   - Traffic Running: ${generation.is_running}`);
                console.log(`   - Total Requests: ${stats.total_requests}`);
                console.log(`   - Success Rate: ${stats.success_rate.toFixed(1)}%`);
                console.log(`   - Has Traffic Data: ${stats.has_traffic_data}`);
            }
        }
        
        // Step 6: Stop and cleanup campaigns
        console.log('\n🛑 Stopping and Cleaning Up Campaigns...');
        
        for (const campaign of TEST_CONFIG.campaigns) {
            await stopCampaign(campaign.id);
            await updateCampaignStatus(campaign.id, 'stopped');
            await cleanupCampaign(campaign.id);
        }
        
        // Step 7: Verify cleanup
        console.log('\n🔍 Verifying Cleanup...');
        
        for (const campaign of TEST_CONFIG.campaigns) {
            const info = await getCampaignInfo(campaign.id);
            if (info) {
                const generation = info.data.traffic_generation;
                console.log(`✅ Campaign ${campaign.id}: Traffic running = ${generation.is_running}, Status = ${info.data.basic_info.status}`);
            }
        }
        
        console.log('\n🎉 Multiple Campaign Management Test Completed Successfully!');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

async function testErrorHandling() {
    console.log('\n🧪 Testing Error Handling...');
    
    // Test 1: Try to start traffic for non-existent campaign
    console.log('\n🔍 Test 1: Non-existent campaign');
    const result1 = await startTrafficGeneration('non_existent_campaign');
    if (!result1) {
        console.log('✅ Correctly handled non-existent campaign');
    }
    
    // Test 2: Try to update status of non-existent campaign
    console.log('\n🔍 Test 2: Update status of non-existent campaign');
    const result2 = await updateCampaignStatus('non_existent_campaign', 'running');
    if (!result2) {
        console.log('✅ Correctly handled status update for non-existent campaign');
    }
    
    // Test 3: Try invalid status
    console.log('\n🔍 Test 3: Invalid status');
    const result3 = await updateCampaignStatus(TEST_CONFIG.campaigns[0].id, 'invalid_status');
    if (!result3) {
        console.log('✅ Correctly handled invalid status');
    }
    
    console.log('\n✅ Error handling tests completed');
}

// Run the tests
async function runTests() {
    console.log('🚀 Starting Improved Multiple Campaign Management Tests');
    console.log('=' .repeat(60));
    
    await testMultipleCampaignManagement();
    await testErrorHandling();
    
    console.log('\n🎉 All tests completed!');
}

runTests().catch(console.error); 