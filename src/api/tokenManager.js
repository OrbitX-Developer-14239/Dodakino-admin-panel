/**
 * ============================================
 * DODA KINO — Token Manager
 * ============================================
 *
 * JWT token boshqaruvi.
 * - Access va Refresh tokenlarni localStorage da saqlash
 * - Token decode qilish (exp tekshirish uchun)
 * - Xavfsiz clear mexanizmi
 *
 * Nima uchun class emas hook?
 * → TokenManager interceptor ichida (React tashqarisida) ishlatiladi.
 * → Hook faqat component ichida ishlaydi, lekin token logikasi
 *   axios interceptor, service, va context larda kerak.
 */

const ACCESS_TOKEN_KEY = "dodakino_access_token";
const REFRESH_TOKEN_KEY = "dodakino_refresh_token";

// Helper functions for cookies
const setCookie = (name, value, rememberMe) => {
  let cookieString = `${name}=${value}; path=/;`;
  if (rememberMe) {
    const d = new Date();
    d.setTime(d.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 kun
    cookieString += ` expires=${d.toUTCString()};`;
  }
  document.cookie = cookieString;
};

const getCookie = (name) => {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  if (match) return match[2];
  return null;
};

const deleteCookie = (name) => {
  document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
};

export const TokenManager = {
  // ─── Getters ─────────────────────────────────────────────────
  getAccessToken() {
    return getCookie(ACCESS_TOKEN_KEY);
  },

  getRefreshToken() {
    return getCookie(REFRESH_TOKEN_KEY);
  },

  // ─── Setters ─────────────────────────────────────────────────
  setTokens(accessToken, refreshToken, rememberMe = true) {
    this.clearTokens();
    
    if (accessToken) {
      setCookie(ACCESS_TOKEN_KEY, accessToken, rememberMe);
    }
    if (refreshToken) {
      setCookie(REFRESH_TOKEN_KEY, refreshToken, rememberMe);
    }
  },

  setAccessToken(token, rememberMe = true) {
    setCookie(ACCESS_TOKEN_KEY, token, rememberMe);
  },

  // ─── Clear ───────────────────────────────────────────────────
  clearTokens() {
    deleteCookie(ACCESS_TOKEN_KEY);
    deleteCookie(REFRESH_TOKEN_KEY);
    
    // Fallback: clear from old storages if exists
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  },

  // ─── Token Decode ────────────────────────────────────────────
  /**
   * JWT payload ni decode qilish (signature tekshirmasdan)
   * Faqat client-side exp, role kabi ma'lumotlar uchun
   */
  decodeToken(token) {
    try {
      if (!token) return null;
      const payload = token.split(".")[1];
      const decoded = atob(payload);
      return JSON.parse(decoded);
    } catch {
      return null;
    }
  },

  // ─── Token Validity ──────────────────────────────────────────
  /**
   * Access token muddati tugaganmi?
   * bufferSeconds: token tugashidan N sekund oldin "tugagan" deb hisoblaymiz
   */
  isAccessTokenExpired(bufferSeconds = 30) {
    const token = this.getAccessToken();
    if (!token) return true;

    const payload = this.decodeToken(token);
    if (!payload?.exp) return true;

    const now = Math.floor(Date.now() / 1000);
    return payload.exp - bufferSeconds <= now;
  },

  // ─── User Info ───────────────────────────────────────────────
  /**
   * Token ichidan user ma'lumotlarini olish
   */
  getUserFromToken() {
    const token = this.getAccessToken();
    if (!token) return null;

    const payload = this.decodeToken(token);
    if (!payload) return null;

    return {
      id: payload.sub || payload.id || payload.userId,
      role: payload.role || "user",
      email: payload.email,
      name: payload.name,
    };
  },

  // ─── Auth Status ─────────────────────────────────────────────
  isAuthenticated() {
    return !this.isAccessTokenExpired();
  },
};
