import axios from 'axios';

const BASE_URL = (import.meta.env.VITE_API_URL as string) || '';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 35000,
});

api.interceptors.request.use((config) => {
  console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
  return config;
});

export const API_BASE = BASE_URL;
export default api;
