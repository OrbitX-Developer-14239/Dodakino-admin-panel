/**
 * ============================================
 * TROYA ADMIN — Token Manager
 * ============================================
 *
 * Interfeys o'zgarmagan — `hasAccessToken()`, `clearTokens()`,
 * `getUserFromToken()`, `isAuthenticated()`. Router, layout va navbar
 * aynan shularga tayanadi.
 *
 * ICHKARIDA — JWT:
 *  - access token (15 daqiqa) oddiy cookie'da: router "kirganmi?"
 *    degan savolga SINXRON (0 ms) javob olishi kerak, har sahifa
 *    ochilishida so'rov kutib o'tirmasdan;
 *  - refresh token HttpOnly cookie'da, uni faqat server ko'radi
 *    (`/api/admin/*` yo'li uchun). JavaScript unga umuman tegmaydi —
 *    XSS bo'lganda ham uzoq muddatli sessiya o'g'irlanmaydi.
 *
 * Access token eskirsa client.js dagi interceptor 401 ni ushlab,
 * refresh qiladi va so'rovni qaytadan yuboradi.
 */

const ACCESS_TOKEN_KEY = "dodakino_access_token";

// Eski panel refresh tokenni ham JS cookie'ga yozardi. U endi faqat
// HttpOnly cookie'da — qolib ketgan nusxa chiqishda tozalanadi.
const LEGACY_REFRESH_KEY = "dodakino_refresh_token";

const setCookie = (name, value, rememberMe) => {
  let cookieString = `${name}=${encodeURIComponent(value)}; path=/; SameSite=Lax;`;

  // Secure faqat https da — http (lokal) da Secure cookie ba'zi
  // brauzerlarda umuman yozilmaydi.
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
  // ─── Yozish ───────────────────────────────────────────────────
  setAccessToken(token, rememberMe = true) {
    if (token) setCookie(ACCESS_TOKEN_KEY, token, rememberMe);
  },

  /** Eski nom — auth xizmati shu orqali ham chaqira oladi. */
  setTokens(accessToken, _refreshToken = null, rememberMe = true) {
    this.setAccessToken(accessToken, rememberMe);
  },

  clearTokens() {
    deleteCookie(ACCESS_TOKEN_KEY);
    deleteCookie(LEGACY_REFRESH_KEY);
    // Zaxira: ilgari boshqa saqlagichda qolgan bo'lsa
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  },

  // ─── O'qish ───────────────────────────────────────────────────
  getAccessToken() {
    return getCookie(ACCESS_TOKEN_KEY);
  },

  /**
   * Token bormi? Sinxron, tarmoqsiz — router aynan shuni so'raydi.
   * "Bor" degani "amal qiladi" degani EMAS: muddati o'tgan bo'lsa
   * birinchi API so'rovida interceptor uni fonda yangilaydi.
   */
  hasAccessToken() {
    return Boolean(this.getAccessToken());
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
    return this.hasAccessToken();
  },
};
