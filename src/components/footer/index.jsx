import { useEffect, useState } from "react";
import styles from "./index.module.scss";
import client, { API_ORIGIN } from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";

/**
 * Footer — panelning eng past qatori.
 *
 * Bu yerda reklama yoki havolalar yo'q: ichki asbob uchun ular
 * shovqin. Faqat "server tirikmi" va "qaysi bot bilan ishlayapman" —
 * nosozlikni tekshirish har doim shu savollardan boshlanadi.
 */
function Footer({ currentBot }) {
  const [health, setHealth] = useState(null);

  useEffect(() => {
    // /health API ildizidan TASHQARIDA ("/api" siz) turadi
    const load = () =>
      client
        .get(ENDPOINTS.HEALTH, { baseURL: API_ORIGIN, silent: true })
        .then((res) => setHealth({ ok: res?.status === "ok" }))
        .catch(() => setHealth({ ok: false }));

    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, []);

  return (
    <footer className={styles.wrapper}>
      <div className={`layout-inner ${styles.inner}`}>
        <span className={styles.dotRow}>
          <span className={`${styles.dot} ${health?.ok ? styles.dotOk : styles.dotBad}`} />
          {health ? (health.ok ? "Server ishlamoqda" : "Server javob bermayapti") : "Tekshirilmoqda…"}
        </span>

        {currentBot && (
          <span className={styles.meta}>
            {currentBot.username ? `@${currentBot.username}` : currentBot.botId}
            {currentBot.active ? "" : " · ulanmagan"}
          </span>
        )}

        <span className="spacer" />

        <span className={styles.meta}>Troya Admin · v{process.env.REACT_APP_VERSION || "1.0.0"}</span>
      </div>
    </footer>
  );
}

export default Footer;
