import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { TbCheck, TbChevronDown } from "react-icons/tb";
import styles from "./Select.module.scss";
import { usePresence } from "../../hooks/usePresence";

const MENU_EXIT_MS = 120;
const GAP = 6;          // tugma va menyu orasi
const EDGE = 8;         // ekran chetidan eng kam masofa
const MAX_HEIGHT = 300; // menyuning eng katta balandligi

/**
 * Tanlagich — brauzerning `<select>` i o'rnida.
 *
 * NEGA O'ZIMIZNIKI: tizim `<select>` ining ochiladigan ro'yxati har
 * brauzer/OS da o'zicha chiziladi — panel dizayni (ranglar, radius,
 * tungi mavzu) unga umuman tegmaydi va ochilish animatsiyasi yo'q.
 *
 * TUZILISH:
 *  - Menyu `document.body` ga portal qilinadi va `position: fixed` bilan
 *    tugma ostiga joylanadi. Kartochkalardagi `overflow: hidden` uni
 *    kesmaydi, sahifa o'tish animatsiyasidagi `transform` esa fixed
 *    joylashuvni buzmaydi.
 *  - Pastda joy yetmasa menyu tugmaning ustiga ochiladi.
 *  - Yopilish ham animatsiyali (usePresence) — menyu "yo'qolib" qolmaydi.
 *
 * KLAVIATURA (WAI-ARIA listbox): ↓/↑/Enter/Space ochadi; ochiq holda
 * ↓/↑/Home/End yuradi, Enter tanlaydi, Esc yopadi, Tab yopib keyingi
 * elementga o'tadi, harf bosilsa shu harf bilan boshlanuvchiga sakraydi.
 *
 * @param {Array<{value:string,label:React.ReactNode,disabled?:boolean}>} options
 */
export function Select({
  value,
  onChange,
  options = [],
  placeholder = "Tanlang",
  ariaLabel,
  title,
  className = "",
  size = "",
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [pos, setPos] = useState(null);

  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const typed = useRef({ text: "", at: 0 });
  const listId = useId();

  const { mounted, leaving } = usePresence(open, { exitMs: MENU_EXIT_MS });

  const selectedIndex = options.findIndex((o) => String(o.value) === String(value));
  const selected = options[selectedIndex];

  const enabledIndex = useCallback(
    (from, step) => {
      for (let i = from, n = 0; n < options.length; i += step, n++) {
        const idx = (i + options.length) % options.length;
        if (!options[idx]?.disabled) return idx;
      }
      return -1;
    },
    [options]
  );

  const openMenu = useCallback(() => {
    if (disabled || !options.length) return;
    setActive(selectedIndex >= 0 ? selectedIndex : enabledIndex(0, 1));
    setOpen(true);
  }, [disabled, options.length, selectedIndex, enabledIndex]);

  const close = useCallback((focusTrigger = false) => {
    setOpen(false);
    if (focusTrigger) triggerRef.current?.focus();
  }, []);

  const choose = useCallback(
    (idx) => {
      const opt = options[idx];
      if (!opt || opt.disabled) return;
      if (String(opt.value) !== String(value)) onChange?.(opt.value);
      close(true);
    },
    [options, value, onChange, close]
  );

  // ── Joylashuv: tugma ostida, joy bo'lmasa ustida ──
  const place = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const below = window.innerHeight - r.bottom - GAP - EDGE;
    const above = r.top - GAP - EDGE;
    const up = below < Math.min(MAX_HEIGHT, 180) && above > below;
    const width = Math.max(r.width, 160);
    const left = Math.min(Math.max(EDGE, r.left), window.innerWidth - width - EDGE);
    setPos({
      left,
      width,
      up,
      top: up ? undefined : r.bottom + GAP,
      bottom: up ? window.innerHeight - r.top + GAP : undefined,
      maxHeight: Math.max(120, Math.min(MAX_HEIGHT, up ? above : below)),
    });
  }, []);

  useLayoutEffect(() => {
    if (!mounted) return undefined;
    place();
    // capture: ichki aylantiriladigan konteynerlar (kartochka, jadval) ham
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [mounted, place]);

  // ── Tashqariga bosilsa yopiladi ──
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (triggerRef.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
      close(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open, close]);

  // ── Faol variant ko'rinib tursin ──
  useEffect(() => {
    if (!open || active < 0) return;
    menuRef.current
      ?.querySelector(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const onKeyDown = (e) => {
    if (disabled) return;

    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        openMenu();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActive((i) => enabledIndex(i + 1, 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActive((i) => enabledIndex(i - 1, -1));
        break;
      case "Home":
        e.preventDefault();
        setActive(enabledIndex(0, 1));
        break;
      case "End":
        e.preventDefault();
        setActive(enabledIndex(options.length - 1, -1));
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        choose(active);
        break;
      case "Escape":
        e.preventDefault();
        close(true);
        break;
      case "Tab":
        close(false);
        break;
      default:
        // Harf bilan qidirish: tez-tez yozilgan harflar birlashadi
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          const now = Date.now();
          const t = typed.current;
          t.text = (now - t.at < 600 ? t.text : "") + e.key.toLowerCase();
          t.at = now;
          const idx = options.findIndex(
            (o) => !o.disabled && textOf(o.label).toLowerCase().replace(/^@/, "").startsWith(t.text)
          );
          if (idx >= 0) setActive(idx);
        }
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`${styles.trigger} ${size ? styles[size] : ""} ${className}`}
        data-open={open || undefined}
        onClick={() => (open ? close(false) : openMenu())}
        onKeyDown={onKeyDown}
        disabled={disabled}
        title={title}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
      >
        <span className={`${styles.value} ${selected ? "" : styles.placeholder}`}>
          {selected ? selected.label : placeholder}
        </span>
        <TbChevronDown size={15} className={styles.chevron} aria-hidden="true" />
      </button>

      {mounted && pos &&
        createPortal(
          <ul
            ref={menuRef}
            id={listId}
            role="listbox"
            aria-label={ariaLabel}
            className={styles.menu}
            data-up={pos.up || undefined}
            data-leaving={leaving || undefined}
            style={{
              left: pos.left,
              minWidth: pos.width,
              top: pos.top,
              bottom: pos.bottom,
              maxHeight: pos.maxHeight,
            }}
            // Tugmadan fokus ketmasin — klaviatura boshqaruvi o'sha yerda
            onMouseDown={(e) => e.preventDefault()}
          >
            {options.map((o, i) => {
              const isSelected = i === selectedIndex;
              return (
                <li
                  key={String(o.value)}
                  id={`${listId}-${i}`}
                  role="option"
                  data-index={i}
                  aria-selected={isSelected}
                  aria-disabled={o.disabled || undefined}
                  className={styles.option}
                  data-active={i === active || undefined}
                  onMouseEnter={() => !o.disabled && setActive(i)}
                  onClick={() => choose(i)}
                >
                  <span className={styles.optionLabel}>{o.label}</span>
                  {isSelected && <TbCheck size={15} className={styles.check} aria-hidden="true" />}
                </li>
              );
            })}
          </ul>,
          document.body
        )}
    </>
  );
}

/** Belgi matni — harf bilan qidirish uchun (label JSX bo'lishi ham mumkin) */
function textOf(node) {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  return textOf(node.props?.children);
}
