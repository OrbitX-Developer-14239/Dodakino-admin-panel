import { useCallback, useEffect, useRef, useState } from "react";
import { TbChartLine, TbEye, TbRefresh, TbSpeakerphone } from "react-icons/tb";
import styles from "./index.module.scss";
import client from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import { RankChart, TrendChart } from "../../components/charts";
import {
  Button,
  Card,
  Empty,
  ErrorBox,
  Loading,
  PageHead,
  Segmented,
  Select,
  Stat,
} from "../../components/ui";
import { dayLabel, fullDay, num } from "../../utils/format";

/** Davr filtri — uchala kartochkada bir xil variantlar */
const RANGES = [
  { value: "7", label: "7 kun", during: "7 kunda" },
  { value: "30", label: "30 kun", during: "30 kunda" },
  { value: "90", label: "90 kun", during: "90 kunda" },
  { value: "all", label: "Hammasi", during: "butun davrda" },
];
const during = (range) => RANGES.find((r) => r.value === range)?.during || "";

/**
 * Bitta kartochkaning ma'lumotini yuklaydi.
 *
 * Filtr tez almashtirilsa eskirgan javob yangisining ustiga yozilmasin —
 * shuning uchun har so'rovning tartib raqami bor. `reloadKey` sahifadagi
 * "Yangilash" tugmasidan keladi: uchala kartochka birga yangilanadi.
 */
function useCardData(url, params, reloadKey, enabled = true) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const requestId = useRef(0);
  const key = JSON.stringify(params);

  const load = useCallback(async () => {
    if (!enabled) return;
    const id = ++requestId.current;
    setBusy(true);
    try {
      const res = await client.get(url, { params: JSON.parse(key) });
      if (id !== requestId.current) return;
      setData(res?.data ?? null);
      setError(null);
    } catch (e) {
      if (id === requestId.current) setError(e);
    } finally {
      if (id === requestId.current) setBusy(false);
    }
  }, [url, key, enabled]);

  useEffect(() => {
    load();
  }, [load, reloadKey]);

  return { data, error, busy, load };
}

export default function Statistics() {
  const [reloadKey, setReloadKey] = useState(0);

  /**
   * "Yangilash" uchala kartochkani qayta so'raydi. Tugma HAMMASI
   * tugaguncha aylanib turadi — kartochkalar o'z holatini shu yerga
   * xabar qiladi. Kartochka ichida filtr almashtirilganda esa tugma
   * aylanmaydi: u faqat o'zi bosilgandagi ishni ko'rsatadi.
   */
  const [refreshing, setRefreshing] = useState(false);
  const [busyCards, setBusyCards] = useState({});
  const reportBusy = useCallback(
    (name, busy) => setBusyCards((s) => (s[name] === busy ? s : { ...s, [name]: busy })),
    []
  );
  const anyBusy = Object.values(busyCards).some(Boolean);

  // Bosilgan zahoti kartochkalar hali "band" deb xabar bermagan bo'ladi —
  // tugma darhol o'chib qolmasligi uchun avval ular band bo'lganini
  // ko'rishimiz kerak, keyin bo'shaganini.
  const sawBusy = useRef(false);
  useEffect(() => {
    if (!refreshing) return;
    if (anyBusy) sawBusy.current = true;
    else if (sawBusy.current) {
      sawBusy.current = false;
      setRefreshing(false);
    }
  }, [refreshing, anyBusy]);

  return (
    <>
      <PageHead>
        <span className="hint">Kunlar Toshkent vaqti boʻyicha hisoblanadi</span>
        <Button
          variant="ghost"
          size="sm"
          icon={TbRefresh}
          busy={refreshing}
          busyText="Yangilanmoqda…"
          onClick={() => {
            setRefreshing(true);
            setReloadKey((k) => k + 1);
          }}
        >
          Yangilash
        </Button>
      </PageHead>

      <UsersGrowth reloadKey={reloadKey} onBusy={reportBusy} />
      <FilmViews reloadKey={reloadKey} onBusy={reportBusy} />
      <ChannelJoins reloadKey={reloadKey} onBusy={reportBusy} />
    </>
  );
}

