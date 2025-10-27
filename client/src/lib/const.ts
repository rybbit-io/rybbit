// Helper function to get the backend URL dynamically
const getBackendURL = () => {
  // For server-side rendering or build time, use the environment variable
  if (typeof window === "undefined") {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "";
    return backendUrl === "http://localhost:3001"
      ? "http://localhost:3001/api"
      : `${backendUrl}/api`;
  }
  
  // For client-side, use the current origin to support multiple domains
  // This allows the same instance to be accessed from different domains
  return `${window.location.origin}/api`;
};

export const BACKEND_URL = getBackendURL();
export const IS_CLOUD = (process.env.NEXT_PUBLIC_CLOUD || "") === "true";

// Time constants
export const MINUTES_IN_24_HOURS = 24 * 60; // 1440 minutes

export const DEMO_HOSTNAME = "demo.rybbit.com";

export const FREE_SITE_LIMIT = 1;
export const STANDARD_SITE_LIMIT = 5;
export const PRO_SITE_LIMIT = 100;

export const STANDARD_TEAM_LIMIT = 3;
export const PRO_TEAM_LIMIT = 10;
