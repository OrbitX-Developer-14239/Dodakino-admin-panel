/**
 * ============================================
 * DODA KINO — Film Service
 * ============================================
 */

import client from "../client";
import { ENDPOINTS } from "../endpoints";

const FilmService = {
  /**
   * Kinolar ro'yxati
   * @returns {Promise<any>}
   * @swagger GET /api/film
   */
  async getList(page = 1) {
    return client.get(ENDPOINTS.FILMS.LIST, { params: { page } });
  },

  /**
   * Kino yaratish
   * @param {FormData} formData - poster(binary), code, name, originalName, year, country, genres, description, episodesCount
   * @returns {Promise<any>}
   * @swagger POST /api/film
   */
  async create(formData) {
    // FormData ishlatilganda content-type avtomatik belgilanadi
    return client.post(ENDPOINTS.FILMS.CREATE, formData);
  },

  /**
   * Kod bo'yicha qidirish
   * @param {string} code 
   * @returns {Promise<any>}
   * @swagger GET /api/film/code/{code}
   */
  async getByCode(code) {
    return client.get(ENDPOINTS.FILMS.BY_CODE(code));
  },

  /**
   * ID bo'yicha olish (404 bo'lishi mumkin)
   * @param {string} id 
   * @returns {Promise<any>}
   * @swagger GET /api/film/id/{id}
   */
  async getById(id) {
    return client.get(ENDPOINTS.FILMS.BY_ID(id));
  },

  /**
   * AI orqali qidirish
   * @param {string} query 
   * @returns {Promise<any>}
   * @swagger POST /api/film/search
   */
  async search(query) {
    return client.post(ENDPOINTS.FILMS.SEARCH, { query });
  },

  /**
   * AI orqali kino ma'lumotlarini tayyorlash (bazaga yozmaydi).
   * Faqat `name` majburiy; `year`/`country` bir xil nomli kinolarni ajratadi.
   * Javobda bo'sh film kodi va epizod kodlari ham keladi.
   * @param {{name: string, year?: number|string, country?: string, episodeCount?: number}} params
   * @returns {Promise<any>} { data: { film: {...code}, episodeCodes: [] } }
   * @swagger POST /api/film/ai-suggest
   */
  async aiSuggest({ name, year, country, episodeCount = 1 }) {
    return client.post(ENDPOINTS.FILMS.AI_SUGGEST, {
      name,
      ...(year ? { year: Number(year) } : {}),
      ...(country ? { country } : {}),
      episodeCount,
    });
  },

  /**
   * Kinoni tahrirlash (faqat text ma'lumotlari)
   * @param {string} id 
   * @param {Object} data 
   * @returns {Promise<any>}
   * @swagger PUT /api/film/{id}
   */
  async update(id, data) {
    return client.put(ENDPOINTS.FILMS.UPDATE(id), data);
  },

  /**
   * Kinoni o'chirish (va unga tegishli epizodlarni ham)
   * @param {string} id 
   * @returns {Promise<any>}
   * @swagger DELETE /api/film/{id}
   */
  async delete(id) {
    return client.delete(ENDPOINTS.FILMS.DELETE(id));
  }
};

export default FilmService;
