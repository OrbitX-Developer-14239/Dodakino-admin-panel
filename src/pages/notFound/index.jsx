import { Link } from "react-router-dom";
import styles from "./index.module.scss";
import { TokenManager } from "../../api/tokenManager";

/**
 * 404 — mavjud bo'lmagan manzil. Layout'siz (standalone) render
 * qilinadi, shuning uchun o'zi to'liq ekranni egallaydi.
 *
 * Ilgari bu sahifa 12 qatorlik, inline `style` bilan yozilgan va
 * karkassiz sahifa fonida yalang'och turardi.
 */
function NotFoundPage() {
  // Kirmagan foydalanuvchini dashboard'ga yuborish ma'nosiz — u
  // baribir /auth ga qaytariladi.
  const home = TokenManager.hasAccessToken?.() ? "/dashboard" : "/auth";

  return (
    <main className={styles.wrapper}>
      <section className={styles.container}>
        <p className={styles.code} aria-hidden="true">404</p>

        <h1 className={styles.title}>Sahifa topilmadi</h1>

        <p className={styles.text}>
          Bu manzilda hech narsa yo'q — havola eskirgan yoki noto'g'ri
          yozilgan bo'lishi mumkin.
        </p>

        <Link to={home} className={styles.button}>
          {home === "/dashboard" ? "Boshqaruv paneliga qaytish" : "Kirish sahifasiga o'tish"}
        </Link>
      </section>
    </main>
  );
}

export default NotFoundPage;
