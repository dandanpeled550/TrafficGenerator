// Log the API URL being used
console.log('Using API URL:', import.meta.env.VITE_API_URL);

const handleResponse = async (response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error || errorData.message || 'Unknown error occurred';
    console.error('API Error:', errorMessage);
    throw new Error(errorMessage);
  }
  return response.json();
};

const defaultHeaders = {
  "Content-Type": "application/json",
  "Accept": "application/json",
};

const backendClient = {
  // Traffic Endpoints
  traffic: {
    generate: async (config) => {
      console.log('Generating traffic with params:', config);
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/traffic/generate`, {
          method: "POST",
          headers: defaultHeaders,
          body: JSON.stringify(config),
          credentials: "include",
        });
        const data = await handleResponse(response);
        if (!data.success) {
          throw new Error(data.message || 'Failed to generate traffic');
        }
        return data;
      } catch (error) {
        console.error('Traffic generation error:', error);
        return {
          success: false,
          message: error.message
        };
      }
    },
    getAllGenerated: async () => {
      console.log('Fetching all generated traffic');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/traffic/generated`, {
        headers: defaultHeaders,
        credentials: "include",
      });
      return handleResponse(response);
    },
    getCampaignGenerated: async (campaignId) => {
      console.log('Fetching generated traffic for campaign:', campaignId);
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/traffic/generated/${campaignId}`, {
        headers: defaultHeaders,
        credentials: "include",
      });
      return handleResponse(response);
    },
    getCampaignStats: async (campaignId) => {
      console.log('Fetching stats for campaign:', campaignId);
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/traffic/stats/${campaignId}`, {
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
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/sessions/`, {
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
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/sessions/${sessionId}`, {
        headers: defaultHeaders,
        credentials: "include",
      });
      return handleResponse(response);
    },
    create: async (sessionData) => {
      console.log('Creating session:', sessionData);
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/sessions/`, {
        method: "POST",
        headers: defaultHeaders,
        body: JSON.stringify(sessionData),
        credentials: "include",
      });
      return handleResponse(response);
    },
    update: async (sessionId, updateData) => {
      console.log('Updating session:', sessionId, updateData);
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/sessions/${sessionId}`, {
        method: "PUT",
        headers: defaultHeaders,
        body: JSON.stringify(updateData),
        credentials: "include",
      });
      return handleResponse(response);
    },
    delete: async (sessionId) => {
      console.log('Deleting session:', sessionId);
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/sessions/${sessionId}`, {
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
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/profiles/`, {
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
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/profiles/${profileId}`, {
        headers: defaultHeaders,
        credentials: "include",
      });
      return handleResponse(response);
    },
    create: async (profileData) => {
      console.log('Creating profile:', profileData);
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/profiles/`, {
        method: "POST",
        headers: defaultHeaders,
        body: JSON.stringify(profileData),
        credentials: "include",
      });
      return handleResponse(response);
    },
    update: async (profileId, updateData) => {
      console.log('Updating profile:', profileId, updateData);
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/profiles/${profileId}`, {
        method: "PUT",
        headers: defaultHeaders,
        body: JSON.stringify(updateData),
        credentials: "include",
      });
      return handleResponse(response);
    },
    delete: async (profileId) => {
      console.log('Deleting profile:', profileId);
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/profiles/${profileId}`, {
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
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/health`, {
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