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
   * AI orqali qism ma'lumotlarini tayyorlash (bazaga yozmaydi).
   * `filmId` berilsa serial nomi/yili/davlati bazadan olinadi.
   * Javobda bo'sh qism kodi ham keladi.
   * @param {{filmId?: string, filmName?: string, episodeNumber?: number, count?: number}} params
   * @returns {Promise<any>} { data: { episode: {...code}, codes: [] } }
   * @swagger POST /api/episode/ai-suggest
   */
  async aiSuggest({ filmId, filmName, episodeNumber = 1, count = 1 }) {
    return client.post(ENDPOINTS.EPISODES.AI_SUGGEST, {
      ...(filmId ? { filmId } : {}),
      ...(filmName ? { filmName } : {}),
      episodeNumber,
      count,
    });
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
