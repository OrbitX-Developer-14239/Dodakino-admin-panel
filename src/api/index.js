/**
 * ============================================
 * DODA KINO — API Yagona Kirish Nuqtasi (Entry Point)
 * ============================================
 * 
 * Barcha xizmatlarni bitta joydan eksport qilamiz.
 * Bu loyiha bo'ylab importlarni osonlashtiradi.
 * 
 * Misol:
 * import api from '@/api';
 * await api.films.getList();
 */

import client from "./client";
import { ApiError } from "./errors";
import { TokenManager } from "./tokenManager";

// --- DodaKino Admin API Services ---
import AdminService from "./services/authService"; // authService ishlangan, export AdminService sifatida
import UsersService from "./services/usersService";
import LogsService from "./services/logsService";
import InstagramService from "./services/instagramService";
import FilmService from "./services/filmService";
import EpisodeService from "./services/episodeService";
import ChannelService from "./services/channelService";
import BotService from "./services/botService";

export const api = {
  client,
  
  // DodaKino Admin API
  admin: AdminService,
  auth: AdminService, // Eski importlar buzilmasligi uchun 'auth' deb ham qoldiramiz
  users: UsersService,
  logs: LogsService,
  instagram: InstagramService,
  films: FilmService,
  episodes: EpisodeService,
  channels: ChannelService,
  bot: BotService,
};

export { ApiError, TokenManager };
