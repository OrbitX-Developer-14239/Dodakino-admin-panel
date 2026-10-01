/**
 * ============================================
 * TROYA ADMIN — Socket (socket.io)
 * ============================================
 *
 * Bitta umumiy ulanish — butun panel uchun. Access token handshake'da
 * yuboriladi: server admin ekanini shundan biladi va jurnal oqimiga
 * (`join_logs`) faqat shunday ulanishni qo'yadi.
 *
 * Manzil API manzilidan olinadi ("/api" qismisiz).
 */

import { io } from "socket.io-client";
import { TokenManager } from "./tokenManager";
import { API_ORIGIN } from "./client";

let socket = null;

/** Ulanishni qaytaradi (kerak bo'lsa yaratadi). Token yo'q bo'lsa null. */
export const getSocket = () => {
  if (socket) return socket;

  const token = TokenManager.getAccessToken();
  if (!token) return null;

  socket = io(API_ORIGIN || undefined, {
    // auth funksiya — qayta ulanishda ham ENG YANGI token olinadi
    // (15 daqiqada access token yangilanadi, eski token bilan server
    // ulanishni anonim deb qabul qilardi)
    auth: (cb) => cb({ token: TokenManager.getAccessToken() }),
    transports: ["websocket", "polling"],
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
