/**
 * ============================================
 * TROYA ADMIN — Token Manager
 * ============================================
 *
 * Gibrid token boshqaruvi:
 *  - Cookie (asosiy) + LocalStorage (barqaror zaxira):
 *    Brauzer qayta ochilganda yoki cross-domain Third-Party Cookie
 *    cheklovlari bo'lgan hollarda ham admin sessiyasi saqlanib qoladi.
 *  - Refresh token serverda HttpOnly cookie'da, zaxira sifatida esa
 *    localStorage da saqlanadi.
 *
 * Access token eskirsa client.js dagi interceptor 401 ni ushlab,
 * refresh qiladi va so'rovni qaytadan yuboradi.
 */

const ACCESS_TOKEN_KEY = "dodakino_access_token";
const REFRESH_TOKEN_KEY = "dodakino_refresh_token";

const setCookie = (name, value, rememberMe) => {
  let cookieString = `${name}=${encodeURIComponent(value)}; path=/; SameSite=Lax;`;

  if (window.location.protocol === "https:") {
    cookieString += " Secure;";
  }

  if (rememberMe) {
    const d = new Date();
    d.setTime(d.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 kun
    cookieString += ` expires=${d.toUTCString()};`;
  }
  document.cookie = cookieString;
};

const getCookie = (name) => {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? decodeURIComponent(match[2]) : null;
};

const deleteCookie = (name) => {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax;`;
};

/** JWT ning o'rta qismi — base64url. atob() "-" va "_" ni tanimaydi. */
const decodeJwt = (token) => {
  try {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
};

export const TokenManager = {
  // ─── Yozish ──────────────────────────────────────────────────
  setAccessToken(token, rememberMe = true) {
    if (token) {
      setCookie(ACCESS_TOKEN_KEY, token, rememberMe);
      try {
        if (rememberMe) {
          localStorage.setItem(ACCESS_TOKEN_KEY, token);
        } else {
          sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
        }
      } catch {}
    }
  },

  setRefreshToken(token, rememberMe = true) {
    if (token) {
      try {
        if (rememberMe) {
          localStorage.setItem(REFRESH_TOKEN_KEY, token);
        } else {
          sessionStorage.setItem(REFRESH_TOKEN_KEY, token);
        }
      } catch {}
    }
  },

  setTokens(accessToken, refreshToken = null, rememberMe = true) {
    this.setAccessToken(accessToken, rememberMe);
    if (refreshToken) {
      this.setRefreshToken(refreshToken, rememberMe);
    }
  },

  clearTokens() {
    deleteCookie(ACCESS_TOKEN_KEY);
    deleteCookie(REFRESH_TOKEN_KEY);
    try {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      sessionStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    } catch {}
  },

  // ─── O'qish ──────────────────────────────────────────────────
  getAccessToken() {
    return getCookie(ACCESS_TOKEN_KEY) || localStorage.getItem(ACCESS_TOKEN_KEY) || sessionStorage.getItem(ACCESS_TOKEN_KEY);
  },

  getRefreshToken() {
    return localStorage.getItem(REFRESH_TOKEN_KEY) || sessionStorage.getItem(REFRESH_TOKEN_KEY);
  },

  /**
   * Token bormi? Sinxron, tarmoqsiz — router aynan shuni so'raydi.
   * "Bor" degani "amal qiladi" degani EMAS: muddati o'tgan bo'lsa
   * birinchi API so'rovida interceptor uni fonda yangilaydi.
   */
  hasAccessToken() {
    return Boolean(this.getAccessToken());
  },

  hasRefreshToken() {
    return Boolean(this.getRefreshToken());
  },

  /** Token ichidagi ma'lumot: { id, role }. Nom JWT da yo'q — u /admin/me dan olinadi. */
  getUserFromToken() {
    const token = this.getAccessToken();
    if (!token) return null;
    const payload = decodeJwt(token);
    if (!payload) return null;
    return { id: payload.id, role: payload.role || "admin", exp: payload.exp };
  },

  isAccessTokenExpired(bufferSeconds = 30) {
    const user = this.getUserFromToken();
    if (!user?.exp) return true;
    return user.exp - bufferSeconds <= Math.floor(Date.now() / 1000);
  },

  isAuthenticated() {
    return this.hasAccessToken() || this.hasRefreshToken();
  },
};
