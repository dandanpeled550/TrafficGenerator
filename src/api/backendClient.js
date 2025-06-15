const API_URL = import.meta.env.VITE_API_URL || "https://trafficgenerator-1.onrender.com";

// Log the API URL being used
console.log('Using API URL:', API_URL);

const defaultHeaders = {
  "Content-Type": "application/json",
  "Accept": "application/json",
};

const handleResponse = async (response) => {
  console.log('Response status:', response.status);
  console.log('Response headers:', response.headers);
  
  const data = await response.json();
  console.log('Response data:', data);
  
  if (!response.ok) {
    console.error('API Error:', data);
    throw new Error(data.error || 'API request failed');
  }
  return data;
};

const backendClient = {
  // Traffic Endpoints
  traffic: {
    generate: async (config) => {
      console.log('Generating traffic with params:', config);
      const response = await fetch(`${API_URL}/api/traffic/generate`, {
        method: "POST",
        headers: defaultHeaders,
        body: JSON.stringify(config),
        credentials: "include",
      });
      return handleResponse(response);
    },
    getAllGenerated: async () => {
      console.log('Fetching all generated traffic');
      const response = await fetch(`${API_URL}/api/traffic/generated`, {
        headers: defaultHeaders,
        credentials: "include",
      });
      return handleResponse(response);
    },
    getCampaignGenerated: async (campaignId) => {
      console.log('Fetching generated traffic for campaign:', campaignId);
      const response = await fetch(`${API_URL}/api/traffic/generated/${campaignId}`, {
        headers: defaultHeaders,
        credentials: "include",
      });
      return handleResponse(response);
    },
    getCampaignStats: async (campaignId) => {
      console.log('Fetching stats for campaign:', campaignId);
      const response = await fetch(`${API_URL}/api/traffic/stats/${campaignId}`, {
        headers: defaultHeaders,
        credentials: "include",
      });
      return handleResponse(response);
    },
  },

  // Session Endpoints
  sessions: {
    list: async () => {
      console.log('Fetching all sessions');
      const response = await fetch(`${API_URL}/api/sessions/`, {
        headers: defaultHeaders,
        credentials: "include",
      });
      return handleResponse(response);
    },
    get: async (sessionId) => {
      console.log('Fetching session:', sessionId);
      const response = await fetch(`${API_URL}/api/sessions/${sessionId}`, {
        headers: defaultHeaders,
        credentials: "include",
      });
      return handleResponse(response);
    },
    create: async (sessionData) => {
      console.log('Creating session:', sessionData);
      const response = await fetch(`${API_URL}/api/sessions/`, {
        method: "POST",
        headers: defaultHeaders,
        body: JSON.stringify(sessionData),
        credentials: "include",
      });
      return handleResponse(response);
    },
    update: async (sessionId, updateData) => {
      console.log('Updating session:', sessionId, updateData);
      const response = await fetch(`${API_URL}/api/sessions/${sessionId}`, {
        method: "PUT",
        headers: defaultHeaders,
        body: JSON.stringify(updateData),
        credentials: "include",
      });
      return handleResponse(response);
    },
    delete: async (sessionId) => {
      console.log('Deleting session:', sessionId);
      const response = await fetch(`${API_URL}/api/sessions/${sessionId}`, {
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
      const response = await fetch(`${API_URL}/api/health`, {
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