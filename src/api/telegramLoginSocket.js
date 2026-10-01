/**
 * ============================================
 * TROYA ADMIN — Telegram orqali kirish sessiyasi
 * ============================================
 *
 * 1) Server login sessiyasini ochadi va bot havolasini beradi
 *    (`/admin/telegram-login/init`).
 * 2) Admin havolani ochib, botda kirishni tasdiqlaydi.
 * 3) Server shu sessiya xonasiga (`join_auth`) access tokenni yuboradi.
 *
 * Bu ulanish ATAYLAB alohida va tokensiz: admin hali kirmagan.
 *
 * Ishlatilishi:
 *   const stop = startTelegramLoginSession({ onUpdate, onDone, onError });
 *   ...
 *   stop();   // komponent unmount bo'lganda — MAJBURIY
 *
 * onUpdate({ status: "awaiting", link, expiresInMinutes })
 * onDone({ status: "connected", accessToken, user })
 */

import { io } from "socket.io-client";
import client, { API_ORIGIN } from "./client";
import { ENDPOINTS } from "./endpoints";

export function startTelegramLoginSession({ onUpdate, onDone, onError } = {}) {
  let socket = null;
  let stopped = false;

  const stop = () => {
    stopped = true;
    if (socket) socket.disconnect();
    socket = null;
  };

  client
    .post(ENDPOINTS.ADMIN.TELEGRAM_LOGIN_INIT, {})
    .then((res) => {
      if (stopped) return;
      const data = res?.data || {};
      if (!data.authSessionToken || !data.loginLink) {
        throw new Error("Telegram orqali kirish hozir mavjud emas");
      }

      onUpdate?.({
        status: "awaiting",
        link: data.loginLink,
        expiresInMinutes: data.expiresInMinutes,
      });

      socket = io(API_ORIGIN || undefined, { transports: ["websocket", "polling"] });
      const join = () => socket.emit("join_auth", data.authSessionToken);
      socket.on("connect", join);

      socket.on("auth_success", (payload) => {
        const accessToken = payload?.data?.accessToken;
        stop();
        if (accessToken) {
          onDone?.({ status: "connected", accessToken, user: payload.data.user });
        } else {
          onError?.(new Error("Server token yubormadi"));
        }
      });

      socket.on("auth_error", (payload) => {
        stop();
        onError?.(new Error(payload?.message || "Kirish rad etildi"));
      });
    })
    .catch((err) => {
      if (stopped) return;
      onError?.(err);
    });

  return stop;
}
