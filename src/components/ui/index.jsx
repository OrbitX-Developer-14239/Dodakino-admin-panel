import { useEffect } from "react";
import { createPortal } from "react-dom";
import { TbAlertTriangle, TbInbox, TbTrendingDown, TbTrendingUp, TbX } from "react-icons/tb";
import styles from "./index.module.scss";
import { trend as fmtTrend } from "../../utils/format";
import { lockScroll } from "../../utils/scrollLock";

/**
 * Panelning qayta ishlatiladigan bo'laklari.
 *
 * Bitta faylda, chunki ular birga o'zgaradi: Card ichida Badge,
 * Badge yonida Stat turadi va ularning oraliqlari kelishilgan bo'lishi
 * kerak. Har birini alohida papkaga bo'lsak, kelishuv ko'rinmay
 * qolardi.
 */

/* ── Card ───────────────────────────────────── */
export function Card({ title, icon: Icon, actions, children, className = "" }) {
  return (
    <section className={`${styles.card} ${className}`}>
      {(title || actions) && (
        <header className={styles.cardHead}>
          {Icon && <Icon size={16} className={styles.cardIcon} />}
          {title && <h2 className={styles.cardTitle}>{title}</h2>}
          {actions && <div className={styles.cardActions}>{actions}</div>}
        </header>
      )}
      <div className={styles.cardBody}>{children}</div>
    </section>
  );
}

/* ── Stat ─────────────────────────────────────
   Bitta raqam + izoh + o'zgarish. `trend` — kechagi kunga nisbatan
   foiz; u BO'LMASA umuman ko'rsatilmaydi. "0%" bilan "ma'lumot yo'q"
   bir xil ko'rinmasligi kerak. */
