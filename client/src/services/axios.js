import axios from "axios";
import { APP_CONFIG } from "../constants/app";

const configuredBaseURL = String(
  import.meta.env.VITE_API_BASE_URL || ""
)
  .trim()
  .replace(/\/$/, "")
  .replace(/\/api$/, "");

const api = axios.create({
  // Development me empty baseURL Vite proxy ko use karega.
  // Production me VITE_API_BASE_URL=http://host:port/api bhi safely work karega.
  baseURL: configuredBaseURL,
  headers: {
    Accept: "application/json",
  },
});

// Attach JWT token automatically.
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(APP_CONFIG.TOKEN_KEY);

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Handle expired or invalid JWT globally.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(APP_CONFIG.TOKEN_KEY);
      sessionStorage.removeItem("login_email");

      if (window.location.pathname !== "/login") {
        window.location.replace("/login");
      }
    }

    return Promise.reject(error);
  }
);

export default api;
