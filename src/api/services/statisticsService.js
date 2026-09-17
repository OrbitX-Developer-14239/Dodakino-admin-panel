/**
 * ============================================
 * DODA KINO — Statistics Service
 * ============================================
 */

import client from "../client";
import { ENDPOINTS } from "../endpoints";

const StatisticsService = {
  /**
   * Barcha statistikalarni olish
   * @param {number} page 
   * @returns {Promise<any>}
   * @swagger GET /api/statistics
   */
  async getList(page = 1) {
    return client.get(ENDPOINTS.STATISTICS.LIST, { params: { page } });
  },

  /**
   * Top filmlar va epizodlarni olish
   * @param {number} top 
   * @param {number} page 
   * @returns {Promise<any>}
   * @swagger GET /api/statistics/top
   */
  async getTop(top = 100, page = 1) {
    return client.get(ENDPOINTS.STATISTICS.TOP, { params: { top, page } });
  },

  /**
   * Foydalanuvchilar o'sishi — grafik uchun kunlik nuqtalar.
   * Bo'sh kunlar backendda nol bilan to'ldirilgan, kunlar Toshkent vaqtida.
   * @param {"7"|"30"|"90"|"all"} range
   * @returns {Promise<{ success, data: { range, totals, points } }>}
   * @swagger GET /api/statistics/users-growth
   */
  async getUsersGrowth(range = "30") {
    return client.get(ENDPOINTS.STATISTICS.USERS_GROWTH, { params: { range } });
  },

  /**
   * Tanlagich uchun filmlar (kod, nom, jami ko'rish).
   * @swagger GET /api/statistics/films
   */
  async getFilmsForPicker() {
    return client.get(ENDPOINTS.STATISTICS.FILMS);
  },

  /**
   * Bitta filmning kunlik ko'rishlari va qismlar bo'yicha taqsimoti.
   * @swagger GET /api/statistics/film-views
   */
  async getFilmViews(code, range = "30") {
    return client.get(ENDPOINTS.STATISTICS.FILM_VIEWS, { params: { code, range } });
  },

  /**
   * Majburiy kanallarga bot orqali qo'shilish va chiqish.
   * @swagger GET /api/statistics/channel-joins
   */
  async getChannelJoins(range = "30") {
    return client.get(ENDPOINTS.STATISTICS.CHANNEL_JOINS, { params: { range } });
  }
};

export default StatisticsService;
