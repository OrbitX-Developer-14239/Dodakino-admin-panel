/**
 * Jonli jurnal oqimi.
 *
 * Backend yangi log yozilishi bilan uni socket orqali adminlar xonasiga
 * (`join_logs`) yuboradi. Bitta ochiq ulanish, aloqa uzilsa socket.io
 * o'zi qayta ulanadi — shunda xonaga ham qaytadan kiramiz.
 *
 * Ishlatilishi:
 *   const stop = streamLogs((entry) => ...);
 *   stop(); // komponent unmount bo'lganda — MAJBURIY
 */

import { getSocket } from "./socket";

export function streamLogs(onEntry) {
  const socket = getSocket();
  if (!socket) return () => {};

  const join = () => socket.emit("join_logs");
  const onLog = (entry) => {
    try {
      onEntry(entry);
    } catch {
      // Buzilgan qator — tashlab yuboramiz, oqim davom etadi
    }
  };

  if (socket.connected) join();
  socket.on("connect", join);
  socket.on("new-log", onLog);

  return () => {
    socket.off("connect", join);
    socket.off("new-log", onLog);
    socket.emit("leave_logs");
  };
}
