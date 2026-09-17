import styles from "./index.module.scss";
import { getSelectedBotId } from "../../api/botContext";

/**
 * Footer — panelning eng past qatori.
 *
 * Bu yerda reklama yoki havolalar yo'q: ichki asbob uchun ular shovqin.
 * Faqat "qaysi bot bilan ishlayapman va qaysi versiya" — nosozlikni
 * tekshirish odatda shu ikki savoldan boshlanadi.
 */
function Footer({ bots = [] }) {
  const selectedId = getSelectedBotId();
  const active =
    bots.find((b) => String(b.botId) === String(selectedId)) || bots[0] || null;

  return (
    <footer className={styles.wrapper}>
      <div className={`layout-inner ${styles.inner}`}>
        {active && (
          <span className={styles.dotRow}>
            <span
              className={`${styles.dot} ${active.active ? styles.dotOk : styles.dotBad}`}
            />
            {active.username ? `@${active.username}` : active.botId}
          </span>
        )}

        <span className="spacer" />

        <span className={styles.meta}>
          Doda Kino · v{process.env.REACT_APP_VERSION || "1.0.0"}
        </span>
      </div>
    </footer>
  );
}

export default Footer;
