import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TbChartAreaLine, TbSpeakerphone, TbTable } from "react-icons/tb";
import styles from "./parts.module.scss";
import { Card, Empty, ErrorBox, Loading, Table } from "../../components/ui";
import { TrendChart } from "../../components/charts";
import { num } from "../../utils/format";
import { Figure, RANGES, Segmented, ViewToggle, fullDay, withLabels } from "./parts";
import StatisticsService from "../../api/services/statisticsService";

/**
 * Majburiy kanallarga bot orqali qo'shilish va chiqish.
 *
 * FAQAT BOT ORQALI: hisob botning haqiqiy foydalanuvchilari bo'yicha
 * yuritiladi — botni ochmagan, kanalga chetdan kelgan odam bu grafikka
 * tushmaydi.
 *
 * "Hozirgi a'zolar" va kunlik qatorlar TENG EMAS: a'zolik holati boshidan
 * beri to'g'ri, kunlik hodisalar esa yozib borish yo'lga qo'yilgandan
 * keyingina to'plangan. Kartochka buni ochiq yozadi.
 */

const SERIES = [
  { key: "join", name: "Qo'shilgan", token: "--color-chart-join" },
  { key: "leave", name: "Chiqib ketgan", token: "--color-chart-leave" },
];

const ALL = "all";

export default function ChannelJoinsCard({ refreshKey = 0 }) {
  const [range, setRange] = useState("30");
  const [channel, setChannel] = useState(ALL);
  const [view, setView] = useState("chart");
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    setIsLoading(true);
    setError(null);
    try {
      const res = await StatisticsService.getChannelJoins(range);
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

  // useMemo ichida ishlatiladi — har renderda yangi massiv bo’lsa keshlash ma’nosiz
  const channels = useMemo(() => data?.channels || [], [data]);

  // Kanal tanlagichi: "Hammasi" + har kanal nomi. Bitta so'rovda hamma
  // kanal kelgani uchun almashtirish qayta yuklamaydi.
  const channelOptions = useMemo(
    () => [{ key: ALL, label: "Hammasi" }, ...channels.map((c) => ({ key: c.telegram_id, label: c.name }))],
    [channels]
  );

  const points = useMemo(() => {
    const raw = data?.points || [];
    const scoped = raw.map((p) =>
      channel === ALL ? { date: p.date, join: p.join, leave: p.leave } : { date: p.date, ...p.channels[channel] }
    );
    return withLabels(scoped);
  }, [data, channel]);

  const selected = channels.find((c) => c.telegram_id === channel);
  const scope = selected
    ? { members: selected.members, joined: selected.joined, left: selected.left }
    : {
        members: data?.totals?.memberships ?? 0,
        joined: data?.totals?.joined ?? 0,
        left: data?.totals?.left ?? 0,
      };

  const during = RANGES.find((r) => r.key === (data?.range?.key ?? range))?.during;

  const numCell = (val) => <span className={styles.num}>{num(val)}</span>;
  const rows = useMemo(() => [...points].reverse(), [points]);
  const columns = [
    { title: "Sana", key: "date", render: (val) => fullDay(val) },
    { title: "Qo'shilgan", key: "join", width: "120px", render: numCell },
    { title: "Chiqib ketgan", key: "leave", width: "130px", render: numCell },
  ];

  const firstLoad = isLoading && !data;
  const hasEvents = points.some((p) => p.join > 0 || p.leave > 0);

  return (
    <Card
      title="Majburiy kanallar"
      subtitle="Bot orqali qo'shilganlar va chiqib ketganlar · kunlar Toshkent vaqtida"
      icon={TbSpeakerphone}
      actions={
        <ViewToggle view={view} onChange={setView} chartIcon={TbChartAreaLine} tableIcon={TbTable} />
      }
    >
      <div className={styles.toolbar}>
        <Segmented label="Davr" options={RANGES} value={range} onChange={setRange} />
        {channelOptions.length > 2 && (
          <Segmented label="Kanal" options={channelOptions} value={channel} onChange={setChannel} />
        )}
      </div>

      {error && !data && <ErrorBox error={error} onRetry={load} />}
      {firstLoad && <Loading rows={4} />}

      {data && channels.length === 0 && (
        <Empty icon={TbSpeakerphone}>Bu botda majburiy kanal yo'q</Empty>
      )}

      {data && channels.length > 0 && (
        <div className={styles.body} data-refreshing={isLoading || undefined}>
          <div className={styles.figures}>
            <Figure
              label={selected ? "Hozirgi a'zolar" : "Jami a'zolik"}
              value={num(scope.members)}
              // Bu raqam bot orqali qo’shilganlarni EMAS, botga yozganlar ichidagi
              // hozirgi a’zolarni sanaydi: botni ochishdan oldin ham kanalda
              // bo’lganlar ham kiradi. Yozuv shuni aniq aytadi.
              sub={selected ? `${selected.name} · botga yozganlar ichida` : `botga yozganlar ichida · ${num(channels.length)} kanal`}
            />
            <Figure
              label="Qo'shilgan"
              value={num(scope.joined)}
              sub={during}
              swatch="--color-chart-join"
            />
            <Figure
              label="Chiqib ketgan"
              value={num(scope.left)}
              sub={during}
              swatch="--color-chart-leave"
            />
            <Figure
              label="Sof o'sish"
              value={num(scope.joined - scope.left)}
              sub={during}
            />
          </div>

          {!hasEvents ? (
            // Bo'sh grafik "buzuq" bo'lib ko'rinadi — sababi aytiladi
            <Empty icon={TbChartAreaLine}>
              {data.trackingSince
                ? `Bu davrda o'zgarish bo'lmagan. Hisob ${fullDay(data.trackingSince)} dan yuritilmoqda.`
                : "Qo'shilishlarni yozib borish endi yo'lga qo'yildi — birinchi o'zgarishdan keyin grafik to'la boshlaydi."}
            </Empty>
          ) : view === "chart" ? (
            <TrendChart data={points} series={SERIES} height={300} endLabels integer />
          ) : (
            <div className={styles.tableWrap}>
              <Table columns={columns} data={rows} empty="Bu davrda o'zgarish yo'q" />
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
