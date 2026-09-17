import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { TbMoon, TbSun, TbLogout } from "react-icons/tb";
import styles from "./index.module.scss";
import theme from "@theme";
import AdminService from "../../api/services/authService";
import { TokenManager } from "../../api/tokenManager";
import { getSelectedBotId, setSelectedBotId } from "../../api/botContext";
import { findRouteByPath } from "../../router/routes";

/**
 * Navbar — sahifa nomi va butun panelga taalluqli boshqaruvlar:
 * bot tanlagich, mavzu, chiqish.
 *
 * NEGA AYNAN SHULAR: navbar har sahifada ko'rinadi, demak unga faqat
 * "qayerda bo'lsam ham kerak bo'lishi mumkin" degan amallar tushadi.
 *
 * MAVZU: ilgari AdminLayout o'zining `isDarkMode` holatini yuritib,
 * to'g'ridan-to'g'ri classList va localStorage bilan ishlardi —
 * ThemeManager'ni butunlay chetlab o'tib. Natijada "auto" (tizim
 * rejimi) tanlovi yo'qolardi va ikkita manba bir-birini bosardi.
 * Endi yagona manba — ThemeManager.
 */
function Navbar({ bots = [] }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const route = findRouteByPath(pathname);

  const [mode, setMode] = useState(() => theme.get().effective);
  const selectedBotId = getSelectedBotId();

  // Mavzu boshqa joydan o'zgarsa (masalan tizim rejimi yoki boshqa
  // brauzer oynasi) tugma ham yangilansin — holat ikki joyda saqlanmasin.
  useEffect(() => theme.subscribe((effective) => setMode(effective)), []);

  const admin = TokenManager.getUserFromToken?.();

  const logout = async () => {
    try {
      await AdminService.logout();
    } catch {
      // Server javob bermasa ham lokal tokenlar tozalanadi
    } finally {
      TokenManager.clearTokens();
      navigate("/auth", { replace: true });
    }
  };

  return (
    <header className={styles.wrapper}>
      <div className={`layout-inner ${styles.inner}`}>
        <div className={styles.titleBox}>
          {/* Sarlavha route'dan olinadi: "Doda Kino | Filmlar" dagi
              ikkinchi bo'lak. Sahifa uni yana bir bor yozmaydi —
              ikkalasi farq qilib qolishi mumkin bo'lmasin. Ilgari bu
              yerda doim "Boshqaruv paneli" yozuvi turardi, qaysi
              bo'limda ekaningizdan qat'i nazar. */}
          <h1 className={styles.title}>
            {(route?.title || "").split("|").pop().trim()}
          </h1>
          <p className={styles.desc}>{route?.description}</p>
        </div>

        <div className={styles.actions}>
          {/* Multibot: qaysi botning ma'lumotlari ko'rsatilyapti.
              Bitta bot bo'lsa tanlashning ma'nosi yo'q — yashiriladi. */}
          {bots.length > 1 && (
            <select
              className={styles.botSelect}
              value={selectedBotId || String(bots[0]?.botId || "")}
              onChange={(e) => setSelectedBotId(e.target.value)}
              title="Qaysi botning ma'lumotlari ko'rsatilsin"
              aria-label="Bot tanlash"
            >
              {bots.map((b) => (
                <option key={b.botId} value={b.botId} disabled={!b.active}>
                  {b.username ? `@${b.username}` : b.botId}
                  {b.active ? "" : " (ulanmagan)"}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            className={`btn ghost sm ${styles.iconBtn}`}
            onClick={() => theme.set({ mode: mode === "dark" ? "light" : "dark" })}
            title={mode === "dark" ? "Yorugʻ mavzuga oʻtish" : "Tungi mavzuga oʻtish"}
            aria-label="Mavzuni almashtirish"
          >
            {/* Belgi aylanib almashadi — o'zgarish sezilsin */}
            <span className={styles.themeIcon} key={mode}>
              {mode === "dark" ? <TbSun size={15} /> : <TbMoon size={15} />}
            </span>
          </button>

          <button
            type="button"
            className={`btn ghost sm ${styles.iconBtn}`}
            onClick={logout}
            title={admin?.username ? `${admin.username} — chiqish` : "Chiqish"}
            aria-label="Chiqish"
          >
            <TbLogout size={15} />
          </button>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
