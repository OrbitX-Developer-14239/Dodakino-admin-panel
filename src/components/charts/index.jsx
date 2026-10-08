import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import styles from "./index.module.scss";
import { compact, num } from "../../utils/format";

/**
 * Diagrammalar.
 *
 * NEGA RANGLAR CSS'DAN O'QILADI: recharts ranglarni JS qiymati
 * sifatida talab qiladi — `var(--color-chart-1)` ni tushunmaydi.
 * Agar hex to'g'ridan-to'g'ri yozilsa, mavzu almashganda diagramma
 * eski rangda qolib, butun sahifadan ajralib turardi. Shuning uchun
 * tokenlar `getComputedStyle` bilan o'qiladi va mavzu o'zgarganda
 * ("themechange" hodisasi) qaytadan olinadi.
 */
const TOKENS = [
  "--color-chart-1",
  "--color-chart-2",
  "--color-chart-3",
  "--color-chart-4",
  "--color-chart-5",
  "--color-chart-6",
  "--color-chart-grid",
  "--color-text-muted",
  "--color-bg-surface",
  "--color-border-primary",
  "--color-text-primary",
];

const readTokens = () => {
  const cs = getComputedStyle(document.documentElement);
  return TOKENS.reduce((acc, name) => {
    acc[name] = cs.getPropertyValue(name).trim();
    return acc;
  }, {});
};

function usePalette() {
  const [tokens, setTokens] = useState(readTokens);

  /**
   * Ranglar <html> klassi HAQIQATAN almashganda o'qiladi.
   *
   * "themechange" hodisasiga tayanib bo'lmaydi: ThemeManager mavzuni
   * View Transition ichida qo'llaydi — klass keyingi kadrda almashadi,
   * hodisa esa undan OLDIN, darhol yuboriladi. O'sha paytda o'qilgan
   * tokenlar hali ESKI mavzuniki bo'lardi: yorug'ga o'tganda chiziqlar
   * tungi (yorqin) rangda qolar, orqaga qaytganda esa aksincha — hover
   * nuqtalari ham. MutationObserver klass o'zgargan aniq paytni beradi.
   */
  useEffect(() => {
    // Klassni NProgress ham o'zgartiradi ("nprogress-busy") — ranglar
    // o'zgarmagan bo'lsa eski obyekt qaytadi va grafik qayta chizilmaydi
    const update = () =>
      setTokens((prev) => {
        const next = readTokens();
        return TOKENS.every((t) => prev[t] === next[t]) ? prev : next;
      });
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return {
    series: [
      tokens["--color-chart-1"],
      tokens["--color-chart-2"],
      tokens["--color-chart-3"],
      tokens["--color-chart-4"],
      tokens["--color-chart-5"],
      tokens["--color-chart-6"],
    ],
    grid: tokens["--color-chart-grid"],
    muted: tokens["--color-text-muted"],
    surface: tokens["--color-bg-surface"],
    border: tokens["--color-border-primary"],
    text: tokens["--color-text-primary"],
  };
}

/** Umumiy tooltip — uchala diagramma uchun bir xil ko'rinish. */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className={styles.tooltip}>
      {label !== undefined && <p className={styles.tooltipLabel}>{label}</p>}
      {payload.map((entry) => (
        <p key={entry.dataKey || entry.name} className={styles.tooltipRow}>
          <span className={styles.tooltipDot} style={{ background: entry.color }} />
          {entry.name}
          <strong>{num(entry.value)}</strong>
        </p>
      ))}
    </div>
  );
}

const AXIS = { fontSize: 11, tickLine: false, axisLine: false };

/**
 * Ekran tor ekanini kuzatadi.
 *
 * Recharts o'lchamlarni JS qiymati sifatida oladi — media query unga
 * yetib bormaydi. 132px lik nom ustuni 250px li ekranda diagramma
 * uchun 40px joy qoldirardi: ustunlar chiziqqa aylanib, grafik
 * ma'nosini yo'qotardi.
 */
function useNarrow(maxWidth = 480) {
  const query = `(max-width: ${maxWidth}px)`;
  const [narrow, setNarrow] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = (e) => setNarrow(e.matches);
    mq.addEventListener("change", onChange);
    setNarrow(mq.matches);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);

  return narrow;
}

/**
 * TrendChart — vaqt bo'yicha o'zgarish.
 *
 * `series`: [{ key, name }] — bir nechta chiziq bo'lishi mumkin.
 * Chiziq ostidagi to'ldirish gradient bilan so'nadi: hajm hissi
 * beradi, lekin ostidagi to'rni bosmaydi.
 */
