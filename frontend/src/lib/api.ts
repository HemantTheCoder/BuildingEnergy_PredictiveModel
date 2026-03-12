import axios from 'axios';

// Normalize the API URL: remove trailing slashes and ensure protocol
const getBaseUrl = () => {
  let url = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
  // Remove trailing slashes
  return url.replace(/\/+$/, "");
};

const API_BASE = getBaseUrl();

const api = axios.create({
  baseURL: API_BASE,
});

// Log the actual URL being called in development/production for easier debugging
api.interceptors.request.use((config) => {
  console.log(`[API Request] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
  return config;
});

export { API_BASE };
export default api;
