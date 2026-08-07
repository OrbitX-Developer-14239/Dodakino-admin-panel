/**
 * Sessiya holatini kuzatadi.
 *
 * "checking" — refresh urinilmoqda, hali qaror qilinmagan (login sahifasiga
 *              otish MUMKIN EMAS, aks holda amaldagi sessiya bekorga uziladi)
 * "authed"   — foydalanuvchi tizimda
 * "guest"    — sessiya yo'q
 */

import { useEffect, useState } from "react";
import { ensureSession } from "../api/session";
import { TokenManager } from "../api/tokenManager";

export const useSession = () => {
    // Token amal qilayotgan bo'lsa darhol "authed" — bo'sh ekran chaqnamaydi.
    // Faqat token eskirgan/yo'q bo'lsagina "checking" holatida kutamiz.
    const [status, setStatus] = useState(() =>
        TokenManager.isAccessTokenExpired() ? "checking" : "authed"
    );

    useEffect(() => {
        let cancelled = false;

        const resolve = async () => {
            const ok = await ensureSession();
            if (!cancelled) setStatus(ok ? "authed" : "guest");
        };

        resolve();

        // client.js refresh butunlay muvaffaqiyatsiz bo'lganda shu hodisani yuboradi
        const onLogout = () => { if (!cancelled) setStatus("guest"); };
        window.addEventListener("auth:logout", onLogout);

        return () => {
            cancelled = true;
            window.removeEventListener("auth:logout", onLogout);
        };
    }, []);

    return status;
};
