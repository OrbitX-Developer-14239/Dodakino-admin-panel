/**
 * ============================================
 * TROYA ADMIN — Axios Client
 * ============================================
 *
 * Markaziy HTTP client.
 *  - Base URL va timeout .env dan
 *  - Access token `Authorization: Bearer` sarlavhasida
 *  - Botga xos so'rovlarga tanlangan bot prefiksi (/<botId>/film ...)
 *  - 401 → refresh token bilan yangi access token olinadi va so'rov
 *    qaytadan yuboriladi; refresh ham o'xshamasa "auth:logout"
 *  - Barcha xatolar ApiError ga keltiriladi
 */

import axios from "axios";
import NProgress from "../utils/progress";
import { TokenManager } from "./tokenManager";
import { ApiError } from "./errors";
import { getSelectedBotId, TENANT_PATH_PREFIXES } from "./botContext";

// ─── NProgress — haqiqiy so'rovlarga bog'langan progress ─────────
// Bar birinchi so'rov boshlanganda chiqadi va OXIRGI faol so'rov
// tugagandagina yakunlanadi — tezlik haqiqiy tarmoq holatini aks
// ettiradi, soxta timer emas.
//
// FON SO'ROVLARI: `client.get(url, { silent: true })` chiziqni umuman
// ko'rsatmaydi. Panel ko'p joyda avtomatik yangilanadi — silent
// bo'lmasa bar tinimsiz miltillardi.
let activeRequests = 0;

const isSilent = (config) => Boolean(config?.silent);

const progressStart = () => {
  if (activeRequests === 0) NProgress.start();
  activeRequests += 1;
};

const progressDone = () => {
  activeRequests = Math.max(0, activeRequests - 1);
  if (activeRequests === 0) NProgress.done();
};

export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "/api";

/** API ildizidan "/api" siz manzil — /health va socket uchun. */
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, "");

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: Number(process.env.REACT_APP_API_TIMEOUT) || 20000,
  // Refresh token HttpOnly cookie'da — uni yuborish uchun
  withCredentials: true,
  // Content-Type ATAYLAB berilmaydi: axios uni o'zi qo'yadi. "application/json"
  // qat'iy yozilsa, fayl yuklashdagi FormData JSON ga aylantirilib yuborilardi.
  headers: {
    Accept: "application/json",
  },
});

// ─── Request interceptor ────────────────────────────────────────
client.interceptors.request.use(
  (config) => {
    if (!isSilent(config)) progressStart();

    const token = TokenManager.getAccessToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;

    // Multibot: /film -> /8887969510/film. Tanlanmagan bo'lsa prefiks
    // yo'q — backend bunday so'rovni asosiy (birinchi) botga yo'naltiradi.
    const botId = getSelectedBotId();
    if (
      botId &&
      config.url &&
      !config.url.startsWith(`/${botId}/`) &&
      TENANT_PATH_PREFIXES.some((p) => config.url.startsWith(p))
    ) {
      config.url = `/${botId}${config.url}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Vaqtinchalik uzilishda qayta urinish.
 *
 * Server qayta ishga tushganda port bir necha soniya yopiq bo'ladi va
 * nginx 502 qaytaradi. Foydalanuvchi uchun bu "panel buzildi" degani —
 * aslida esa u yerda kutish kerak edi, xolos.
 *
 * Faqat O'QISH so'rovlari qaytariladi. POST ni qayta yuborish xavfli:
 * film ikki marta yaratilishi mumkin — server so'rovni qabul qilib,
 * javobi yo'lda yo'qolgan bo'lsa biz buni bila olmaymiz.
 */
const RETRY_DELAYS_MS = [600, 1500];

const isTransient = (error) => {
  const status = error.response?.status;
  if (status === 502 || status === 503 || status === 504) return true;
  // Javob umuman kelmadi — ulanish rad etildi yoki uzildi
  return !error.response && error.code !== "ECONNABORTED";
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ─── Refresh navbati ────────────────────────────────────────────
// Bir vaqtda bir nechta so'rov 401 olsa, refresh BIR marta yuboriladi,
// qolganlari natijani kutib turadi. Aks holda har biri o'z refreshini
// yuborib, ular bir-birining sessiyasini almashtirib yuborardi.
let refreshing = null;

const refreshAccessToken = () => {
  if (!refreshing) {
    refreshing = axios
      .post(`${API_BASE_URL}/admin/refresh`, {}, { withCredentials: true })
      .then(({ data }) => {
        const token = data?.data?.accessToken || data?.accessToken;
        if (!token) throw new Error("Yangi access token olinmadi");
        TokenManager.setAccessToken(token);
        return token;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
};

/** Refresh qilinmaydigan yo'llar — ularda 401 "kirish rad etildi" degani */
const AUTH_PATHS = ["/admin/login", "/admin/refresh", "/admin/telegram-auth"];

// ─── Response interceptor ───────────────────────────────────────
client.interceptors.response.use(
  (response) => {
    if (!isSilent(response.config)) progressDone();
    return response.data;
  },

  async (error) => {
    const config = error.config || {};
    const status = error.response?.status;
    const url = config.url || "";

    // Hisobni MAJBURAN yopamiz: bu urinish `progressStart()` bilan
    // ochilgan edi. Qayta urinish o'zining `progressStart()` ini
    // chaqiradi, shuning uchun bu yerda yopilmasa hisoblagich o'sib
    // ketib, yuklanish chizig'i abadiy ekranda qolardi.
    if (!isSilent(config)) progressDone();

    const method = String(config.method || "get").toLowerCase();
    if (method === "get" && isTransient(error)) {
      config.__retries = config.__retries || 0;
      if (config.__retries < RETRY_DELAYS_MS.length) {
        const wait = RETRY_DELAYS_MS[config.__retries];
        config.__retries += 1;
        await sleep(wait);
        return client(config);
      }
    }

    // 401 — access token eskirgan. Bir marta yangilab, so'rovni qaytaramiz.
    if (status === 401 && !config.__refreshed && !AUTH_PATHS.some((p) => url.includes(p))) {
      try {
        const token = await refreshAccessToken();
        config.__refreshed = true;
        config.headers.Authorization = `Bearer ${token}`;
        return client(config);
      } catch (refreshError) {
        TokenManager.clearTokens();
        window.dispatchEvent(new CustomEvent("auth:logout"));
        return Promise.reject(ApiError.fromAxios(refreshError));
      }
    }

    return Promise.reject(ApiError.fromAxios(error));
  }
);

export default client;
