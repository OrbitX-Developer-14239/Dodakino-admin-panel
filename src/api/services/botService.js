/**
 * ============================================
 * DODA KINO — Bot Service (multibot)
 * ============================================
 *
 * Tokenlar endi panel orqali YUBORILMAYDI — ular backend .env da turadi.
 * Panel faqat botlar ro'yxatini o'qiydi (header dagi bot tanlagich uchun).
 */

import client from "../client";
import { ENDPOINTS } from "../endpoints";

const BotService = {
  /**
   * Sozlangan botlar ro'yxati
   * @returns {Promise<{success: boolean, data: Array<{botId:number, username:string|null, active:boolean}>}>}
   * @swagger GET /api/bot/list
   */
  async list() {
    return client.get(ENDPOINTS.BOT.LIST);
  },

  /**
   * Joriy (tanlangan) botning ma'lumoti
   * @swagger GET /api/bot/info
   */
  async info() {
    return client.get(ENDPOINTS.BOT.INFO);
  },
};

export default BotService;
