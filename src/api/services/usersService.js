/**
 * ============================================
 * DODA KINO — Users Service
 * ============================================
 *
 * Foydalanuvchilar bilan bog'liq API so'rovlari.
 */

import client from "../client";
import { ENDPOINTS } from "../endpoints";

const UsersService = {
  /**
   * Foydalanuvchilar ro'yxatini olish
   * @param {Object} params - { page, limit, is_subscribed }
   * @returns {Promise<any>}
   * @swagger GET /api/user
   */
  async getList(params = {}) {
    return client.get(ENDPOINTS.USER.LIST, { params });
  }
};

export default UsersService;
