/**
 * ============================================
 * DODA KINO — React Query Keys
 * ============================================
 * 
 * TanStack Query (React Query) uchun markazlashgan kalitlar.
 * Har bir modul o'zining cache kalitlariga ega bo'lishi shart.
 */

export const queryKeys = {
  // ─── ADMIN ────────────────────────────────────────────────────
  admin: {
    all: ['admin', 'all'],
  },

  // ─── USERS ────────────────────────────────────────────────────
  user: {
    list: (filters) => ['user', 'list', filters],
  },

  // ─── LOGS ────────────────────────────────────────────────────
  logs: {
    list: (filters) => ['logs', 'list', filters],
  },

  // ─── INSTAGRAM ────────────────────────────────────────────────────
  instagram: {
    profile: ['instagram', 'profile'],
    growth: ['instagram', 'growth'],
    posts: ['instagram', 'posts'],
    postDetail: (id) => ['instagram', 'posts', id],
    stories: ['instagram', 'stories'],
  },

  // ─── FILMS ────────────────────────────────────────────────────
  films: {
    list: () => ['films', 'list'],
    byCode: (code) => ['films', 'byCode', code],
    byId: (id) => ['films', 'byId', id],
    search: (query) => ['films', 'search', query],
  },

  // ─── EPISODES ────────────────────────────────────────────────────
  episodes: {
    byCode: (code) => ['episodes', 'byCode', code],
  },

  // ─── CHANNELS ────────────────────────────────────────────────────
  channels: {
    list: () => ['channels', 'list'],
    detail: (id) => ['channels', 'detail', id],
  },

  // ─── BOT ────────────────────────────────────────────────────
  bot: {
    tokens: ['bot', 'tokens'],
  }
};
