/**
 * ============================================
 * TROYA ADMIN — Telegram akkauntini ulash sessiyasi
 * ============================================
 *
 * Kirishdan farqi: admin allaqachon panelda. U o'z Telegram akkauntini
 * profiliga ulaydi — shundan keyin panelga Telegram orqali kira oladi.
 *
 * 1) Server bot havolasi va sessiya tokenini beradi
 *    (`/admin/telegram-link/init`).
 * 2) Admin havolani ochib, botda kontaktini ulashadi.
 * 3) Server shu sessiya xonasiga (`join_auth`) natijani yuboradi:
 *    `link_success` yoki `link_error`.
 *
 *   const stop = startTelegramLinkSession({ onUpdate, onDone, onError });
 *   stop();   // oyna yopilganda — MAJBURIY
 *
 * onUpdate({ link, expiresInMinutes })
 * onDone({ telegramUsername, telegramId })
 */

import { io } from "socket.io-client";
import client, { API_ORIGIN } from "./client";
import { ENDPOINTS } from "./endpoints";

export function startTelegramLinkSession({ onUpdate, onDone, onError } = {}) {
  let socket = null;
  let stopped = false;

  const stop = () => {
    stopped = true;
    if (socket) socket.disconnect();
    socket = null;
  };

  const fail = (message) => {
    stop();
    onError?.(new Error(message));
  };

  client
    .post(ENDPOINTS.ADMIN.TELEGRAM_LINK_INIT, {})
    .then((res) => {
      if (stopped) return;
      const data = res?.data || {};
      if (!data.authSessionToken || !data.linkUrl) {
        throw new Error("Bot sozlanmagan — Telegram ulash hozir mavjud emas");
      }

      onUpdate?.({ link: data.linkUrl, expiresInMinutes: data.expiresInMinutes });

      // Alohida, tokensiz ulanish: xona faqat server bergan sessiya tokeni bilan ochiladi
      socket = io(API_ORIGIN || undefined, { transports: ["websocket", "polling"] });
      socket.on("connect", () => socket.emit("join_auth", data.authSessionToken));

      socket.on("link_success", (payload) => {
        stop();
        onDone?.(payload?.data || {});
      });
      socket.on("link_error", (payload) => fail(payload?.message || "Ulab boʻlmadi"));
      socket.on("auth_error", (payload) => fail(payload?.message || "Sessiya muddati tugagan"));
    })
    .catch((err) => {
      if (stopped) return;
      onError?.(err);
    });

  return stop;
}
