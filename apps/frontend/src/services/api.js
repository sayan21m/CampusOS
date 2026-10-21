import axios from "axios";

const TOKEN_KEY = "campusos_token";

const API_PREFIX = "/api/v1";

function withApiPrefix(baseUrl) {
  return baseUrl.endsWith(API_PREFIX) ? baseUrl : `${baseUrl}${API_PREFIX}`;
}

function resolveApiBaseUrl() {
  const configured = String(import.meta.env.VITE_API_URL || "")
    .trim()
    .replace(/\/+$/, "");

  if (configured) {
    return withApiPrefix(configured);
  }

  if (import.meta.env.DEV) {
    return `http://localhost:3000${API_PREFIX}`;
  }

  throw new Error(
    "VITE_API_URL is required in production (e.g. https://your-service.onrender.com/api/v1)."
  );
}

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Let the browser set multipart boundaries for FormData uploads.
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  } else if (!config.headers["Content-Type"]) {
    config.headers["Content-Type"] = "application/json";
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem("campusos_user");

      if (!window.location.pathname.startsWith("/login")) {
        window.location.assign("/login");
      }
    }

    return Promise.reject(error);
  }
);

export { TOKEN_KEY };
export default api;
