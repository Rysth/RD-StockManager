import axios from "axios";
import toast from "react-hot-toast";

// Create a single axios instance for the entire app
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "",
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  withCredentials: true,
});

// Add a request interceptor to add auth token to every request
api.interceptors.request.use(
  (config) => {
    // Always send the token if it exists — don't gate on user state,
    // because we need it for the /me fetch that runs right after OTP verification
    // (at that point the zustand user is still null).
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// ─── Token-refresh state ────────────────────────────────────────────────────
let isRefreshing = false;
type QueueEntry = {
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
};
let failedQueue: QueueEntry[] = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((entry) => {
    if (error) {
      entry.reject(error);
    } else {
      entry.resolve(token!);
    }
  });
  failedQueue = [];
};

const forceLogout = () => {
  localStorage.removeItem("auth-storage");
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  window.location.href = "/auth/signin";
};
// ────────────────────────────────────────────────────────────────────────────

// Add a response interceptor to handle common errors
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const url: string = err?.config?.url || "";
    const originalRequest = err.config;

    // Endpoints that are allowed to return 401 without forcing logout
    const allow401 = [
      "/api/v1/auth/login",
      "/api/v1/auth/register",
      "/api/v1/verify-account",
      "/api/v1/verify-account-resend",
      "/api/v1/reset-password",
      "/api/v1/reset-password-request",
      "/api/v1/create-account",
    ];

    const isAllowed401 =
      err.response?.status === 401 &&
      allow401.some(
        (p) => url.endsWith(p) || url.includes(`${p}?`) || url.includes(p),
      );

    if (isAllowed401) {
      return Promise.reject(err);
    }

    // ── Handle 401 with token refresh ───────────────────────────────────────
    if (err.response?.status === 401) {
      // If the refresh endpoint itself returned 401, the refresh token is gone — log out
      if (url.includes("/api/v1/auth/token/refresh")) {
        toast.error(
          "Tu sesión ha expirado. Por favor, inicia sesión de nuevo.",
        );
        forceLogout();
        return Promise.reject(err);
      }

      // If a refresh is already in flight, queue this request
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return api(originalRequest);
          })
          .catch((queueErr) => Promise.reject(queueErr));
      }

      const storedRefreshToken = localStorage.getItem("refresh_token");

      // No refresh token available at all — force logout immediately
      if (!storedRefreshToken) {
        toast.error(
          "Tu sesión ha expirado. Por favor, inicia sesión de nuevo.",
        );
        forceLogout();
        return Promise.reject(err);
      }

      isRefreshing = true;

      try {
        const response = await axios.post(
          `${import.meta.env.VITE_API_URL || ""}/api/v1/auth/token/refresh`,
          { refresh_token: storedRefreshToken },
          { headers: { "Content-Type": "application/json" } },
        );

        const newAccessToken: string =
          response.data.token ??
          response.data.access_token ??
          response.data.token?.value;
        const newRefreshToken: string | undefined = response.data.refresh_token;

        localStorage.setItem("access_token", newAccessToken);
        if (newRefreshToken) {
          localStorage.setItem("refresh_token", newRefreshToken);
        }
        api.defaults.headers.common["Authorization"] =
          `Bearer ${newAccessToken}`;

        processQueue(null, newAccessToken);

        // Retry the original failed request with the new token
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        toast.error(
          "Tu sesión ha expirado. Por favor, inicia sesión de nuevo.",
        );
        forceLogout();
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    // Handle other errors if needed
    if (err.response?.status >= 500) {
      toast.error(
        "Ocurrió un error en el servidor. Inténtalo de nuevo más tarde.",
      );
    }

    return Promise.reject(err);
  },
);

// Helper functions for token management
export const saveToken = (token: string, tokenType: string = "Bearer") => {
  // Store token in localStorage instead of sessionStorage for cross-tab persistence
  localStorage.setItem("access_token", token);
  api.defaults.headers.common["Authorization"] = `${tokenType} ${token}`;
};

export const clearToken = () => {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  delete api.defaults.headers.common["Authorization"];
};

export default api;
