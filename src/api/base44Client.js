import { createClient } from '@base44/sdk';
// import { getAccessToken } from '@base44/sdk/utils/auth-utils';

// Create a client with authentication required
export const base44 = createClient({
  appId: "684007654ea29ec5ee5f6bcc", 
  requiresAuth: true // Ensure authentication is required for all operations
});
