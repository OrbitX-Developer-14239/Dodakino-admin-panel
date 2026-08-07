/**
 * ============================================
 * DODA KINO — Instagram Service
 * ============================================
 */

import client from "../client";
import { ENDPOINTS } from "../endpoints";

const InstagramService = {
  /**
   * Profil ma'lumotlari
   * @returns {Promise<any>}
   * @swagger GET /api/instagram/profile
   */
  async getProfile() {
    return client.get(ENDPOINTS.INSTAGRAM.PROFILE);
  },

  /**
   * O'sish dinamikasi (grafik)
   * @returns {Promise<any>}
   * @swagger GET /api/instagram/growth
   */
  async getGrowth() {
    return client.get(ENDPOINTS.INSTAGRAM.GROWTH);
  },

  /**
   * Postlar statistikasi
   * @returns {Promise<any>}
   * @swagger GET /api/instagram/posts
   */
  async getPosts() {
    return client.get(ENDPOINTS.INSTAGRAM.POSTS);
  },

  /**
   * Bitta post tafsiloti
   * @param {string} id 
   * @returns {Promise<any>}
   * @swagger GET /api/instagram/posts/{id}
   */
  async getPostById(id) {
    return client.get(ENDPOINTS.INSTAGRAM.POST_DETAIL(id));
  },

  /**
   * Hozirgi faol storylar
   * @returns {Promise<any>}
   * @swagger GET /api/instagram/stories
   */
  async getStories() {
    return client.get(ENDPOINTS.INSTAGRAM.STORIES);
  },

  /**
   * Yangi story yuklash
   * @param {FormData} formData - Ichida "media" kabi fayl bo'lishi kerak
   * @returns {Promise<any>}
   * @swagger POST /api/instagram/stories
   */
  async uploadStory(formData) {
    // FormData uchun Content-Type qo'lda o'rnatilmaydi, browser o'zi chegaralarni belgilaydi
    return client.post(ENDPOINTS.INSTAGRAM.STORIES, formData);
  }
};

export default InstagramService;
