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
    if (!accessToken) throw new Error(response?.message || "Kirish tasdiqlanmadi");
    TokenManager.setAccessToken(accessToken, rememberMe);
    return response;
  },

  /**
   * Telegram orqali kirishda bot tasdiqlagach socket access token beradi
   * (telegramLoginSocket.js) — u shu yerda saqlanadi.
   */
  acceptToken(accessToken, rememberMe = true) {
    TokenManager.setAccessToken(accessToken, rememberMe);
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

  /** Joriy admin — { username, role, ... } */
  async me() {
    const res = await client.get(ENDPOINTS.ADMIN.ME, { silent: true });
    return res?.data || null;
  },
};

export default AdminService;