/* ── Foydalanuvchilar o'sishi ─────────────────────────────── */
function UsersGrowth({ reloadKey, onBusy }) {
  const [range, setRange] = useState("30");
  const [mode, setMode] = useState("total");
  const { data, error, busy, load } = useCardData(ENDPOINTS.STATISTICS.USERS_GROWTH, { range }, reloadKey);
  useEffect(() => onBusy?.("growth", busy), [busy, onBusy]);

  const points = data?.points || [];
  const newStarted = points.reduce((s, p) => s + (p.newStarted || 0), 0);
  const chart = points.map((p) => ({ label: dayLabel(p.date), ...p }));

  return (
    <Card title="Foydalanuvchilar oʻsishi" icon={TbChartLine}>
      <div className={styles.toolbar}>
        <Segmented label="Davr" options={RANGES} value={range} onChange={setRange} />
        <Segmented
          label="Koʻrinish"
          options={[
            { value: "total", label: "Jami" },
            { value: "daily", label: "Kunlik" },
          ]}
          value={mode}
          onChange={setMode}
        />
      </div>

      <ErrorBox error={error} onRetry={load} />
      {!data && !error && <Loading rows={4} />}

      {data && (
        <div className={styles.body} data-busy={busy || undefined}>
          <div className="grid c4">
            <Stat label="Jami" value={num(data.totals?.started)} sub="botga yozganlar" />
            <Stat label="Faol" value={num(data.totals?.active)} sub="botni bloklamagan" tone="ok" />
            <Stat label="Bloklagan" value={num(data.totals?.blocked)} sub="bot yoza olmaydi" tone="danger" />
            <Stat label="Yangi" value={`+${num(newStarted)}`} sub={during(range)} tone="info" />
          </div>

          {points.length ? (
            <TrendChart
              data={chart}
              height={280}
              series={
                mode === "total"
                  ? [
                      { key: "totalStarted", name: "Jami" },
                      { key: "totalActive", name: "Faol" },
                    ]
                  : [
                      { key: "newStarted", name: "Yangi" },
                      { key: "newActive", name: "Faol qolgan" },
                    ]
              }
            />
          ) : (
            <Empty>Bu davrda maʼlumot yoʻq</Empty>
          )}
        </div>
      )}
    </Card>
  );
}

/* ── Film ko'rishlari ─────────────────────────────────────── */
function FilmViews({ reloadKey, onBusy }) {
  const [films, setFilms] = useState(null);
  const [code, setCode] = useState("");
  const [range, setRange] = useState("30");

  // Tanlagich uchun filmlar (ko'rishlar bo'yicha saralangan) — bir marta
  useEffect(() => {
    client
      .get(ENDPOINTS.STATISTICS.FILMS)
      .then((res) => {
        const list = Array.isArray(res?.data) ? res.data : [];
        setFilms(list);
        setCode((c) => c || (list[0] ? String(list[0].code) : ""));
      })
      .catch(() => setFilms([]));
  }, [reloadKey]);

  const { data, error, busy, load } = useCardData(
    ENDPOINTS.STATISTICS.FILM_VIEWS,
    { code, range },
    reloadKey,
    Boolean(code)
  );
  useEffect(() => onBusy?.("films", busy), [busy, onBusy]);

  const points = data?.points || [];
  const chart = points.map((p) => ({ label: dayLabel(p.date), ...p }));
  // Faqat ko'rilgan qismlar, eng ko'pi 12 ta — 65 qatorlik ustun o'qilmaydi
  const episodes = (data?.byEpisode || [])
    .filter((e) => e.views > 0)
    .sort((a, b) => b.views - a.views)
    .slice(0, 12)
    .map((e) => ({ name: `${e.season > 1 ? `${e.season}-f ` : ""}${e.episodeNumber}-qism`, value: e.views }));

  const filmOptions = (films || []).map((f) => ({
    value: String(f.code),
    label: `${f.name} · ${f.code}`,
  }));

  return (
    <Card title="Film koʻrishlari" icon={TbEye}>
      <div className={styles.toolbar}>
        {filmOptions.length > 0 && (
          <Select
            className={styles.filmSelect}
            size="sm"
            ariaLabel="Film"
            options={filmOptions}
            value={code}
            onChange={setCode}
          />
        )}
        <Segmented label="Davr" options={RANGES} value={range} onChange={setRange} />
      </div>

      {films && !films.length && <Empty>Hali film yoʻq</Empty>}
      <ErrorBox error={error} onRetry={load} />
      {code && !data && !error && <Loading rows={4} />}

      {data && (
        <div className={styles.body} data-busy={busy || undefined}>
          <div className="grid c3">
            <Stat label="Boshidan beri" value={num(data.totals?.allTime)} sub="film sahifasi ochilgan" />
            <Stat label={`Shu davrda`} value={num(data.totals?.inRange)} sub={during(range)} tone="info" />
            <Stat
              label="Qismlar"
              value={num(data.totals?.episodesAllTime)}
              sub={`${num(data.film?.episodesCount)} ta qism koʻrilgan`}
              tone="ok"
            />
          </div>

          {points.some((p) => p.total > 0) ? (
            <TrendChart
              data={chart}
              height={260}
              series={[
                { key: "filmViews", name: "Film" },
                { key: "episodeViews", name: "Qismlar" },
              ]}
            />
          ) : (
            <Empty>
              Bu davrda koʻrish qayd etilmagan
              {data.trackingSince ? ` · kunlik hisob ${fullDay(data.trackingSince)} dan` : ""}
            </Empty>
          )}

          {episodes.length > 1 && (
            <>
              <p className={styles.subhead}>Eng koʻp koʻrilgan qismlar</p>
              <RankChart data={episodes} height={Math.max(160, episodes.length * 30)} />
            </>
          )}
        </div>
      )}
    </Card>
  );
}

