/**
 * ============================================
 * DODA KINO — Sessiya tiklash (silent refresh)
 * ============================================
 *
 * Access token atigi 15 daqiqa yashaydi, refreshToken cookie esa 15 kun.
 *
 * Ilgari route qo'riqchisi faqat access token muddatiga qarardi: 15 daqiqadan
 * keyin sahifa yangilansa yoki boshqa bo'limga o'tilsa, foydalanuvchi darhol
 * login sahifasiga otilardi — refresh cookie umuman ishlatilmasdan. Chunki
 * client.js dagi interceptor faqat API so'rovi 401 qaytarganda uyg'onadi,
 * qo'riqchi esa undan oldin ishlab bo'lardi.
 *
 * Bu modul ilova ochilganda (yoki token eskirganda) jimgina refresh urinib
 * ko'radi va shundan keyingina "chiqib ketgan" degan qarorga keladi.
 */

import axios from "axios";
import { TokenManager } from "./tokenManager";

const REFRESH_URL = `${process.env.REACT_APP_API_BASE_URL}/admin/refresh`;

// Bir vaqtda bir nechta komponent chaqirsa ham refresh FAQAT bir marta ketadi
let inFlight = null;

/**
 * Amaldagi sessiyani tekshiradi, kerak bo'lsa access tokenni yangilaydi.
 * @returns {Promise<boolean>} true — foydalanuvchi tizimda, false — yo'q
 */
export const ensureSession = async () => {
    if (!TokenManager.isAccessTokenExpired()) return true;

    if (inFlight) return inFlight;

    inFlight = (async () => {
        try {
            // refreshToken HttpOnly cookie da — JS uni ko'ra olmaydi,
            // shuning uchun shunchaki urinib ko'ramiz.
            const { data } = await axios.post(REFRESH_URL, {}, { withCredentials: true });
            const accessToken = data?.data?.accessToken || data?.accessToken;

            if (!accessToken) return false;

            TokenManager.setAccessToken(accessToken);
            return true;
        } catch {
            TokenManager.clearTokens();
            return false;
        } finally {
            inFlight = null;
        }
    })();

    return inFlight;
};
