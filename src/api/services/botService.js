/**
 * ============================================
 * DODA KINO — Bot Service
 * ============================================
 */

import client from "../client";
import { ENDPOINTS } from "../endpoints";

const BotService = {
  /**
   * Bot tokenlari ro'yxatini olish
   * @returns {Promise<any>}
   * @swagger GET /api/bot/get
   */
  async getTokens() {
    return client.get(ENDPOINTS.BOT.TOKENS);
  }
  /**
   * Bot tokenlarini yangilash
   * @param {Object} data - { mainBotToken, moviesBotToken }
   * @returns {Promise<any>}
   * @swagger POST /api/bot/update
   */
  async updateTokens(data) {
    return client.post(ENDPOINTS.BOT.UPDATE, data);
  }
};

export default BotService;
