import { useCallback, useState } from "react";
import { Confirm } from "../components/ui";

/**
 * Tasdiqlash oynasini chaqirish.
 *
 *   const [confirm, confirmDialog] = useConfirm();
 *
 *   confirm({
 *     title: "Filmni o'chirish",
 *     message: "“Afsona” o'chirilsinmi?",
 *     confirmText: "O'chirish",
 *     action: () => client.delete(...),   // tasdiqlangandan keyin
 *   });
 *
 *   return <>{...}{confirmDialog}</>;
 *
 * `action` bajarilayotganda tugma aylanadi ("O'chirilmoqda…") va oyna
 * bosilmaydi. Muvaffaqiyatli bo'lsa oyna yopiladi, xato bo'lsa ochiq
 * qoladi va xato matnini ko'rsatadi — admin nima bo'lganini ko'radi.
 */
export function useConfirm() {
  const [request, setRequest] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const confirm = useCallback((opts) => {
    setError(null);
    setRequest(opts);
  }, []);

  const cancel = useCallback(() => {
    if (!busy) setRequest(null);
  }, [busy]);

  const accept = useCallback(async () => {
    if (!request || busy) return;
    setBusy(true);
    setError(null);
    try {
      await request.action?.();
      setRequest(null);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }, [request, busy]);

  const dialog = request ? (
    <Confirm
      open
      title={request.title}
      message={request.message}
      details={request.details}
      confirmText={request.confirmText}
      busyText={request.busyText}
      tone={request.tone}
      busy={busy}
      error={error}
      onConfirm={accept}
      onCancel={cancel}
    />
  ) : null;

  return [confirm, dialog];
}
