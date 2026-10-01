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

      socket.on("auth_success", async (payload) => {
        const { loginToken, accessToken, user } = payload?.data || {};
        stop();

        // Bir martalik kod → to'liq sessiya. Refresh cookie faqat brauzerning
        // O'Z so'roviga qo'yiladi; socket orqali kelgan access token esa 15
        // daqiqa yashaydi — usiz admin 15 daqiqada chiqarib yuborilardi.
        if (loginToken) {
          try {
            const res = await client.post(ENDPOINTS.ADMIN.TELEGRAM_AUTH, { token: loginToken });
            const data = res?.data || {};
            if (!data.accessToken) throw new Error("Server token yubormadi");
            onDone?.({ status: "connected", accessToken: data.accessToken, user: data.user || user });
          } catch (err) {
            onError?.(err);
          }
          return;
        }

        if (accessToken) {
          onDone?.({ status: "connected", accessToken, user });
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
