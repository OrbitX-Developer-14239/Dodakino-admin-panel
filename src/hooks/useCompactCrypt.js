import { useCallback } from 'react';

export const useCompactCrypt = () => {
  // O'zingiz istagan maxfiy so'zni yozing
  const secretKey = "DodaKinoKey"; 

  // Matnni eng qisqa formatda shifrlash
  const encrypt = useCallback((text) => {
    if (!text) return "";
    try {
      // 1. Matnni xavfsiz formatga o'tkazamiz (o'zbek harflari va emojilar uchun)
      const safeText = encodeURIComponent(text);
      
      // 2. Harflarni aralashtiramiz (XOR)
      let mixed = "";
      for (let i = 0; i < safeText.length; i++) {
        mixed += String.fromCharCode(safeText.charCodeAt(i) ^ secretKey.charCodeAt(i % secretKey.length));
      }

      // 3. Base64 ga o'girib, ortiqcha '=' belgilarini olib tashlaymiz (siqish)
      return window.btoa(mixed).replace(/=+$/, '');
    } catch (e) {
      console.error(e);
      return "";
    }
  }, []);

  // Qayta ochish
  const decrypt = useCallback((cipher) => {
    if (!cipher) return "";
    try {
      // 1. Base64 dan qaytaramiz
      const mixed = window.atob(cipher);
      
      // 2. Aralashmani to'g'irlaymiz (XOR)
      let safeText = "";
      for (let i = 0; i < mixed.length; i++) {
        safeText += String.fromCharCode(mixed.charCodeAt(i) ^ secretKey.charCodeAt(i % secretKey.length));
      }

      // 3. Asl matnni o'qiymiz
      return decodeURIComponent(safeText);
    } catch (e) {
      return ""; // Xato bo'lsa bo'sh qaytaradi
    }
  }, []);

  return { encrypt, decrypt };
};