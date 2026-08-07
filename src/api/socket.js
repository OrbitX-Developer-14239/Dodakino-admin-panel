import { io } from "socket.io-client";
import { TokenManager } from "./tokenManager";

const SOCKET_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

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
