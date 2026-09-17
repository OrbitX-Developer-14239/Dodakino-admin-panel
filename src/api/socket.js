import { io } from "socket.io-client";
import { TokenManager } from "./tokenManager";

/**
 * Socket manzili — API manzilidan olinadi ("/api" qismisiz).
 *
 * Ilgari REACT_APP_API_URL o'qilardi, lekin .env da bunday o'zgaruvchi
 * yo'q (bor-yo'g'i REACT_APP_API_BASE_URL). Natijada socket har doim
 * "localhost:5000" ga ulanmoqchi bo'lib, konsolni xato bilan to'ldirardi —
 * panel production API bilan ishlayotgan bo'lsa ham. Login sahifasi
 * socketni aynan shu usulda ulaydi.
 */
const SOCKET_URL = (process.env.REACT_APP_API_BASE_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "");

let socket;

export const initSocket = () => {
  const token = TokenManager.getAccessToken();
  
  if (!socket && token) {
    socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      console.log("Socket ulandi:", socket.id);
    });

    socket.on("disconnect", () => {
      console.log("Socket uzildi");
    });
    
    // Serverdan yangi xabar kelsa umumiy eshituvchi
    socket.on("notification", (data) => {
      console.log("Yangi bildirishnoma:", data);
      // Bu yerda masalan toast chiqarish mumkin
    });
  }
  
  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
