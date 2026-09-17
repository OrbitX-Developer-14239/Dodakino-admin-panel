import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import styles from "./index.module.scss";
import { compact } from "../../utils/format";

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
  "--color-chart-users",
  "--color-chart-users-active",
  "--color-chart-join",
  "--color-chart-leave",
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

  useEffect(() => {
    const update = () => setTokens(readTokens());
    window.addEventListener("themechange", update);
    return () => window.removeEventListener("themechange", update);
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
    // Seriya `token` bilan o'z rangini so'rashi mumkin (masalan o'sish grafigi)
    raw: tokens,
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
          <strong>{compact(entry.value)}</strong>
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
 * `series`: [{ key, name, token? }] — bir nechta chiziq bo'lishi mumkin.
 *   `token` berilsa rang o'sha CSS o'zgaruvchidan olinadi, aks holda
 *   umumiy palitradagi tartib bo'yicha.
 * `endLabels` — har chiziqning OXIRGI qiymati yoniga yoziladi. Faqat
 *   oxirgisi: har nuqtaga raqam yozilsa grafik o'qib bo'lmas holga keladi.
 * `integer` — Y o'qida faqat butun sonlar (odam soni 0.5 bo'lmaydi).
 *
 * Chiziq ostidagi to'ldirish gradient bilan so'nadi: hajm hissi
 * beradi, lekin ostidagi to'rni bosmaydi.
 */
export function TrendChart({
  data = [],
  series = [],
  xKey = "label",
  height = 260,
  endLabels = false,
  integer = false,
}) {
  const palette = usePalette();
  const narrow = useNarrow();
  const gradientId = `grad-${series.map((s) => s.key).join("-")}`;
  const colorFor = (s, i) => (s.token && palette.raw[s.token]) || palette.series[i % 6];
  const lastIndex = data.length - 1;

  /**
   * Oxirgi nuqta yorlig'i.
   *
   * Matn rangi — MATN tokeni, seriya rangi emas: yorliq rangi chiziqqa
   * tayansa, rang ko'rmaydigan odam uni o'qiy olmasdi.
   *
   * Joylashuv QIYMATGA qarab: eng katta qiymat nuqtadan yuqorida,
   * qolganlari pastda. Ilgari bu seriya tartibiga bog'langan edi —
   * ikkinchi seriya birinchisidan katta bo'lganda (masalan chiqib
   * ketganlar qo'shilganlardan ko'p) yuqoridagi nuqtaning yorlig'i
   * pastga, pastdagisiniki yuqoriga tushib, "16" va "6" ustma-ust
   * chiqardi. Qiymatlar teng bo'lsa bittasi yoziladi.
   */
  const lastValues = series.map((s) => data[lastIndex]?.[s.key]);
  const topIndex = lastValues.reduce(
    (best, v, i) => (v != null && (best === -1 || v > lastValues[best]) ? i : best),
    -1
  );

  const endLabel = (seriesIndex) => ({ x, y, value, index }) => {
    if (index !== lastIndex || value === undefined || value === null) return null;
    if (seriesIndex !== topIndex && lastValues[topIndex] === value) return null;
    return (
      <text
        x={x - 6}
        y={y}
        dy={seriesIndex === topIndex ? -10 : 18}
        textAnchor="end"
        fill={palette.text}
        fontSize={12}
        fontWeight={600}
      >
        {compact(value)}
      </text>
    );
  };

  return (
    <div className={styles.chart} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        {/* Yorliq yoqilganda tepada joy kerak: jami grafikda oxirgi nuqta
            eng baland bo’ladi va uning ustidagi raqam kesilib qolardi */}
        <AreaChart
          data={data}
          // Tor ekranda chap siljish kichikroq: -26 da Y o'qi raqamlari
          // kartochka chetidan tashqariga chiqib, butunlay ko'rinmay qolardi
          margin={{ top: endLabels ? 24 : 8, right: 8, left: narrow ? -10 : -18, bottom: 0 }}
        >
          <defs>
            {series.map((s, i) => (
              <linearGradient key={s.key} id={`${gradientId}-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colorFor(s, i)} stopOpacity={0.35} />
                <stop offset="100%" stopColor={colorFor(s, i)} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>

          <CartesianGrid stroke={palette.grid} vertical={false} />
          {/* minTickGap: 90 kunlik oraliqda har kunning yorlig'i yozilsa
              ular bir-birining ustiga chiqardi — recharts o'zi siyraklashtiradi */}
          <XAxis dataKey={xKey} stroke={palette.muted} minTickGap={18} {...AXIS} />
          <YAxis
            stroke={palette.muted}
            tickFormatter={compact}
            width={narrow ? 34 : 52}
            allowDecimals={!integer}
            {...AXIS}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: palette.border }} />

          {series.map((s, i) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.name}
              stroke={colorFor(s, i)}
              strokeWidth={2}
              fill={`url(#${gradientId}-${i})`}
              // Nuqta faqat sichqoncha ustiga kelganda — 96 ta nuqta
              // doim ko'rinib tursa chiziqning shakli yo'qoladi
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
              animationDuration={600}
            >
              {endLabels && <LabelList dataKey={s.key} content={endLabel(i)} />}
            </Area>
          ))}

          {series.length > 1 && (
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 12, color: palette.muted, paddingTop: 8 }}
              // Recharts yozuvni seriya rangiga bo'yaydi. Rang faqat doirachada
              // qoladi, matn esa oddiy matn rangida — aks holda to'q fonda
              // binafsha yozuv o'qilishi qiyin, rang ko'rmaydiganga esa befoyda
              formatter={(value) => <span style={{ color: palette.muted }}>{value}</span>}
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
export function RankChart({
  data = [],
  nameKey = "name",
  valueKey = "value",
  height = 260,
  sameColor = false,
  token = null,
}) {
  const palette = usePalette();
  const narrow = useNarrow();

  /**
   * `sameColor` — hamma ustun BITTA rangda.
   *
   * Ustunlar bitta o'lchovning qiymatlari bo'lsa (masalan bitta
   * filmning qismlari), har biriga boshqa rang berish rangni
   * bekorga sarflaydi: uzunlik allaqachon aytib turgan narsani
   * rang takrorlaydi. Qismlar 6 tadan oshsa ranglar aylanib,
   * 1- va 7-qism bir xil rangda chiqardi.
   *
   * Ranglar TURLI narsalarni bildirganda (turli kanallar, turli
   * botlar) eski tartib qoladi.
   */
  const barColor = (i) =>
    sameColor ? (token && palette.raw[token]) || palette.series[0] : palette.series[i % 6];

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
          {/* maxBarSize: ustun soni kam bo'lganda recharts butun bo'shliqni
              to'ldirib, qalin bloklar chizardi — ular ma'lumotdan ko'ra
              ko'proq bo'yoq bo'lib ko'rinadi */}
          <Bar dataKey={valueKey} radius={[0, 6, 6, 0]} maxBarSize={22} animationDuration={600}>
            {data.map((_, i) => (
              <Cell key={i} fill={barColor(i)} />
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
