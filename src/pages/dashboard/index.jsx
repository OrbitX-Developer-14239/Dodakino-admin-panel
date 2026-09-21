import { useCallback, useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  TbAlertTriangle,
  TbChartLine,
  TbMovie,
  TbRefresh,
  TbSpeakerphone,
} from "react-icons/tb";
import styles from "./index.module.scss";
import client from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import AppLink from "../../components/AppLink";
import { RankChart, TrendChart } from "../../components/charts";
import { Badge, Button, Card, Empty, ErrorBox, Loading, Meter, PageHead, Stat } from "../../components/ui";
import { useBusy } from "../../hooks/useBusy";
import { ago, compact, dayLabel, num } from "../../utils/format";

/**
 * Boshqaruv paneli — "hozir hammasi joyidami?" degan savolga bir
 * qarashda javob.
 *
 * Har bo'lim alohida so'rov va ALOHIDA natija: bittasi yiqilsa
 * (masalan statistika sekin javob bersa) qolganlari baribir chiqadi.
 * Batafsil tahlil Statistika sahifasida — bu yerda faqat xulosa.
 */
export default function Dashboard() {
  const { currentBotId = "", botsLoaded = true } = useOutletContext() || {};
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [refreshing, runRefresh] = useBusy();

  const load = useCallback(
    async (silent = false) => {
      const get = (url, params) => client.get(url, { params, silent });

      const [films, users, growth, top, channels, errors] = await Promise.allSettled([
        get(ENDPOINTS.FILMS.LIST, { page: 1 }),
        get(ENDPOINTS.USERS, { page: 1, limit: 1 }),
        get(ENDPOINTS.STATISTICS.USERS_GROWTH, { range: "30" }),
        get(ENDPOINTS.STATISTICS.FILMS),
        get(ENDPOINTS.STATISTICS.CHANNEL_JOINS, { range: "30" }),
        currentBotId
          ? get(ENDPOINTS.LOGS, { level: "error", time: "24h", bot: currentBotId, limit: 8 })
          : Promise.resolve({ data: [] }),
      ]);

      const val = (r) => (r.status === "fulfilled" ? r.value?.data : null);
      setData({
        // Filmlar ro'yxati `data` ga o'ralmagan: { success, films, pagination }
        films: films.status === "fulfilled" ? films.value : null,
        users: val(users),
        growth: val(growth),
        top: val(top),
        channels: val(channels),
        errors: val(errors),
      });

      // Hammasi yiqilgan bo'lsagina xato — aks holda bor narsani ko'rsatamiz
      const failed = [films, users, growth, top, channels].filter((r) => r.status === "rejected");
      setError(failed.length === 5 ? failed[0].reason : null);
    },
    [currentBotId]
  );

  useEffect(() => {
    if (!currentBotId && !botsLoaded) return undefined;
    load();
    // Fon yangilanishi `silent` — aks holda yuklanish chizig'i
    // har daqiqada miltillab turardi.
    const t = setInterval(() => load(true), 60_000);
    return () => clearInterval(t);
  }, [load, currentBotId, botsLoaded]);

  if (!data && !error) return <Loading rows={4} />;

  const totalFilms = data?.films?.pagination?.totalFilms;
  const counts = data?.users?.counts;
  const growthTotals = data?.growth?.totals;
  const newIn30 = (data?.growth?.points || []).reduce((s, p) => s + (p.newStarted || 0), 0);
  const topFilms = Array.isArray(data?.top) ? data.top : [];
  const totalViews = topFilms.reduce((s, f) => s + (f.views || 0), 0);
  const channels = data?.channels?.channels || [];
  const errors = Array.isArray(data?.errors) ? data.errors : [];

  const trend = (data?.growth?.points || []).map((p) => ({
    label: dayLabel(p.date),
    newStarted: p.newStarted,
  }));
  const rank = topFilms.slice(0, 8).map((f) => ({ name: f.name, value: f.views || 0 }));

  return (
    <>
      <PageHead>
        <Button
          variant="ghost"
          size="sm"
          icon={TbRefresh}
          busy={refreshing}
          busyText="Yangilanmoqda…"
          onClick={() => runRefresh(() => load())}
        >
          Yangilash
        </Button>
      </PageHead>

      <ErrorBox error={error} onRetry={() => load()} />

      {/* ── Asosiy ko'rsatkichlar ─────────────────────────────── */}
      <div className="grid c4">
        <Stat label="Filmlar" value={num(totalFilms)} sub="katalogdagi kinolar" tone="info" />
        <Stat
          label="Foydalanuvchilar"
          value={num(counts?.all ?? growthTotals?.started)}
          sub={`+${num(newIn30)} soʻnggi 30 kunda`}
          tone="ok"
        />
        <Stat
          label="Obunachilar"
          value={num(counts?.subscribed)}
          sub="barcha majburiy kanallarga aʼzo"
        />
        <Stat
          label="Koʻrishlar"
          value={compact(totalViews)}
          sub="barcha filmlar boʻyicha"
          tone="warn"
        />
      </div>

      {/* ── Dinamika ──────────────────────────────────────────── */}
      <div className="grid c2">
        <Card
          title="Yangi foydalanuvchilar"
          icon={TbChartLine}
          actions={<AppLink to="/statistics" className="btn ghost sm">Batafsil</AppLink>}
        >
          {trend.length ? (
            <TrendChart data={trend} series={[{ key: "newStarted", name: "Yangi" }]} />
          ) : (
            <Empty>Bu oraliqda yangi foydalanuvchi boʻlmagan</Empty>
          )}
        </Card>

        <Card
          title="Eng koʻp koʻrilgan filmlar"
          icon={TbMovie}
          actions={<AppLink to="/films" className="btn ghost sm">Filmlar</AppLink>}
        >
          {rank.some((r) => r.value > 0) ? <RankChart data={rank} /> : <Empty>Hali koʻrish yoʻq</Empty>}
        </Card>
      </div>

      {/* ── Kanallar va xatolar ───────────────────────────────── */}
      <div className="grid c2">
        <Card
          title="Majburiy kanallar"
          icon={TbSpeakerphone}
          actions={<AppLink to="/channels" className="btn ghost sm">Kanallar</AppLink>}
        >
          {channels.length ? (
            <div className={styles.channels}>
              {channels.map((c) => (
                <Meter
                  key={c.telegram_id}
                  label={
                    <>
                      {c.name}
                      {!c.is_active && <Badge tone="warn">oʻchiq</Badge>}
                    </>
                  }
                  value={c.members || 0}
                  max={counts?.all || growthTotals?.started || 0}
                  tone={c.is_active ? "ok" : "warn"}
                  right={`${num(c.members)} aʼzo · +${num(c.joined)} / −${num(c.left)}`}
                />
              ))}
              <p className="hint">
                Aʼzolar — botga yozgan va kanalga qoʻshilganlar. +/− — soʻnggi 30 kunda bot orqali
                qoʻshilgan va chiqib ketganlar.
              </p>
            </div>
          ) : (
            <Empty icon={TbSpeakerphone}>Bu botda majburiy kanal yoʻq</Empty>
          )}
        </Card>

        <Card
          title="Soʻnggi xatolar"
          icon={TbAlertTriangle}
          actions={
            errors.length ? <Badge tone="danger">{errors.length}</Badge> : <Badge tone="ok">toza</Badge>
          }
        >
          {/*
            Jadval EMAS, ro'yxat: xato matni eng muhimi, lekin eng uzuni
            ham. Ro'yxatda u butun kenglikni oladi.
          */}
          {errors.length ? (
            <div className={`${styles.errors} anim-stagger`}>
              {errors.map((e, i) => (
                <div key={e._id || i} className={styles.errorRow} style={{ "--i": i }}>
                  <div className={styles.errorMeta}>
                    <Badge tone="danger">{e.level}</Badge>
                    <span className="spacer" />
                    <span>{ago(e.timestamp)}</span>
                  </div>
                  <p className={styles.errorText}>{e.message}</p>
                </div>
              ))}
            </div>
          ) : (
            <Empty>Soʻnggi 24 soatda xato qayd etilmagan — hammasi joyida</Empty>
          )}
        </Card>
      </div>
    </>
  );
}
