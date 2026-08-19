/**
 * ============================================
 * DODA KINO — Axios Client
 * ============================================
 *
 * Markaziy HTTP client.
 * - Base URL va timeout .env dan olinadi
 * - Request interceptor: har bir so'rovga Authorization token qo'shadi
 * - Response interceptor: 401 da tokenni refresh qiladi (retry pattern)
 * - Error normalization: barcha xatolar yagona formatga keltiriladi
 */

import axios from "axios";
import { TokenManager } from "./tokenManager";
import { ApiError } from "./errors";
import { getSelectedBotId, TENANT_PATH_PREFIXES } from "./botContext";

// ─── Axios Instance ──────────────────────────────────────────────
const client = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL,
  timeout: Number(process.env.REACT_APP_API_TIMEOUT) || 15000,
  withCredentials: true, // HttpOnly cookie (refreshToken) ni avtomatik yuborish uchun
  headers: {
    // DIQQAT: bu yerga "Content-Type": "application/json" qo'shmang.
    // axios v1 da global json Content-Type turgan bo'lsa, FormData JSON ga
    // aylantirib yuboriladi va fayl (poster/video) `{}` bo'lib yo'qoladi —
    // film yuklash "Film poster rasmi majburiy!" xatosi bilan yiqilardi.
    // Content-Type ni axios o'zi tanlaydi: obyekt -> application/json,
    // FormData -> multipart/form-data (boundary bilan).
    Accept: "application/json",
  },
});

// ─── Refresh holati (concurrent request lar uchun) ───────────────
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// ─── Request Interceptor ─────────────────────────────────────────
client.interceptors.request.use(
  (config) => {
    const token = TokenManager.getAccessToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // ── Multibot: kontent so'rovlariga tanlangan bot prefiksi ──
    // /film -> /8288956451/film . Tanlanmagan bo'lsa prefiks yo'q,
    // backend bunday so'rovni asosiy (birinchi) botga yo'naltiradi.
    // /admin, /logs, /instagram kabi umumiy yo'llar tegilmaydi.
    const botId = getSelectedBotId();
    if (
      botId &&
      config.url &&
      !config.url.startsWith(`/${botId}/`) &&
      TENANT_PATH_PREFIXES.some((p) => config.url.startsWith(p))
    ) {
      config.url = `/${botId}${config.url}`;
    }

    // Development rejimida har bir so'rovni log qilamiz
    if (process.env.NODE_ENV === "development") {
      console.log(
        `%c[API] ${config.method?.toUpperCase()} ${config.url}`,
        "color: #1EC442; font-weight: bold;",
        config.params || ""
      );
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response Interceptor ────────────────────────────────────────
client.interceptors.response.use(
  // Success — faqat data qaytaramiz
  (response) => response.data,

  // Error — markaziy xatolik boshqaruvi
  async (error) => {
    const originalRequest = error.config;

    // 401 Unauthorized — Token refresh pattern
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Login va refresh so'rovlarini skip qilamiz (cheksiz loop oldini olish)
      if (
        originalRequest.url?.includes("/admin/login") ||
        originalRequest.url?.includes("/admin/refresh") ||
        originalRequest.url?.includes("/admin/telegram-auth")
      ) {
        return Promise.reject(ApiError.fromAxios(error));
      }

      if (isRefreshing) {
        // Boshqa refresh jarayoni ketayotgan bo'lsa, navbatga qo'shamiz
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return client(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Backend refreshToken ni HttpOnly cookie dan o'qiydi
        // withCredentials: true tufayli cookie avtomatik yuboriladi
        const { data } = await axios.post(
          `${client.defaults.baseURL}/admin/refresh`,
          {},
          { withCredentials: true }
        );

        // Backend: { success: true, data: { accessToken } }
        const newAccessToken = data?.data?.accessToken || data?.accessToken;

        if (!newAccessToken) {
          throw new Error("Yangi access token olinmadi");
        }

        TokenManager.setAccessToken(newAccessToken);
        processQueue(null, newAccessToken);

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return client(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        TokenManager.clearTokens();

        // Login sahifasiga yo'naltirish
        window.dispatchEvent(new CustomEvent("auth:logout"));

        return Promise.reject(ApiError.fromAxios(refreshError));
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(ApiError.fromAxios(error));
  }
);

export default client;
