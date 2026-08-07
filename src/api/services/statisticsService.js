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
  }
};

export default StatisticsService;
