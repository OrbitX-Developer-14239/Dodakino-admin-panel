export const ENDPOINTS = {
  // ─── ADMIN ────────────────────────────────────────────────────
  ADMIN: {
    LOGIN: "/admin/login",
    TELEGRAM_LOGIN: "/admin/telegram-login/init",
    TELEGRAM_AUTH: "/admin/telegram-auth",
    VERIFY: (token) => `/admin/verify/${token}`,
    CREATE: "/admin/create",
    UPDATE: (id) => `/admin/${id}`,
    DELETE: (id) => `/admin/${id}`,
    REFRESH: "/admin/refresh",
    LOGOUT: "/admin/logout",
    ALL: "/admin/all",
  },
  
  // ─── USERS ────────────────────────────────────────────────────
  USER: {
    LIST: "/user",
  },
  
  // ─── LOGS ────────────────────────────────────────────────────
  LOGS: {
    LIST: "/logs",
  },
  
  // ─── INSTAGRAM ────────────────────────────────────────────────────
  INSTAGRAM: {
    PROFILE: "/instagram/profile",
    GROWTH: "/instagram/growth",
    POSTS: "/instagram/posts",
    POST_DETAIL: (id) => `/instagram/posts/${id}`,
    STORIES: "/instagram/stories",
  },
  
  // ─── FILMS ────────────────────────────────────────────────────
  FILMS: {
    LIST: "/film",
    CREATE: "/film",
    BY_CODE: (code) => `/film/code/${code}`,
    BY_ID: (id) => `/film/id/${id}`,
    SEARCH: "/film/search",
    AI_SUGGEST: "/film/ai-suggest",
    UPDATE: (id) => `/film/${id}`,
    DELETE: (id) => `/film/${id}`,
  },
  
  // ─── EPISODES ────────────────────────────────────────────────────
  EPISODES: {
    CREATE: "/episode",
    AI_SUGGEST: "/episode/ai-suggest",
    BY_CODE: (code) => `/episode/code/${code}`,
    UPDATE: (id) => `/episode/${id}`,
    // `id` o'rniga epizod `code` ini ham qabul qiladi
    DELETE: (id) => `/episode/${id}`,
  },
  
  // ─── CHANNELS ────────────────────────────────────────────────────
  CHANNELS: {
    CREATE: "/channel",
    LIST: "/channel",
    DETAIL: (id) => `/channel/${id}`,
    DELETE: (id) => `/channel/${id}`,
  },
  
  // ─── STATISTICS ────────────────────────────────────────────────────
  STATISTICS: {
    LIST: "/statistics",
    TOP: "/statistics/top",
  },
  
  // ─── BOT ────────────────────────────────────────────────────
  BOT: {
    TOKENS: "/bot/get",
    UPDATE: "/bot/update",
  }
};
