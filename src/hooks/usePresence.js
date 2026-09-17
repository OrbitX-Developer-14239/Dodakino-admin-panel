import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Yopilish animatsiyasi uchun "hali ekranda" holati.
 *
 * MUAMMO: React komponentni yashirganda (`if (!open) return null`) u DOM dan
 * darhol olib tashlanadi — CSS da yopilish animatsiyasi yozilgan bo'lsa ham
 * uni ko'rsatishga element qolmaydi. Oyna shunchaki "yo'qolib" qolardi.
 *
 * YECHIM: uch bosqich.
 *   "open"    — ko'rinib turibdi
 *   "leaving" — yopilish animatsiyasi ketyapti, element hali DOM da
 *   "closed"  — animatsiya tugadi, element olib tashlanadi
 *
 * `shown` false bo'lganda darhol yopilmaydi, `leaving` ga o'tadi va
 * `exitMs` dan keyin yopiladi. Yopilish paytida qayta ochilsa — to'g'ridan
 * to'g'ri `open` ga qaytadi.
 *
 * Harakatni kamaytirish yoqilgan bo'lsa (tizim sozlamasi) kutilmaydi.
 */
const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export function usePresence(shown, { exitMs = 180, onExited } = {}) {
  const [phase, setPhase] = useState(shown ? "open" : "closed");

  // Eng oxirgi callback — effekt qayta ishga tushmasligi uchun ref orqali
  const onExitedRef = useRef(onExited);
  onExitedRef.current = onExited;

  useEffect(() => {
    if (shown) {
      setPhase("open");
    } else {
      setPhase((p) => (p === "open" ? "leaving" : p));
    }
  }, [shown]);

  useEffect(() => {
    if (phase !== "leaving") return undefined;
    const timer = setTimeout(() => {
      setPhase("closed");
      onExitedRef.current?.();
    }, prefersReducedMotion() ? 0 : exitMs);
    return () => clearTimeout(timer);
  }, [phase, exitMs]);

  /** Tashqaridan `shown` o'zgarmasdan yopilishni boshlash (X, fon, Escape) */
  const leave = useCallback(() => {
    setPhase((p) => (p === "open" ? "leaving" : p));
  }, []);

  return { mounted: phase !== "closed", leaving: phase === "leaving", leave };
}
