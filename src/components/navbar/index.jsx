import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { TbMoon, TbSun, TbLogout } from "react-icons/tb";
// ⏸ Uch holatli tugma yoqilganda: import { TbDeviceDesktop, TbMoon, TbSun, TbLogout } from "react-icons/tb";
import styles from "./index.module.scss";
import theme from "@theme";
import AdminService from "../../api/services/authService";
import { setSelectedBotId } from "../../api/botContext";
import { findRouteByPath } from "../../router/routes";
import { Button, Select } from "../ui";
import { useBusy } from "../../hooks/useBusy";

/*
 * ⏸ KEYINGA QOLDIRILGAN — UCH HOLATLI MAVZU TUGMASI (tizim / yorug' / qorong'i).
 * Yoqish uchun: shu blokni, yuqoridagi TbDeviceDesktop importini va
 * pastdagi "⏸" izohlaridagi kodni ochib, hozirgi ikki holatli
 * variantni olib tashlang. ThemeManager va public/index.html dagi
 * sukutni ham "auto" ga o'tkazing.
 *
 * const THEME_META = {
 *   auto: { label: "tizim" },
 *   light: { label: "yorugʻ" },
 *   dark: { label: "qorongʻi" },
 * };
 * const THEME_NEXT = { auto: "light", light: "dark", dark: "auto" };
 */

/**
 * Navbar — sahifa nomi va butun panelga taalluqli uchta boshqaruv:
 * qaysi bot, mavzu, chiqish.
 *
 * NEGA AYNAN SHU UCHTASI: navbar har sahifada ko'rinadi, demak unga
 * faqat "qayerda bo'lsam ham kerak bo'lishi mumkin" degan amallar
 * tushadi. Bot tanlash — aynan shunday: undan keyin hamma sahifa
 * o'sha botning ma'lumotini ko'rsatadi.
 */
function Navbar({ bots = [], currentBotId = "" }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const route = findRouteByPath(pathname);

  const [mode, setMode] = useState(() => theme.get().effective);
  // ⏸ Uch holatli tugmada — tanlangan REJIM (auto/light/dark), amaldagi rang emas:
  // const [mode, setMode] = useState(() => theme.get().mode);
  const [admin, setAdmin] = useState(null);

  // Mavzu boshqa joydan o'zgarsa (masalan tizim rejimi) tugma ham
  // yangilansin — holat ikki joyda saqlanmasin.
  useEffect(() => theme.subscribe((effective) => setMode(effective)), []);
  // ⏸ Uch holatli tugmada:
  // useEffect(() => theme.subscribe((_effective, selected) => setMode(selected)), []);

  // Admin nomi JWT da yo'q — chiqish tugmasining izohi uchun so'raladi
  useEffect(() => {
    AdminService.me().then(setAdmin).catch(() => {});
  }, []);

  const [loggingOut, runLogout] = useBusy();
  const logout = async () => {
    await AdminService.logout();
    navigate("/auth", { replace: true });
  };

  return (
    <header className={styles.wrapper}>
      <div className={`layout-inner ${styles.inner}`}>
        <div className={styles.titleBox}>
          {/* Sarlavha route'dan olinadi: "Boshqaruv paneli | TROYA ADMIN"
              dagi birinchi bo'lak. Sahifa o'zi yana bir bor yozmaydi —
              ikkalasi farq qilib qolishi mumkin bo'lmasin. */}
          <h1 className={styles.title}>{(route?.title || "").split("|")[0].trim()}</h1>
          <p className={styles.desc}>{route?.description}</p>
        </div>

        <div className={styles.actions}>
          {/* Multibot: qaysi botning ma'lumotlari ko'rsatilyapti.
              Bitta bot bo'lsa tanlashning ma'nosi yo'q — yashiriladi. */}
          {bots.length > 1 && (
            <Select
              className={styles.botSelect}
              size="sm"
              value={currentBotId}
              onChange={(id) => setSelectedBotId(id)}
              title="Qaysi botning ma'lumotlari ko'rsatilsin"
              ariaLabel="Bot tanlash"
              options={bots.map((b) => ({
                value: String(b.botId),
                label: `${b.username ? `@${b.username}` : b.botId}${b.active ? "" : " (ulanmagan)"}`,
                disabled: !b.active,
              }))}
            />
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

          {/* ⏸ KEYINGA QOLDIRILGAN — uch holatli tugma (tizim → yorug' → qorong'i → tizim).
              Belgi HOZIRGI rejimni ko'rsatadi, izoh esa keyingisini aytadi.
          <button
            type="button"
            className={`btn ghost sm ${styles.iconBtn}`}
            onClick={() => theme.set({ mode: THEME_NEXT[mode] })}
            title={`Mavzu: ${THEME_META[mode].label} · bosing — ${THEME_META[THEME_NEXT[mode]].label}`}
            aria-label={`Mavzu: ${THEME_META[mode].label}. Almashtirish`}
          >
            <span className={styles.themeIcon} key={mode}>
              {mode === "auto" ? (
                <TbDeviceDesktop size={15} />
              ) : mode === "light" ? (
                <TbSun size={15} />
              ) : (
                <TbMoon size={15} />
              )}
            </span>
          </button>
          */}

          <Button
            variant="ghost"
            size="sm"
            className={styles.iconBtn}
            busy={loggingOut}
            onClick={() => runLogout(logout)}
            title={admin?.username ? `${admin.username} — chiqish` : "Chiqish"}
            aria-label={loggingOut ? "Chiqilmoqda" : "Chiqish"}
          >
            {!loggingOut && <TbLogout size={15} />}
          </Button>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
