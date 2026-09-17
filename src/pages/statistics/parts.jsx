import styles from "./parts.module.scss";

/**
 * Statistika sahifasidagi uchala kartochka uchun umumiy qismlar.
 *
 * Bitta joyda turadi, chunki filtr tugmalari va raqamlar qatori uchala
 * kartochkada ham bir xil ko'rinishda bo'lishi kerak: ular bir sahifada
 * yonma-yon turadi va ozgina farq ham "boshqa element" bo'lib ko'rinadi.
 */

/** Davr filtri — uchala grafikda bir xil variantlar */
export const RANGES = [
  { key: "7", label: "7 kun", during: "7 kunda" },
  { key: "30", label: "30 kun", during: "30 kunda" },
  { key: "90", label: "90 kun", during: "90 kunda" },
  { key: "all", label: "Hammasi", during: "butun davrda" },
];

// Brauzerning "uz-UZ" lokali hamma joyda bir xil emas — ba'zilarida oy
// "M09" bo'lib chiqadi. O'qda qisqa va barqaror yozuv kerak.
const MONTHS = ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avg", "sen", "okt", "noy", "dek"];

/** "2026-09-15" -> "15 sen" */
export const dayLabel = (iso) => {
  const [, m, d] = iso.split("-");
  return `${Number(d)} ${MONTHS[Number(m) - 1]}`;
};

/** "2026-09-15" -> "15 sen 2026" (jadval uchun — yil ham kerak) */
export const fullDay = (iso) => `${dayLabel(iso)} ${iso.slice(0, 4)}`;

/** Nuqtalarga o'q yorlig'ini qo'shadi */
export const withLabels = (points = []) => points.map((p) => ({ ...p, label: dayLabel(p.date) }));

export function Segmented({ label, options, value, onChange }) {
  return (
    <div className={styles.segmented} role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          className={styles.segment}
          aria-pressed={value === o.key}
          onClick={() => onChange(o.key)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Figure({ label, value, sub, swatch }) {
  return (
    <div className={styles.figure}>
      <p className={styles.figureLabel}>
        {swatch && <span className={styles.swatch} style={{ background: `var(${swatch})` }} />}
        {label}
      </p>
      <p className={styles.figureValue}>{value}</p>
      {sub && <p className={styles.figureSub}>{sub}</p>}
    </div>
  );
}

/**
 * Grafik/jadval almashtirgich.
 *
 * Har grafikning jadval egizagi bo'lishi shart: rangni farqlamaydigan
 * yoki ekran o'qiyotgan odam uchun qiymatlar shu yerdan olinadi.
 */
export function ViewToggle({ view, onChange, chartIcon: ChartIcon, tableIcon: TableIcon }) {
  const toChart = view === "table";
  return (
    <button
      type="button"
      className="btn ghost sm"
      onClick={() => onChange(toChart ? "chart" : "table")}
      aria-label={toChart ? "Grafik ko'rinishi" : "Jadval ko'rinishi"}
    >
      {toChart ? <ChartIcon size={14} /> : <TableIcon size={14} />}
      {toChart ? "Grafik" : "Jadval"}
    </button>
  );
}

export { styles as partStyles };