export function TrendChart({
  data = [],
  series = [],
  xKey = "label",
  height = 260,
  autoDomain = false,
  domain,
  yTickFormatter,
}) {
  const palette = usePalette();
  const narrow = useNarrow();
  const gradientId = `grad-${series.map((s) => s.key).join("-")}`;

  const { yDomain, computedDelta } = useMemo(() => {
    if (domain) return { yDomain: domain, computedDelta: 0 };
    if (!autoDomain) return { yDomain: [0, "auto"], computedDelta: 0 };

    const values = [];
    data.forEach((d) => {
      series.forEach((s) => {
        const v = Number(d[s.key]);
        if (!Number.isNaN(v)) values.push(v);
      });
    });
    if (!values.length) return { yDomain: [0, "auto"], computedDelta: 0 };

    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const delta = maxVal - minVal;

    // 100 ta obunachi o'zgarishi ham grafikda sezilarli ko'rinishi uchun
    // paddingni moslashtiramiz (delta juda kichik bo'lsa 30-50, aks holda 20%)
    const padding = Math.max(30, Math.round(delta * 0.2 || 100));
    const step = delta > 2000 ? 500 : delta > 300 ? 50 : 20;

    let lower = Math.floor((minVal - padding) / step) * step;
    if (minVal >= 0 && lower < 0) {
      lower = 0;
    }
    const upper = Math.ceil((maxVal + padding) / step) * step;

    return { yDomain: [lower, upper], computedDelta: delta };
  }, [autoDomain, domain, data, series]);

  const defaultYTickFormatter = (v) => {
    if (yTickFormatter) return yTickFormatter(v);
    if (autoDomain && computedDelta <= 3000) {
      return num(v);
    }
    return compact(v);
  };

  return (
    <div className={styles.chart} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 12, left: narrow ? 0 : 4, bottom: 0 }}>
          <defs>
            {series.map((s, i) => (
              <linearGradient key={s.key} id={`${gradientId}-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={palette.series[i % 6]} stopOpacity={0.35} />
                <stop offset="100%" stopColor={palette.series[i % 6]} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>

          <CartesianGrid stroke={palette.grid} vertical={false} />
          <XAxis dataKey={xKey} stroke={palette.muted} {...AXIS} />
          <YAxis
            stroke={palette.muted}
            domain={yDomain}
            tickFormatter={defaultYTickFormatter}
            width={autoDomain ? (narrow ? 54 : 68) : (narrow ? 42 : 56)}
            {...AXIS}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: palette.border }} />

          {series.map((s, i) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.name}
              stroke={palette.series[i % 6]}
              strokeWidth={2}
              fill={`url(#${gradientId}-${i})`}
              // Nuqta faqat sichqoncha ustiga kelganda — 96 ta nuqta
              // doim ko'rinib tursa chiziqning shakli yo'qoladi
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
              animationDuration={600}
            />
          ))}

          {series.length > 1 && (
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 12, color: palette.muted, paddingTop: 8 }}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * RankChart — reyting (eng ko'p yozgan chatlar, provayderlar…).
 *
 * Gorizontal, chunki nomlar uzun bo'ladi: vertikal ustunda ular
 * qiyshaytirib yoziladi va o'qib bo'lmaydi.
 */
export function RankChart({ data = [], nameKey = "name", valueKey = "value", height = 260 }) {
  const palette = usePalette();
  const narrow = useNarrow();

  return (
    <div className={styles.chart} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
          <CartesianGrid stroke={palette.grid} horizontal={false} />
          <XAxis type="number" stroke={palette.muted} tickFormatter={compact} {...AXIS} />
          <YAxis
            type="category"
            dataKey={nameKey}
            stroke={palette.muted}
            width={narrow ? 76 : 132}
            {...AXIS}
            // Uzun nomni kesamiz: to'liq nomi tooltipda ko'rinadi
            tickFormatter={(v) => {
              const max = narrow ? 9 : 18;
              return String(v).length > max ? `${String(v).slice(0, max - 1)}…` : v;
            }}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: palette.grid, fillOpacity: 0.4 }} />
          <Bar dataKey={valueKey} radius={[0, 6, 6, 0]} animationDuration={600}>
            {data.map((_, i) => (
              <Cell key={i} fill={palette.series[i % 6]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * DonutChart — butunning tarkibi.
 *
 * O'rtasidagi bo'shliqqa umumiy son yoziladi (`center`): aks holda
 * foydalanuvchi bo'laklarni ko'zi bilan qo'shishga urinadi.
 */
export function DonutChart({ data = [], height = 240, center }) {
  const palette = usePalette();
  const narrow = useNarrow();

  return (
    <div className={styles.donut} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={narrow ? "50%" : "58%"}
            outerRadius={narrow ? "74%" : "86%"}
            paddingAngle={2}
            stroke="none"
            animationDuration={600}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={palette.series[i % 6]} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, color: palette.muted }}
          />
        </PieChart>
      </ResponsiveContainer>

      {center && <div className={styles.donutCenter}>{center}</div>}
    </div>
  );
}
