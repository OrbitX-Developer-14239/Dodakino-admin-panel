import { useCallback, useState } from "react";

/**
 * Amal bajarilayotganini kuzatish — tugmadagi yuklanish belgisi uchun.
 *
 *   const [saving, runSave] = useBusy();
 *   <Button busy={saving} busyText="Saqlanmoqda…" onClick={() => runSave(save)}>
 *
 * `run` amal tugaguncha (xato bilan tugasa ham) `busy` ni true ushlab
 * turadi va amalning natijasini qaytaradi. Ikkinchi bosish esa tugma
 * o'chiq bo'lgani uchun umuman yetib kelmaydi.
 */
export function useBusy() {
  const [busy, setBusy] = useState(false);

  const run = useCallback(async (fn) => {
    setBusy(true);
    try {
      return await fn();
    } finally {
      setBusy(false);
    }
  }, []);

  return [busy, run];
}
