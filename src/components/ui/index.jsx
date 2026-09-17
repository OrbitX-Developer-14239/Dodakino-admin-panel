import { useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { TbAlertTriangle, TbInbox, TbTrendingDown, TbTrendingUp, TbX } from "react-icons/tb";
import styles from "./index.module.scss";
import { trend as fmtTrend } from "../../utils/format";
import { lockScroll } from "../../utils/scrollLock";
import { usePresence } from "../../hooks/usePresence";

/**
 * ============================================
 * Panelning qayta ishlatiladigan bo'laklari
 * ============================================
 *
 * Bitta faylda, chunki ular birga o'zgaradi: Card ichida Badge,
 * Badge yonida Stat turadi va ularning oraliqlari kelishilgan bo'lishi
 * kerak. Har birini alohida papkaga bo'lsak, kelishuv ko'rinmay
 * qolardi — ilgari aynan shunday edi va har komponent o'z
 * padding'ini, o'z radiusini yozardi.
 *
 * Tugma, kiritish maydoni va jadvalning ASOSIY ko'rinishi bu yerda
 * emas, `styles/panel.css` da — ular global, chunki har sahifada
 * aynan bir xil bo'lishi kerak. Bu yerdagi Button/Input/Table esa
 * o'sha global uslublarni ishlatadigan qulay o'ramlar.
 */

/* ── Card ─────────────────────────────────────
   `icon`/`actions` — yangi (ANITOKU) uslub; `subtitle`/`footer` —
   adminkaning eski API'si. Ikkalasi ham qo'llab-quvvatlanadi:
   mavjud sahifalar o'zgarishsiz ishlayversin. */
export function Card({ title, subtitle, icon: Icon, actions, footer, children, className = "" }) {
  return (
    <section className={`${styles.card} ${className}`}>
      {(title || subtitle || actions) && (
        <header className={styles.cardHead}>
          {Icon && <Icon size={16} className={styles.cardIcon} />}
          {(title || subtitle) && (
            <div className={styles.cardHeadText}>
              {title && <h2 className={styles.cardTitle}>{title}</h2>}
              {subtitle && <p className={styles.cardSubtitle}>{subtitle}</p>}
            </div>
          )}
          {actions && <div className={styles.cardActions}>{actions}</div>}
        </header>
      )}
      <div className={styles.cardBody}>{children}</div>
      {footer && <footer className={styles.cardFoot}>{footer}</footer>}
    </section>
  );
}

/* ── Stat ─────────────────────────────────────
   Bitta raqam + izoh + o'zgarish. `trend` — oldingi davrga nisbatan
   foiz; u BO'LMASA umuman ko'rsatilmaydi. "0%" bilan "ma'lumot yo'q"
   bir xil ko'rinmasligi kerak. */
export function Stat({ label, value, sub, tone = "", trend, icon: Icon }) {
  const t = fmtTrend(trend);
  const up = Number(trend) > 0;

  return (
    <div className={`${styles.stat} ${tone ? styles[`tone_${tone}`] : ""}`}>
      <p className={styles.statLabel}>
        {Icon && <Icon size={14} className={styles.statIcon} />}
        {label}
      </p>
      <p className={styles.statValue}>
        {value}
        {t && (
          <span className={`${styles.statTrend} ${up ? styles.trendUp : styles.trendDown}`}>
            {up ? <TbTrendingUp size={13} /> : <TbTrendingDown size={13} />}
            {t}
          </span>
        )}
      </p>
      {sub && <p className={styles.statSub}>{sub}</p>}
    </div>
  );
}

/* ── Badge ────────────────────────────────────
   Holat belgisi. Ilgari har sahifa o'z `.badge_active` sinfini
   yozardi va ular asta-sekin bir-biridan farq qila boshlagandi. */
export function Badge({ tone = "", pulse = false, children }) {
  return (
    <span
      className={`${styles.badge} ${tone ? styles[`badge_${tone}`] : ""} ${pulse ? styles.badgePulse : ""}`}
    >
      {children}
    </span>
  );
}

/* ── Meter ────────────────────────────────────
   Nisbatni ko'rsatadigan chiziq. Raqamning o'zi yetarli emas:
   "3/12" ni o'qib chiqish kerak, chiziqning uzunligi esa bir
   qarashda ko'rinadi. */
export function Meter({ label, value = 0, max = 1, tone = "", right }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;

  return (
    <div className={styles.meter}>
      <div className={styles.meterHead}>
        <span>{label}</span>
        <span className={styles.meterRight}>{right ?? `${Math.round(pct)}%`}</span>
      </div>
      <div className={styles.meterTrack}>
        {/* Kenglik o'zgarganda siljib boradi — sakrab emas */}
        <div
          className={`${styles.meterFill} ${tone ? styles[`tone_${tone}`] : ""}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ── Sahifa sarlavhasi ────────────────────────
   Navbar sahifa nomini allaqachon ko'rsatadi, shuning uchun bu yerda
   sarlavha TAKRORLANMAYDI — faqat bo'limga tegishli tugmalar.
   `title` berilsa u ichki bo'lim sarlavhasi sifatida ishlaydi. */
export function PageHead({ title, desc, children }) {
  return (
    <div className={styles.pageHead}>
      {(title || desc) && (
        <div className={styles.pageHeadText}>
          {title && <h2 className={styles.pageTitle}>{title}</h2>}
          {desc && <p className="hint">{desc}</p>}
        </div>
      )}
      {children && <div className={styles.pageHeadActions}>{children}</div>}
    </div>
  );
}

/* ── Bo'sh holat ──────────────────────────── */
export function Empty({ icon: Icon = TbInbox, children }) {
  return (
    <div className={styles.empty}>
      <Icon size={26} />
      <p>{children || "Hozircha maʼlumot yoʻq"}</p>
    </div>
  );
}

/* ── Yuklanmoqda ──────────────────────────────
   Aylanayotgan g'ildirak emas, skeleton: joyning shakli oldindan
   ko'rinsa, ma'lumot kelganda sahifa "sakramaydi". Ilgari bu yerda
   "Ma'lumotlar yuklanmoqda..." degan matn turardi — u yuklash
   tugagach kontent bilan almashib, sahifani siljitardi. */
export function Loading({ rows = 3 }) {
  return (
    <div className={styles.loading}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={`skeleton ${styles.loadingRow}`} style={{ "--i": i }} />
      ))}
    </div>
  );
}

/* ── Xato ─────────────────────────────────────
   Ilgari xatolar `alert()` orqali chiqarilardi — u sahifani
   bloklaydi, uslubga bo'ysunmaydi va matnni nusxalab bo'lmaydi. */
export function ErrorBox({ error, onRetry }) {
  if (!error) return null;

  return (
    <div className={styles.error} role="alert">
      <TbAlertTriangle size={17} />
      <span>{error.message || String(error)}</span>
      {onRetry && (
        <button type="button" className="btn ghost sm" onClick={onRetry}>
          Qayta urinish
        </button>
      )}
    </div>
  );
}

/* ── Switch ───────────────────────────────────
   Ha/yo'q sozlamasi uchun. `<select>` bilan "Yoqilgan / O'chirilgan"
   ro'yxatini ochib, o'qib, tanlash kerak bo'lardi — ikki holatli
   narsa uchun uch qadam. Kalit esa holatini o'zi ko'rsatib turadi
   va bir tegish bilan almashadi. */
export function Switch({ checked, onChange, label, hint, disabled = false }) {
  return (
    <label className={`${styles.switchRow} ${disabled ? styles.switchOff : ""}`}>
      <span className={styles.switchText}>
        <span className={styles.switchLabel}>{label}</span>
        {hint && <small>{hint}</small>}
      </span>

      <input
        type="checkbox"
        className={styles.switchInput}
        checked={Boolean(checked)}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
      />
      <span className={styles.switchTrack} aria-hidden="true">
        <span className={styles.switchKnob} />
      </span>
    </label>
  );
}

/* ── Modal ────────────────────────────────────
   Bitta narsani to'liq ko'rish yoki tahrirlash uchun. Ro'yxat orqada
   turadi — foydalanuvchi qayerdan kelganini unutmaydi va yopgach
   o'sha joyiga qaytadi.

   `open` — yangi nom, `isOpen` — adminkaning eski API'si. Ikkalasi
   ham qabul qilinadi, shuning uchun mavjud sahifalarga tegilmadi. */
/**
 * Modal oyna.
 *
 * OCHILISH VA YOPILISH SILLIQ: ilgari yopilganda komponent DOM dan darhol
 * olib tashlanardi va CSS animatsiyasiga vaqt qolmasdi — oyna shunchaki
 * yo'qolib qolardi. Endi usePresence yopilish animatsiyasi tugaguncha
 * elementni ushlab turadi.
 *
 * Ikki xil yopilish:
 *   - Foydalanuvchi (X, fon, Escape) — avval animatsiya, KEYIN onClose.
 *     Shu tufayli oynani shartli render qiladigan ota komponent
 *     (`{x && <Modal isOpen />}`) ham animatsiyani ko'rsatadi.
 *   - Tashqaridan `isOpen` false bo'lsa — animatsiya, keyin onExited.
 *
 * Yopilish paytida oynaning ichi bo'shab qolmasligi uchun oxirgi sarlavha
 * va mazmun eslab qolinadi: ko'p joyda mazmun `{item && <form/>}` bilan
 * yoziladi va ota holatni null qilgan zahoti forma yo'qolardi.
 */
export function Modal({ open, isOpen, title, onClose, onExited, actions, size = "", children }) {
  const shown = open ?? isOpen ?? false;

  const lastView = useRef({ title, actions, children });
  if (shown) lastView.current = { title, actions, children };

  const closingByUser = useRef(false);
  const { mounted, leaving, leave } = usePresence(shown, {
    onExited: () => {
      if (closingByUser.current) {
        closingByUser.current = false;
        onClose?.();
      }
      onExited?.();
    },
  });

  const requestClose = useCallback(() => {
    if (leaving) return;
    closingByUser.current = true;
    leave();
  }, [leaving, leave]);

  // Varaq ortidagi sahifa surilmaydi — yopilish animatsiyasi tugaguncha ham
  useEffect(() => {
    if (!mounted) return undefined;
    return lockScroll();
  }, [mounted]);

  useEffect(() => {
    if (!mounted || leaving) return undefined;
    const onKey = (e) => e.key === "Escape" && requestClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mounted, leaving, requestClose]);

  if (!mounted) return null;

  const view = shown ? { title, actions, children } : lastView.current;

  /**
   * PORTAL — sahifa ichida emas, <body> ga.
   *
   * Router har bir sahifani `.page-transition` ichiga o'raydi va unda
   * transform ishlatadigan animatsiya bor. Transformli element o'zining
   * ichidagi `position: fixed` elementlar uchun YANGI KOORDINATA
   * BOSHLANG'ICHI yasaydi — ya'ni "ekran bo'ylab" degan qoida "shu blok
   * bo'ylab" ga aylanadi. Portal bu butun muammolar sinfini yopadi:
   * <body> ning ustida hech qanday transform yo'q va bo'lishi ham
   * mumkin emas.
   */
  return createPortal(
    <div
      className={styles.modalWrap}
      role="dialog"
      aria-modal="true"
      aria-label={view.title}
      data-leaving={leaving || undefined}
    >
      <div className={styles.modalOverlay} onClick={requestClose} role="presentation" />

      <div className={`${styles.modal} ${size ? styles[`modal_${size}`] : ""}`}>
        <header className={styles.modalHead}>
          <h2 className={styles.modalTitle}>{view.title}</h2>
          <button type="button" className="btn ghost sm" onClick={requestClose} aria-label="Yopish">
            <TbX size={15} />
          </button>
        </header>

        <div className={styles.modalBody}>{view.children}</div>

        {view.actions && <footer className={styles.modalFoot}>{view.actions}</footer>}
      </div>
    </div>,
    document.body
  );
}

/* ── Tugma ────────────────────────────────────
   Ko'rinishi panel.css dagi global `.btn` sinfidan keladi — shu
   sababli oddiy `<button className="btn">` ham aynan shunday
   ko'rinadi. Bu o'ram faqat `variant`/`loading` qulayligi uchun. */
export function Button({
  children,
  variant = "primary",
  size = "",
  loading = false,
  disabled = false,
  className = "",
  ...props
}) {
  // primary — global `.btn` ning o'zi, qo'shimcha sinf kerak emas.
  // secondary — panel.css da bunday variant yo'q; u ghost bilan deyarli
  // bir xil ko'rinardi (fon + chegara), shuning uchun shunga yo'naltiriladi.
  const variantClass =
    variant === "primary" ? "" : variant === "secondary" ? "ghost" : variant;

  return (
    <button
      className={`btn ${variantClass} ${size} ${className}`.replace(/\s+/g, " ").trim()}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <span className={styles.spinner} aria-hidden="true" />}
      {children}
    </button>
  );
}

/* ── Kiritish maydoni ─────────────────────────
   Maydonning o'zi panel.css dan uslub oladi; bu o'ram unga yorliq
   va xato matnini qo'shadi (`.field` tartibida). */
export function Input({ label, error, hint, className = "", ...props }) {
  return (
    <label className={`field ${className}`}>
      {label && <span>{label}</span>}
      <input className={error ? styles.inputError : ""} {...props} />
      {error && <small className={styles.fieldError}>{error}</small>}
      {!error && hint && <small>{hint}</small>}
    </label>
  );
}

/* ── Jadval ───────────────────────────────────
   `columns` shakli: { title, key, width?, render?(value, row) }.
   Ko'rinishi panel.css dagi global jadval uslublaridan keladi.

   Keng jadval O'Z ICHIDA suriladi (`.table-wrap`) — sahifaning o'zi
   hech qachon yon tomonga surilmasligi kerak. Ilgari jadvalga
   `min-width: 800px` berilgani uchun telefonda butun sahifa
   qiyshayib ketardi. */
export function Table({ columns = [], data = [], isLoading = false, onRowClick, empty }) {
  if (isLoading) return <Loading rows={4} />;
  if (!data.length) return <Empty>{empty}</Empty>;

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} style={col.width ? { width: col.width } : undefined}>
                {col.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={row._id || row.id || i}
              className={onRowClick ? styles.rowClickable : ""}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((col) => (
                <td key={col.key}>
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Sahifalash ───────────────────────────────
   Ilgari bu blok to'rtta sahifada AYNAN nusxalangan edi. */
export function Pagination({ page, totalPages, onChange }) {
  if (!totalPages || totalPages <= 1) return null;

  return (
    <div className={styles.pagination}>
      <button
        type="button"
        className="btn ghost sm"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
      >
        ← Oldingi
      </button>

      <span className={styles.pageInfo}>
        {page} / {totalPages}
      </span>

      <button
        type="button"
        className="btn ghost sm"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
      >
        Keyingi →
      </button>
    </div>
  );
}
