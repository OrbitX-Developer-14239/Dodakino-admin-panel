/**
 * ============================================
 * DODA KINO — Episode Service
 * ============================================
 */

import client from "../client";
import { ENDPOINTS } from "../endpoints";

const EpisodeService = {
  /**
   * Epizod yaratish
   * @param {FormData} formData - instagramVideo(binary), filmId, code, episodeNumber, name, videoFileId, description, releaseYear, country, caption, genres, editVideos
   * @returns {Promise<any>}
   * @swagger POST /api/episode
   */
  async create(formData) {
    return client.post(ENDPOINTS.EPISODES.CREATE, formData);
  },

  /**
   * Kod bo'yicha epizod qidirish
   * @param {string} code 
   * @returns {Promise<any>}
   * @swagger GET /api/episode/code/{code}
   */
  async getByCode(code) {
    return client.get(ENDPOINTS.EPISODES.BY_CODE(code));
  },

  /**
   * Epizodni tahrirlash (faqat text ma'lumotlari)
   * @param {string} id 
   * @param {Object} data 
   * @returns {Promise<any>}
   * @swagger PUT /api/episode/{id}
   */
  async update(id, data) {
    return client.put(ENDPOINTS.EPISODES.UPDATE(id), data);
  },

  /**
   * Epizodni o'chirish.
   * Backend filmning `episodes` massivi va `episodesCount` ini bitta atomik
   * so'rovda yangilaydi. Telegram/Instagram dagi media o'chirilmaydi.
   * @param {string} id - epizod `_id` yoki `code`
   * @returns {Promise<any>}
   * @swagger DELETE /api/episode/{id}
   */
  async delete(id) {
    return client.delete(ENDPOINTS.EPISODES.DELETE(id));
  }
};

export default EpisodeService;