/* ── Majburiy kanallar ────────────────────────────────────── */
function ChannelJoins({ reloadKey, onBusy }) {
  const [range, setRange] = useState("30");
  const [channel, setChannel] = useState("");
  const { data, error, busy, load } = useCardData(ENDPOINTS.STATISTICS.CHANNEL_JOINS, { range }, reloadKey);
  useEffect(() => onBusy?.("channels", busy), [busy, onBusy]);

  const channels = data?.channels || [];

  useEffect(() => {
    if (channels.length > 0 && (!channel || !channels.some((c) => String(c.telegram_id) === channel))) {
      setChannel(String(channels[0].telegram_id));
    }
  }, [channels, channel]);

  const activeChannel = channel || (channels[0] ? String(channels[0].telegram_id) : "");
  const selected = channels.find((c) => String(c.telegram_id) === activeChannel) || channels[0];

  const chart = (data?.points || []).map((p) => {
    const row = selected ? p.channels?.[selected.telegram_id] || { join: 0, leave: 0 } : p;
    return { label: dayLabel(p.date), join: row.join, leave: row.leave };
  });
  const joined = selected ? selected.joined : 0;
  const left = selected ? selected.left : 0;
  const members = selected ? selected.members : 0;

  const channelOptions = channels.map((c) => ({ value: String(c.telegram_id), label: c.name }));

  return (
    <Card title="Majburiy kanallar" icon={TbSpeakerphone}>
      <div className={styles.toolbar}>
        <Segmented label="Davr" options={RANGES} value={range} onChange={setRange} />
        {channels.length > 1 && (
          <Segmented label="Kanal" options={channelOptions} value={activeChannel} onChange={setChannel} />
        )}
      </div>

      <ErrorBox error={error} onRetry={load} />
      {!data && !error && <Loading rows={4} />}

      {data && !channels.length && <Empty icon={TbSpeakerphone}>Bu botda majburiy kanal yoʻq</Empty>}

      {data && channels.length > 0 && (
        <div className={styles.body} data-busy={busy || undefined}>
          <div className="grid c3">
            <Stat
              label="Hozirgi aʼzolar"
              value={num(members)}
              sub="botga yozganlar ichida"
            />
            <Stat label="Qoʻshildi" value={`+${num(joined)}`} sub={`bot orqali · ${during(range)}`} tone="ok" />
            <Stat label="Chiqib ketdi" value={`−${num(left)}`} sub={`bot orqali qoʻshilganlardan`} tone="warn" />
          </div>

          {chart.some((p) => p.join > 0 || p.leave > 0) ? (
            <TrendChart
              data={chart}
              height={240}
              series={[
                { key: "join", name: "Qoʻshildi" },
                { key: "leave", name: "Chiqdi" },
              ]}
            />
          ) : (
            <Empty>
              Bu davrda bot orqali qoʻshilish boʻlmagan
              {data.trackingSince ? ` · hisob ${fullDay(data.trackingSince)} dan` : ""}
            </Empty>
          )}

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Kanal</th>
                  <th className="num">Aʼzolar</th>
                  <th className="num">Qoʻshildi</th>
                  <th className="num">Chiqdi</th>
                </tr>
              </thead>
              <tbody>
                {channels.map((c) => (
                  <tr key={c.telegram_id}>
                    <td>
                      {c.name}
                      {!c.is_active && <span className="hint"> · oʻchiq</span>}
                    </td>
                    <td className="num">{num(c.members)}</td>
                    <td className="num">+{num(c.joined)}</td>
                    <td className="num">−{num(c.left)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="hint">
            Faqat botga yozib, majburiy obuna orqali qoʻshilganlar sanaladi. Chiqib ketganlar — ular
            ichidan kanalni tark etganlar.
          </p>
        </div>
      )}
    </Card>
  );
}
