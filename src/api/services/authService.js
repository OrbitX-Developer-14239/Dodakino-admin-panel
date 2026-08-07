/**
 * ============================================
 * DODA KINO — Admin Service
 * ============================================
 *
 * Admin bilan bog'liq barcha API so'rovlari.
 */

import client from "../client";
import { ENDPOINTS } from "../endpoints";
import { TokenManager } from "../tokenManager";

const AdminService = {
  /**
   * Login qilish
   * @param {Object} credentials - { username, password }
   * @returns {Promise<any>}
   * @swagger POST /api/admin/login
   */
  async login(credentials, rememberMe = true) {
    // Backend: { success: true, data: { accessToken, user } }
    // refreshToken HttpOnly cookie da saqlanadi — frontendga kelmaydi
    const response = await client.post(ENDPOINTS.ADMIN.LOGIN, credentials);

    const accessToken = response?.data?.accessToken;
    if (accessToken) {
      TokenManager.setAccessToken(accessToken, rememberMe);
    }

    return response;
  },

  /**
   * Telegram orqali login qilish uchun so'rov
   * @returns {Promise<any>}
   * @swagger POST /api/admin/telegram-login
   */
  async requestTelegramLogin() {
    return client.post(ENDPOINTS.ADMIN.TELEGRAM_LOGIN);
  },

  /**
   * Telegram token orqali loginni tasdiqlash
   * @param {string} token 
   * @returns {Promise<any>}
   * @swagger POST /api/admin/telegram-auth
   */
  async telegramAuth(token, rememberMe = true) {
    const response = await client.post(ENDPOINTS.ADMIN.TELEGRAM_AUTH, { token });
    if (response.data?.accessToken) {
      TokenManager.setTokens(response.data.accessToken, response.data.refreshToken, rememberMe);
    }
    return response;
  },

  /**
   * Tokenni tasdiqlash
   * @param {string} token 
   * @returns {Promise<any>}
   * @swagger POST /api/admin/verify/{token}
   */
  async verify(token) {
    return client.post(ENDPOINTS.ADMIN.VERIFY(token));
  },

  /**
   * Yangi admin yaratish
   * @param {Object} data - { username, password }
   * @returns {Promise<any>}
   * @swagger POST /api/admin/create
   */
  async create(data) {
    return client.post(ENDPOINTS.ADMIN.CREATE, data);
  },

  /**
   * Admin ma'lumotlarini yangilash
   * @param {string} id - Admin ID
   * @param {Object} data 
   * @returns {Promise<any>}
   * @swagger PUT /api/admin/{id}
   */
  async update(id, data) {
    return client.put(ENDPOINTS.ADMIN.UPDATE(id), data);
  },

  /**
   * Adminni o'chirish
   * @param {string} id - Admin ID
   * @returns {Promise<any>}
   * @swagger DELETE /api/admin/{id}
   */
  async delete(id) {
    return client.delete(ENDPOINTS.ADMIN.DELETE(id));
  },

  /**
   * Barcha adminlar ro'yxati
   * @returns {Promise<any>}
   * @swagger GET /api/admin/all
   */
  async getAll() {
    return client.get(ENDPOINTS.ADMIN.ALL);
  },

  /**
   * Tizimdan chiqish
   * @swagger POST /api/admin/logout
   */
  async logout() {
    try {
      await client.post(ENDPOINTS.ADMIN.LOGOUT);
    } catch {
      // Logout xatosini ignore qilamiz
    } finally {
      TokenManager.clearTokens();
    }
  },

  /**
   * Foydalanuvchi tizimga kirganmi?
   */
  isAuthenticated() {
    return TokenManager.isAuthenticated();
  },

  /**
   * Joriy foydalanuvchi ma'lumotlari (token dan)
   */
  getCurrentUser() {
    return TokenManager.getUserFromToken();
  }
};

export default AdminService;
