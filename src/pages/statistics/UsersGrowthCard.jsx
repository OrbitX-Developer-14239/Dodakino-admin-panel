import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TbChartAreaLine, TbTable, TbUsers } from "react-icons/tb";
import styles from "./parts.module.scss";
import { Card, Empty, ErrorBox, Loading, Table } from "../../components/ui";
import { TrendChart } from "../../components/charts";
import { num } from "../../utils/format";
import { Figure, RANGES, Segmented, ViewToggle, fullDay, withLabels } from "./parts";
import StatisticsService from "../../api/services/statisticsService";

/**
 * Foydalanuvchilar o'sishi.
 *
 * NIMA CHIZILADI: faqat botga O'ZI yozgan foydalanuvchilar va ulardan
 * hozir ham botni bloklamaganlari. Ikkala chiziq bir masshtabda, shuning
 * uchun bitta o'qda yonma-yon o'qiladi.
 *
 * Majburiy kanal orqali bazaga tushib qolgan eski yozuvlar (botni hech
 * qachon ochmagan 56 mingdan ortiq odam) bu yerda UMUMAN ko'rsatilmaydi —
 * bazada saqlanib turadi, lekin admin panelda faqat botning haqiqiy
 * foydalanuvchilari sanaladi.
 */

const MODES = [
  { key: "total", label: "Jami" },
  { key: "daily", label: "Kunlik" },
];

const SERIES = {
  total: [
    { key: "totalStarted", name: "Botga yozganlar", token: "--color-chart-users" },
    { key: "totalActive", name: "Hozir ham faol", token: "--color-chart-users-active" },
  ],
  daily: [
    { key: "newStarted", name: "Yangi foydalanuvchilar", token: "--color-chart-users" },
    { key: "newActive", name: "Ulardan hozir faol", token: "--color-chart-users-active" },
  ],
};

export default function UsersGrowthCard({ refreshKey = 0 }) {
  const [range, setRange] = useState("30");
  const [mode, setMode] = useState("total");
  const [view, setView] = useState("chart");
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Oraliq tez-tez almashtirilsa eski (sekin) javob yangisini bosib
  // ketmasligi uchun faqat oxirgi so'rov natijasi qabul qilinadi
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setIsLoading(true);
    setError(null);
    try {
      const res = await StatisticsService.getUsersGrowth(range);
      if (id === requestId.current) setData(res?.data || null);
    } catch (err) {
      if (id === requestId.current) setError(err);
    } finally {
      if (id === requestId.current) setIsLoading(false);
    }
  }, [range]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const points = useMemo(() => withLabels(data?.points), [data]);
  const totals = data?.totals;

  // Izoh TANLANGAN tugmadan emas, KELGAN ma'lumotdan olinadi: tugma bosilgan
  // zahoti yangi davr nomi chiqib, raqam esa hali eskisi bo'lib turardi
  // ("+14 · butun davrda" — aslida 30 kunlik son)
  const during = RANGES.find((r) => r.key === (data?.range?.key ?? range))?.during;
  const gained = points.reduce((sum, p) => sum + p.newStarted, 0);
  const activeShare = totals?.started ? Math.round((totals.active / totals.started) * 100) : 0;

  // Jadvalda eng yangi kun tepada — odatda aynan shu qidiriladi
  const rows = useMemo(() => [...points].reverse(), [points]);
  const numCell = (val) => <span className={styles.num}>{num(val)}</span>;
  const columns = [
    { title: "Sana", key: "date", render: (val) => fullDay(val) },
    { title: "Yangi", key: "newStarted", width: "90px", render: numCell },
    { title: "Ulardan faol", key: "newActive", width: "110px", render: numCell },
    { title: "Jami", key: "totalStarted", width: "90px", render: numCell },
    { title: "Hozir faol", key: "totalActive", width: "110px", render: numCell },
  ];

  const firstLoad = isLoading && !data;

  return (
    <Card
      title="Foydalanuvchilar o'sishi"
      subtitle="Faqat botga o'zi yozganlar sanaladi · kunlar Toshkent vaqtida"
      icon={TbUsers}
      actions={
        <ViewToggle view={view} onChange={setView} chartIcon={TbChartAreaLine} tableIcon={TbTable} />
      }
    >
      {/* Filtrlar bitta qatorda, grafikdan TEPADA — ular grafik ham,
          jadval ham, raqamlar ham uchun baravar ishlaydi */}
      <div className={styles.toolbar}>
        <Segmented label="Davr" options={RANGES} value={range} onChange={setRange} />
        <Segmented label="Ko'rsatkich" options={MODES} value={mode} onChange={setMode} />
      </div>

      {error && !data && <ErrorBox error={error} onRetry={load} />}
      {firstLoad && <Loading rows={4} />}

      {totals && (
        // Qayta yuklanayotganda eski holat xiralashib turadi — sakrash yoki
        // bo'sh ramka o'rniga ma'lumot almashayotgani ko'rinadi
        <div className={styles.body} data-refreshing={isLoading || undefined}>
          <div className={styles.figures}>
            <Figure
              label="Botga yozganlar"
              value={num(totals.started)}
              sub="boshidan beri"
              swatch="--color-chart-users"
            />
            <Figure
              label="Hozir ham faol"
              value={num(totals.active)}
              sub={`${activeShare}% bloklamagan`}
              swatch="--color-chart-users-active"
            />
            <Figure label="Bloklagan" value={num(totals.blocked)} sub="botni to'xtatgan" />
            <Figure
              label="Yangi foydalanuvchilar"
              value={gained ? `+${num(gained)}` : "0"}
              sub={during}
            />
          </div>

          {totals.started === 0 ? (
            <Empty icon={TbUsers}>Hali botga yozgan foydalanuvchi yo'q</Empty>
          ) : view === "chart" ? (
            <TrendChart data={points} series={SERIES[mode]} height={300} endLabels integer />
          ) : (
            <div className={styles.tableWrap}>
              <Table columns={columns} data={rows} empty="Bu davrda ma'lumot yo'q" />
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
