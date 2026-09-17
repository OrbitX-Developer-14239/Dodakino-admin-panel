import { NavLink } from "react-router-dom";
import styles from "./index.module.scss";
import { navGroups } from "../../router/routes";
import Asset from "@asset";

/**
 * Sidebar — asosiy navigatsiya (kompyuter va planshet).
 *
 * Bandlar `routes.js` dan olinadi, bu yerda ro'yxat QO'LDA yozilmaydi:
 * yangi bo'lim qo'shilganda menyuga qo'shishni unutish mumkin bo'lmasin.
 * Ilgari menyu AdminLayout ichidagi alohida massiv edi va ikonkalar
 * o'rniga kulrang bo'sh kvadratlar turardi.
 */
function Sidebar() {
  return (
    <aside className={styles.wrapper}>
      <div className={styles.brand}>
        <Asset.Icon name="logo" className={styles.logo} aria-hidden="true" />
        <span className={styles.badge}>Admin</span>
      </div>

      <nav className={styles.nav}>
        {navGroups.map((group) => (
          <div key={group.title} className={styles.group}>
            <p className={styles.groupTitle}>{group.title}</p>

            {group.items.map(({ path, label, icon: Icon }, i) => (
              <NavLink
                key={path}
                to={path}
                className={({ isActive }) =>
                  `${styles.item} ${isActive ? styles.itemOn : ""}`
                }
                style={{ "--i": i }}
              >
                <Icon size={18} className={styles.icon} />
                <span>{label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className={styles.foot}>
        <span className="hint mono">v{process.env.REACT_APP_VERSION || "1.0.0"}</span>
      </div>
    </aside>
  );
}

export default Sidebar;
