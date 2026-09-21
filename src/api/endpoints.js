/**
 * ============================================
 * TROYA ADMIN — API manzillari
 * ============================================
 *
 * Manzillar shu yerda, chaqiriqlar sahifalarda. Backend yo'lni
 * o'zgartirsa faqat shu fayl tahrirlanadi.
 *
 * Botga xos yo'llar (/film, /episode, /channel, /user, /statistics,
 * /bot) client.js da tanlangan bot prefiksini oladi — bu yerda
 * prefikssiz yoziladi.
 */

export const ENDPOINTS = {
  // ─── Admin sessiyasi (umumiy) ─────────────────────────────────
  ADMIN: {
    LOGIN: "/admin/login",
    LOGOUT: "/admin/logout",
    REFRESH: "/admin/refresh",
    ME: "/admin/me",
    TELEGRAM_LOGIN_INIT: "/admin/telegram-login/init",
    TELEGRAM_AUTH: "/admin/telegram-auth",
  },

  // ─── Server holati (API ildizidan tashqarida) ─────────────────
  HEALTH: "/health",

  // ─── Botlar ───────────────────────────────────────────────────
  BOT: {
    LIST: "/bot/list",
    INFO: "/bot/info",
  },

  // ─── Filmlar ──────────────────────────────────────────────────
  FILMS: {
    LIST: "/film",
    CREATE: "/film",
    BY_ID: (id) => `/film/id/${id}`,
    BY_CODE: (code) => `/film/code/${code}`,
    SEARCH: "/film/search",
    AI_SUGGEST: "/film/ai-suggest",
    NEXT_CODE: "/film/next-code",
    ITEM: (id) => `/film/${id}`,
  },

  // ─── Qismlar ──────────────────────────────────────────────────
  EPISODES: {
    CREATE: "/episode",
    AI_SUGGEST: "/episode/ai-suggest",
    NEXT_CODE: "/episode/next-code",
    ITEM: (id) => `/episode/${id}`,
  },

  // ─── Majburiy kanallar ────────────────────────────────────────
  CHANNELS: {
    LIST: "/channel",
    CREATE: "/channel",
    /** Bot a'zo bo'lgan kanal/guruhlar — yangi kanal shulardan tanlanadi */
    AVAILABLE: "/channel/available",
    ITEM: (id) => `/channel/${id}`,
  },

  // ─── Foydalanuvchilar ─────────────────────────────────────────
  USERS: "/user",

  // ─── Statistika ───────────────────────────────────────────────
  STATISTICS: {
    USERS_GROWTH: "/statistics/users-growth",
    FILMS: "/statistics/films",
    FILM_VIEWS: "/statistics/film-views",
    CHANNEL_JOINS: "/statistics/channel-joins",
  },

  // ─── Tizim jurnali (umumiy) ───────────────────────────────────
  LOGS: "/logs",

  // ─── Instagram (umumiy) ───────────────────────────────────────
  INSTAGRAM: {
    PROFILE: "/instagram/profile",
    GROWTH: "/instagram/growth",
    POSTS: "/instagram/posts",
    STORIES: "/instagram/stories",
    /** Post, Reels yoki hikoyani o'chirish (DELETE) — qaytarilmaydi */
    MEDIA: (id) => `/instagram/media/${id}`,
  },
};
