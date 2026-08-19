/**
 * ============================================
 * DODA KINO — Tanlangan bot (multibot)
 * ============================================
 *
 * Backend endi bir nechta botga xizmat qiladi. Panelda qaysi bot
 * tanlangan bo'lsa, barcha kontent so'rovlari (film, epizod, kanal,
 * foydalanuvchi, statistika) o'sha botning bazasiga boradi —
 * client.js so'rov yo'liga /<botId> prefiksini qo'shadi.
 *
 * Bo'sh qiymat = asosiy bot (backend eski /api/film ko'rinishini
 * birinchi botga yo'naltiradi), shuning uchun tanlanmagan holatda
 * ham hammasi ishlayveradi.
 */

const STORAGE_KEY = "dodakino_selected_bot";

export const getSelectedBotId = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) || "";
  } catch {
    return "";
  }
};

export const setSelectedBotId = (botId) => {
  try {
    if (botId) {
      localStorage.setItem(STORAGE_KEY, String(botId));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    /* localStorage yopiq bo'lsa ham panel ishlashda davom etadi */
  }

  // Sahifa to'liq yangilanadi: react-query keshlari, ochiq formalar va
  // ro'yxatlar eski botning ma'lumotlarini ushlab turmasligi uchun.
  window.location.reload();
};

/** Kontent (botga xos) yo'llar — ular /<botId> prefiksini oladi.
 *  /admin, /logs, /instagram bu ro'yxatda YO'Q — ular umumiy. */
export const TENANT_PATH_PREFIXES = [
  "/film",
  "/episode",
  "/channel",
  "/user",
  "/statistics",
  "/bot",
];
