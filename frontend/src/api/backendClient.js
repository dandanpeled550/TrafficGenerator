// Log the API URL being used
console.log('Using API URL:', import.meta.env.VITE_API_URL);

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const handleResponse = async (response) => {
  const data = await response.json();
  console.log('API Response:', {
    status: response.status,
    data: data
  });

  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
};

const defaultHeaders = {
  "Content-Type": "application/json",
  "Accept": "application/json",
};

const backendClient = {
  // Traffic Endpoints
  traffic: {
    generate: async (config) => {
      console.log('About to start traffic generation');
      try {
        await backendClient.traffic.appendCampaignLog(
          config.campaign_id,
          { message: 'About to start traffic generation with config: ' + JSON.stringify(config), level: 'info' }
        );
        const response = await fetch(`${API_BASE_URL}/api/traffic/generate`, {
          method: 'POST',
          headers: defaultHeaders,
          credentials: "include",
          body: JSON.stringify(config),
        });
        const data = await response.json();
        
        // Handle both success and error cases
        if (!response.ok) {
          return {
            success: false,
            error: data.error || 'Failed to start traffic generation',
            status: data.status
          };
        }
        
        return {
          success: true,
          ...data
        };
      } catch (error) {
        console.error('Error generating traffic:', error);
        return {
          success: false,
          error: error.message || 'Failed to start traffic generation'
        };
      }
    },
    stop: async (campaignId) => {
      try {
        await backendClient.traffic.appendCampaignLog(
          campaignId,
          { message: 'About to stop traffic generation for campaign: ' + campaignId, level: 'info' }
        );
        const response = await fetch(`${API_BASE_URL}/api/traffic/stop/${campaignId}`, {
          method: 'POST',
          headers: defaultHeaders,
          credentials: "include",
        });
        return await handleResponse(response);
      } catch (error) {
        console.error('Error stopping traffic generation:', error);
        throw error;
      }
    },
    monitor: async (campaignId) => {
      try {
        await backendClient.traffic.appendCampaignLog(
          campaignId,
          { message: 'About to get monitoring data for campaign: ' + campaignId, level: 'info' }
        );
        const response = await fetch(`${API_BASE_URL}/api/traffic/monitor/${campaignId}`, {
          headers: defaultHeaders,
          credentials: "include",
        });
        return await handleResponse(response);
      } catch (error) {
        console.error('Error getting monitoring data:', error);
        throw error;
      }
    },
    getStatus: async (campaignId) => {
      console.log('About to get status for campaign: ' + campaignId);
      try {
        await backendClient.traffic.appendCampaignLog(
          campaignId,
          { message: 'About to get status for campaign: ' + campaignId, level: 'info' }
        );
        const response = await fetch(`${API_BASE_URL}/api/traffic/status/${campaignId}`, {
          headers: defaultHeaders,
          credentials: "include",
        });
        return await handleResponse(response);
      } catch (error) {
        console.error('Error getting campaign status:', error);
        throw error;
      }
    },
    getGenerated: async (campaignId = null) => {
      try {
        const url = campaignId 
          ? `${API_BASE_URL}/api/traffic/generated/${campaignId}`
          : `${API_BASE_URL}/api/traffic/generated`;
        await backendClient.traffic.appendCampaignLog(
          campaignId || 'all',
          { message: 'About to fetch generated traffic: ' + url, level: 'info' }
        );
        const response = await fetch(url, {
          headers: defaultHeaders,
          credentials: "include",
        });
        return await handleResponse(response);
      } catch (error) {
        console.error('Error fetching generated traffic:', error);
        throw error;
      }
    },
    getStats: async (campaignId) => {
      console.log('About to get stats for campaign: ' + campaignId);
      try {
        await backendClient.traffic.appendCampaignLog(
          campaignId,
          { message: 'About to get stats for campaign: ' + campaignId, level: 'info' }
        );
        const response = await fetch(`${API_BASE_URL}/api/traffic/stats/${campaignId}`, {
          headers: defaultHeaders,
          credentials: "include",
        });
        return await handleResponse(response);
      } catch (error) {
        console.error('Error getting campaign stats:', error);
        throw error;
      }
    },
    checkHealth: async () => {
      try {
        await backendClient.traffic.appendCampaignLog(
          'system',
          { message: 'About to check backend health', level: 'info' }
        );
        const response = await fetch(`${API_BASE_URL}/api/traffic/health`, {
          headers: defaultHeaders,
          credentials: "include",
        });
        return await handleResponse(response);
      } catch (error) {
        console.error('Error checking backend health:', error);
        throw error;
      }
    },
    // NEW: Campaign management endpoints
    getCampaignInfo: async (campaignId) => {
      try {
        await backendClient.traffic.appendCampaignLog(
          campaignId,
          { message: 'About to get campaign info: ' + campaignId, level: 'info' }
        );
        const response = await fetch(`${API_BASE_URL}/api/traffic/campaigns/${campaignId}/info`, {
          headers: defaultHeaders,
          credentials: "include",
        });
        return await handleResponse(response);
      } catch (error) {
        console.error('Error getting campaign info:', error);
        throw error;
      }
    },
    updateCampaignStatus: async (campaignId, status) => {
      try {
        await backendClient.traffic.appendCampaignLog(
          campaignId,
          { message: 'About to update campaign status: ' + campaignId + ' to ' + status, level: 'info' }
        );
        const response = await fetch(`${API_BASE_URL}/api/traffic/campaigns/${campaignId}/status`, {
          method: 'PUT',
          headers: defaultHeaders,
          credentials: "include",
          body: JSON.stringify({ status }),
        });
        return await handleResponse(response);
      } catch (error) {
        console.error('Error updating campaign status:', error);
        throw error;
      }
    },
    cleanupCampaign: async (campaignId) => {
      try {
        await backendClient.traffic.appendCampaignLog(
          campaignId,
          { message: 'About to cleanup campaign: ' + campaignId, level: 'info' }
        );
        const response = await fetch(`${API_BASE_URL}/api/traffic/cleanup/${campaignId}`, {
          method: 'POST',
          headers: defaultHeaders,
          credentials: "include",
        });
        return await handleResponse(response);
      } catch (error) {
        console.error('Error cleaning up campaign:', error);
        throw error;
      }
    },
    downloadTraffic: async (campaignId) => {
      try {
        await backendClient.traffic.appendCampaignLog(
          campaignId,
          { message: 'About to download traffic for campaign: ' + campaignId, level: 'info' }
        );
        const response = await fetch(`${API_BASE_URL}/api/traffic/download/${campaignId}`, {
          headers: defaultHeaders,
          credentials: "include",
        });
        return await handleResponse(response);
      } catch (error) {
        console.error('Error downloading traffic:', error);
        throw error;
      }
    },
    testTrafficFunctions: async (testType, testData = {}) => {
      try {
        console.log('Testing traffic functions:', testType);
        const response = await fetch(`${API_BASE_URL}/api/traffic/test`, {
          method: 'POST',
          headers: defaultHeaders,
          credentials: "include",
          body: JSON.stringify({ test_type: testType, ...testData }),
        });
        return await handleResponse(response);
      } catch (error) {
        console.error('Error testing traffic functions:', error);
        throw error;
      }
    },
    generateSample: async (formData) => {
      try {
        console.log('Generating sample traffic data:', formData);
        const response = await fetch(`${API_BASE_URL}/api/traffic/test`, {
          method: 'POST',
          headers: defaultHeaders,
          credentials: "include",
          body: JSON.stringify({ 
            test_type: "generate_traffic_data",
            config: formData 
          }),
        });
        return await handleResponse(response);
      } catch (error) {
        console.error('Error generating sample traffic data:', error);
        throw error;
      }
    },
    appendCampaignLog: async (campaignId, { message, level = "info" }) => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/traffic/campaigns/${campaignId}/log`, {
          method: "POST",
          headers: defaultHeaders,
          credentials: "include",
          body: JSON.stringify({ message, level }),
        });
        return await handleResponse(response);
      } catch (error) {
        // Optionally log to console or ignore
        // console.error("Error appending campaign log:", error);
        return { success: false, error: error.message };
      }
    },
    resumeTraffic: async (campaignId) => {
      try {
        await backendClient.traffic.appendCampaignLog(
          campaignId,
          { message: 'About to resume traffic for campaign: ' + campaignId, level: 'info' }
        );
        const response = await fetch(`${API_BASE_URL}/api/traffic/resume/${campaignId}`, {
          method: 'POST',
          headers: defaultHeaders,
          credentials: "include",
        });
        return await handleResponse(response);
      } catch (error) {
        console.error('Error resuming traffic:', error);
        throw error;
      }
    },
  },

  // Session Endpoints
  sessions: {
    list: async () => {
      console.log('Fetching all sessions');
      try {
        const response = await fetch(`${API_BASE_URL}/api/sessions/`, {
          headers: defaultHeaders,
          credentials: "include",
        });
        return handleResponse(response);
      } catch (error) {
        console.error('Failed to fetch sessions:', error);
        return []; // Return empty array instead of throwing
      }
    },
    get: async (sessionId) => {
      console.log('Fetching session:', sessionId);
      const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}`, {
        headers: defaultHeaders,
        credentials: "include",
      });
      return handleResponse(response);
    },
    create: async (sessionData) => {
      console.log('Creating session:', sessionData);
      const response = await fetch(`${API_BASE_URL}/api/sessions/`, {
        method: "POST",
        headers: defaultHeaders,
        body: JSON.stringify(sessionData),
        credentials: "include",
      });
      return handleResponse(response);
    },
    update: async (sessionId, updateData) => {
      console.log('Updating session:', sessionId, updateData);
      const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}`, {
        method: "PUT",
        headers: defaultHeaders,
        body: JSON.stringify(updateData),
        credentials: "include",
      });
      return handleResponse(response);
    },
    delete: async (sessionId) => {
      console.log('Deleting session:', sessionId);
      const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}`, {
        method: "DELETE",
        headers: defaultHeaders,
        credentials: "include",
      });
      return handleResponse(response);
    },
  },

  // Profile Endpoints
  profiles: {
    list: async () => {
      console.log('Fetching all profiles');
      try {
        const response = await fetch(`${API_BASE_URL}/api/profiles/`, {
          headers: defaultHeaders,
          credentials: "include",
        });
        return handleResponse(response);
      } catch (error) {
        console.error('Failed to fetch profiles:', error);
        return []; // Return empty array instead of throwing
      }
    },
    get: async (profileId) => {
      console.log('Fetching profile:', profileId);
      const response = await fetch(`${API_BASE_URL}/api/profiles/${profileId}`, {
        headers: defaultHeaders,
        credentials: "include",
      });
      return handleResponse(response);
    },
    create: async (profileData) => {
      console.log('Creating profile:', profileData);
      const response = await fetch(`${API_BASE_URL}/api/profiles/`, {
        method: "POST",
        headers: defaultHeaders,
        body: JSON.stringify(profileData),
        credentials: "include",
      });
      return handleResponse(response);
    },
    update: async (profileId, updateData) => {
      console.log('Updating profile:', profileId, updateData);
      const response = await fetch(`${API_BASE_URL}/api/profiles/${profileId}`, {
        method: "PUT",
        headers: defaultHeaders,
        body: JSON.stringify(updateData),
        credentials: "include",
      });
      return handleResponse(response);
    },
    delete: async (profileId) => {
      console.log('Deleting profile:', profileId);
      const response = await fetch(`${API_BASE_URL}/api/profiles/${profileId}`, {
        method: "DELETE",
        headers: defaultHeaders,
        credentials: "include",
      });
      return handleResponse(response);
    },
  },

  // Connection check endpoint
  checkConnection: async () => {
    console.log('Checking connection to backend...');
    try {
      const response = await fetch(`${API_BASE_URL}/api/health`, {
        headers: defaultHeaders,
        credentials: "include",
      });
      const data = await handleResponse(response);
      console.log("Connection check response:", data);
      return data;
    } catch (error) {
      console.error('Connection check failed:', error);
      throw new Error(`Failed to connect to backend: ${error.message}`);
    }
  },
};

export default backendClient; 