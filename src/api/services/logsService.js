/**
 * ============================================
 * DODA KINO — Logs Service
 * ============================================
 */

import client from "../client";
import { ENDPOINTS } from "../endpoints";

const LogsService = {
  /**
   * Loglarni olish
   * @param {Object} params - { time, level, source }
   * @returns {Promise<any>}
   * @swagger GET /api/logs
   */
  async getList(params = {}) {
    return client.get(ENDPOINTS.LOGS.LIST, { params });
  }
};

export default LogsService;
