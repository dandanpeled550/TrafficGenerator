const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const backendClient = {
  // Traffic Endpoints
  traffic: {
    generate: async (config) => {
      const response = await fetch(`${API_URL}/api/traffic/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(config),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to generate traffic");
      }
      return response.json();
    },
    getAllGenerated: async () => {
      const response = await fetch(`${API_URL}/api/traffic/generated`);
      if (!response.ok) {
        throw new Error("Failed to fetch all generated traffic");
      }
      return response.json();
    },
    getCampaignGenerated: async (campaignId) => {
      const response = await fetch(`${API_URL}/api/traffic/generated/${campaignId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch traffic for campaign ${campaignId}`);
      }
      return response.json();
    },
  },

  // Session Endpoints
  sessions: {
    list: async () => {
      const response = await fetch(`${API_URL}/api/sessions/`);
      if (!response.ok) {
        throw new Error("Failed to list sessions");
      }
      return response.json();
    },
    get: async (sessionId) => {
      const response = await fetch(`${API_URL}/api/sessions/${sessionId}`);
      if (!response.ok) {
        throw new Error(`Failed to get session ${sessionId}`);
      }
      return response.json();
    },
    create: async (sessionData) => {
      const response = await fetch(`${API_URL}/api/sessions/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sessionData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to create session");
      }
      return response.json();
    },
    update: async (sessionId, updateData) => {
      const response = await fetch(`${API_URL}/api/sessions/${sessionId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to update session");
      }
      return response.json();
    },
    delete: async (sessionId) => {
      const response = await fetch(`${API_URL}/api/sessions/${sessionId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error(`Failed to delete session ${sessionId}`);
      }
      return response.json();
    },
  },

  // New: Connection check endpoint
  checkConnection: async () => {
    try {
      const response = await fetch(`${API_URL}/api/health`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Health check failed: ${response.status} ${response.statusText} - ${errorText}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Connection check error:", error);
      throw new Error(`Failed to connect to backend: ${error.message}`);
    }
  },
};

export default backendClient; 