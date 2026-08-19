/**
 * ============================================
 * DODA KINO — Channel Service
 * ============================================
 */

import client from "../client";
import { ENDPOINTS } from "../endpoints";

const ChannelService = {
  /**
   * Barcha kanallar
   * @returns {Promise<any>}
   * @swagger GET /api/channel
   */
  async getList() {
    return client.get(ENDPOINTS.CHANNELS.LIST);
  },

  /**
   * Bot a'zo bo'lgan kanal/guruhlar — har biri uchun telegram ID, nomi va
   * botning admin yoki oddiy a'zo ekani. Yangi kanal shu ro'yxatdan tanlanadi.
   * @param {boolean} refresh - false bo'lsa Telegramga bormaydi (tezroq)
   * @returns {Promise<any>}
   * @swagger GET /api/channel/available
   */
  async getAvailable(refresh = true) {
    return client.get(ENDPOINTS.CHANNELS.AVAILABLE, { params: { refresh: String(refresh) } });
  },

  /**
   * Bitta kanal + statistika
   * @param {string} id 
   * @returns {Promise<any>}
   * @swagger GET /api/channel/{id}
   */
  async getById(id) {
    return client.get(ENDPOINTS.CHANNELS.DETAIL(id));
  },

  /**
   * Kanal yaratish
   * @param {Object} data - { telegram_id, name, invite_link, is_active, bot_permissions }
   * @returns {Promise<any>}
   * @swagger POST /api/channel
   */
  async create(data) {
    return client.post(ENDPOINTS.CHANNELS.CREATE, data);
  },

  /**
   * Kanalni tahrirlash
   * @param {string} id 
   * @param {Object} data - { name, join_type, is_active, isPrivate }
   * @returns {Promise<any>}
   * @swagger PUT /api/channel/{id}
   */
  async update(id, data) {
    return client.put(ENDPOINTS.CHANNELS.DETAIL(id), data);
  },

  /**
   * Kanalni o'chirish
   * @param {string} id 
   * @returns {Promise<any>}
   * @swagger DELETE /api/channel/{id}
   */
  async delete(id) {
    return client.delete(ENDPOINTS.CHANNELS.DELETE(id));
  }
};

export default ChannelService;
