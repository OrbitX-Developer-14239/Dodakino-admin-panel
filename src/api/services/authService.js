/**
 * ============================================
 * TROYA ADMIN — Admin sessiya xizmati
 * ============================================
 *
 * Kirish, chiqish va "kim kirgan" — uchtasi. Boshqa hech narsa
 * sessiyaga tegishli emas.
 */

import client from "../client";
import { ENDPOINTS } from "../endpoints";
import { TokenManager } from "../tokenManager";

const AdminService = {
  /**
   * Kirish.
   * @param {{username: string, password: string}} credentials
   * @param {boolean} rememberMe — access token cookie'si 30 kun tursinmi
   *
   * Javob: { success, data: { accessToken, ... } }. Refresh token
   * HttpOnly cookie'da keladi — bu yerga tushmaydi.
   */
  async login(credentials, rememberMe = true) {
    const response = await client.post(ENDPOINTS.ADMIN.LOGIN, credentials);
    const accessToken = response?.data?.accessToken;
    const refreshToken = response?.data?.refreshToken;
    if (!accessToken) throw new Error(response?.message || "Kirish tasdiqlanmadi");
    TokenManager.setTokens(accessToken, refreshToken, rememberMe);
    return response;
  },

  /**
   * Telegram orqali kirishda bot tasdiqlagach socket access token beradi
   * (telegramLoginSocket.js) — u shu yerda saqlanadi.
   */
  acceptToken(accessToken, refreshToken = null, rememberMe = true) {
    TokenManager.setTokens(accessToken, refreshToken, rememberMe);
  },

  /**
   * Chiqish. Server so'rovi yiqilsa ham token MAJBURAN tozalanadi —
   * aks holda foydalanuvchi "chiqdim" deb o'ylab, panelda qolib
   * ketardi. Server faqat SHU qurilmaning sessiyasini o'chiradi.
   */
  async logout() {
    try {
      await client.post(ENDPOINTS.ADMIN.LOGOUT, {});
    } catch {
      /* baribir chiqamiz */
    } finally {
      TokenManager.clearTokens();
    }
  },

  /**
   * Sessiyani yangilash (HttpOnly refresh cookie orqali).
   * Yangi access token qaytaradi va uni cookie'ga saqlaydi.
   */
  async refresh() {
    const res = await client.post(ENDPOINTS.ADMIN.REFRESH, {});
    const token = res?.data?.accessToken || res?.accessToken;
    if (token) {
      TokenManager.setAccessToken(token);
    }
    return token;
  },

  /** Joriy admin — { username, role, ... } */
  async me() {
    const res = await client.get(ENDPOINTS.ADMIN.ME, { silent: true });
    return res?.data || null;
  },
};

export default AdminService;