export function Stat({ label, value, sub, tone = "", trend }) {
  const t = fmtTrend(trend);
  const up = Number(trend) > 0;

  return (
    <div className={`${styles.stat} ${tone ? styles[`tone_${tone}`] : ""}`}>
      <p className={styles.statLabel}>{label}</p>
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

/* ── Badge ──────────────────────────────────── */
export function Badge({ tone = "", pulse = false, children }) {
  return (
    <span className={`${styles.badge} ${tone ? styles[`badge_${tone}`] : ""} ${pulse ? styles.badgePulse : ""}`}>
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

/* ── Bo'sh holat ────────────────────────────── */
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
   ko'rinsa, ma'lumot kelganda sahifa "sakramaydi". */
export function Loading({ rows = 3 }) {
  return (
    <div className={styles.loading}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={`skeleton ${styles.loadingRow}`} style={{ "--i": i }} />
      ))}
    </div>
  );
}

/* ── Modal ────────────────────────────────────
   Bitta narsani to'liq ko'rish yoki tahrirlash uchun. Ro'yxat orqada
   turadi — foydalanuvchi qayerdan kelganini unutmaydi va yopgach
   o'sha joyiga qaytadi. */
export function Modal({ open, title, onClose, actions, children }) {
  // Escape bilan yopiladi va varaq ortidagi sahifa surilmaydi.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    const unlock = lockScroll();
    return () => {
      unlock();
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  /**
   * PORTAL — sahifa ichida emas, <body> ga.
   *
   * Router har bir sahifani `.page-transition` ichiga o'raydi va unda
   * transform ishlatadigan animatsiya bor. Transformli element o'zining
   * ichidagi `position: fixed` elementlar uchun YANGI KOORDINATA
   * BOSHLANG'ICHI yasaydi — ya'ni "ekran bo'ylab" degan qoida "shu blok
   * bo'ylab" ga aylanadi.
   *
   * Aynan shu sababdan oyna sahifaning ichida, ko'rinmas joyda
   * chizilardi: ekranda faqat qoraytiruvchi qatlam ko'rinib, oynaning
   * o'zi topilmasdi — va sahifa qulflangani uchun uni izlab pastga
   * ham tushib bo'lmasdi.
   *
   * Portal bu butun muammolar sinfini yopadi: <body> ning ustida hech
   * qanday transform yo'q va bo'lishi ham mumkin emas.
   */
  return createPortal(
    <div className={styles.modalWrap} role="dialog" aria-modal="true" aria-label={title}>
      <div className={styles.modalOverlay} onClick={onClose} role="presentation" />

      <div className={styles.modal}>
        <header className={styles.modalHead}>
          <h2 className={styles.modalTitle}>{title}</h2>
          <button type="button" className="btn ghost sm" onClick={onClose} aria-label="Yopish">
            <TbX size={15} />
          </button>
        </header>

        <div className={styles.modalBody}>{children}</div>

        {actions && <footer className={styles.modalFoot}>{actions}</footer>}
      </div>
    </div>,
    document.body
  );
}

/* ── Switch ───────────────────────────────────
   Ha/yo'q sozlamasi uchun. Ilgari bu `<select>` edi: "Yoqilgan /
   O'chirilgan" ro'yxatini ochib, o'qib, tanlash kerak bo'lardi —
   ikki holatli narsa uchun uch qadam. Kalit esa holatini o'zi
   ko'rsatib turadi va bir tegish bilan almashadi. */
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

/* ── Xato ───────────────────────────────────── */
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

export { Select } from "./Select";

/* ── Segmentli tanlagich ──────────────────────
   Vaqt oralig'i, holat kabi 2-5 variantli tanlov. Kapsula ichidagi
   tugmalar; tor ekranda sig'masa yon tomonga suriladi (.swipe) —
   o'ralib, ostidagi hamma narsani siljitmaydi. */
export function Segmented({ options = [], value, onChange, label }) {
  return (
    <div className={`${styles.segmented} swipe`} role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          className={`${styles.segment} ${String(value) === String(o.value) ? styles.segmentOn : ""}`}
          aria-pressed={String(value) === String(o.value)}
          onClick={() => onChange?.(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ── Sahifalash ───────────────────────────────
   Bitta sahifa bo'lsa umuman ko'rinmaydi — "1 / 1" hech narsa
   aytmaydi, faqat joy egallaydi. */
export function Pagination({ page = 1, totalPages = 1, onChange }) {
  if (!totalPages || totalPages <= 1) return null;

  return (
    <nav className={styles.pagination} aria-label="Sahifalar">
      <button
        type="button"
        className="btn ghost sm"
        disabled={page <= 1}
        onClick={() => onChange?.(page - 1)}
      >
        ‹ Oldingi
      </button>
      <span className={styles.pageInfo}>
        {page} / {totalPages}
      </span>
      <button
        type="button"
        className="btn ghost sm"
        disabled={page >= totalPages}
        onClick={() => onChange?.(page + 1)}
      >
        Keyingi ›
      </button>
    </nav>
  );
}

/* ── Tugma (yuklanish holati bilan) ───────────
   `busy` bo'lganda ichida aylanuvchi belgi chiqadi va yozuv
   bajarilayotgan ishni aytadi ("Saqlanmoqda…"). Tugma o'sha payt
   bosilmaydi — ikki marta yuborilib, film ikki marta yaratilmasin.
   Kengligi o'zgarmasligi uchun belgi yozuvning o'rniga emas, oldiga
   qo'yiladi. */
export function Button({
  busy = false,
  busyText,
  variant = "",
  size = "",
  icon: Icon,
  className = "",
  disabled,
  children,
  type = "button",
  ...props
}) {
  return (
    <button
      type={type}
      className={`btn ${variant} ${size} ${className}`.replace(/\s+/g, " ").trim()}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      {...props}
    >
      {busy ? (
        <span className={styles.spinner} aria-hidden="true" />
      ) : (
        Icon && <Icon size={size === "sm" ? 13 : 14} />
      )}
      {busy && busyText ? busyText : children}
    </button>
  );
}

/* ── Tasdiqlash oynasi ────────────────────────
   O'chirish kabi qaytarilmaydigan amal oldidan. Brauzerning
   `window.confirm` oynasi o'rnida: u panel dizayniga tegmaydi, tungi
   mavzuni bilmaydi va amal bajarilayotganini ko'rsata olmaydi.

   BOSHQA OYNA USTIDA: film oynasi ochiq turganda "O'chirish" bosilsa,
   bu oyna uning ustiga chiqadi. Escape faqat SHU oynani yopishi kerak —
   shuning uchun klaviatura hodisasi capture bosqichida ushlanadi va
   ostidagi oynaga yetib bormaydi.

   Amal xato bilan tugasa oyna yopilmaydi — xato shu yerda ko'rinadi. */
export function Confirm({
  open,
  title = "Tasdiqlang",
  message,
  details,
  confirmText = "Oʻchirish",
  busyText = "Oʻchirilmoqda…",
  cancelText = "Bekor qilish",
  tone = "danger",
  busy = false,
  error = null,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    if (!open) return undefined;
    // Faqat Escape ushlanadi. Enter ATAYLAB tasdiqlamaydi: fokus
    // "Bekor qilish" da turadi, tasodifiy Enter hech narsani o’chirmasin.
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation();
      e.preventDefault();
      if (!busy) onCancel?.();
    };
    window.addEventListener("keydown", onKey, true);
    const unlock = lockScroll();
    return () => {
      window.removeEventListener("keydown", onKey, true);
      unlock();
    };
  }, [open, busy, onCancel]);

  if (!open) return null;

  return createPortal(
    <div className={`${styles.modalWrap} ${styles.confirmWrap}`} role="alertdialog" aria-modal="true" aria-label={title}>
      <div className={styles.modalOverlay} onClick={() => !busy && onCancel?.()} role="presentation" />

      <div className={`${styles.modal} ${styles.confirm}`}>
        <header className={styles.modalHead}>
          <h2 className={styles.modalTitle}>{title}</h2>
        </header>

        <div className={styles.modalBody}>
          {message && <p className={styles.confirmText}>{message}</p>}
          {details && <p className="hint">{details}</p>}
          <ErrorBox error={error} />
        </div>

        <footer className={styles.modalFoot}>
          <span className="spacer" />
          <button type="button" className="btn ghost sm" onClick={onCancel} disabled={busy} autoFocus>
            {cancelText}
          </button>
          <Button variant={tone === "danger" ? "danger" : ""} size="sm" busy={busy} busyText={busyText} onClick={onConfirm}>
            {confirmText}
          </Button>
        </footer>
      </div>
    </div>,
    document.body
  );
}
