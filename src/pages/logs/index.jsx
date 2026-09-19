import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  TbArrowDown,
  TbFilter,
  TbFileAnalytics,
  TbPlayerPause,
  TbPlayerPlay,
  TbRefresh,
  TbSearch,
  TbX,
} from "react-icons/tb";
import styles from "./index.module.scss";
import client from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import { streamLogs } from "../../api/logStream";
import { Badge, Card, Empty, ErrorBox, PageHead, Select } from "../../components/ui";
import { num } from "../../utils/format";

/**
 * Tizim jurnali — backend loglari.
 *
 * Filtrlar tanlanishi bilan qo'llanadi. Jurnalga faqat MUHIM narsalar
 * yoziladi (xatolar, ogohlantirishlar, ish natijalari); texnik
 * tafsilotlar serverning terminalida qoladi.
 *
 * ORALIQ: eng kam 1 soat, eng ko'p 7 kun — loglar bazada 7 kun saqlanadi.
 */

/** Bittasi ham ortiqcha emas: "hozir", "bugun", "shu hafta". */
const RANGES = [
  ["1h", "1 soat"],
  ["6h", "6 soat"],
  ["24h", "24 soat"],
  ["72h", "3 kun"],
  ["168h", "7 kun"],
];

/** "X va yuqori" — tanlangan daraja va undan jiddiyroqlari */
const LEVELS = ["info", "warn", "error"];
const levelsFrom = (level) => (level ? LEVELS.slice(LEVELS.indexOf(level)) : []);

// Bot filtri: joriy bot, hech bir botga bog'lanmagan tizim loglari, hammasi
const BOT_CURRENT = "current";
const BOT_NONE = "none";
const BOT_ALL = "";

const LIMIT = 2000;

const LEVEL_CLASS = {
  info: styles.info,
  warn: styles.warn,
  warning: styles.warn,
  error: styles.error,
};

const botsOf = (entry) => {
  const b = entry?.metadata?.bots ?? entry?.bots;
  return Array.isArray(b) ? b.map(String) : [];
};

export default function Logs() {
  const { currentBotId = "", currentBot, botsLoaded = true } = useOutletContext() || {};

  const [hours, setHours] = useState("1h");
  const [level, setLevel] = useState("");
  const [bot, setBot] = useState(BOT_CURRENT);
  const [q, setQ] = useState("");
  const [query, setQuery] = useState(""); // q ning kechiktirilgan nusxasi
  const [live, setLive] = useState(true);

  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const boxRef = useRef(null);
  const pinnedRef = useRef(true); // pastga "yopishib" turibdimi
  const requestId = useRef(0);

  // Har harf bosilganda so'rov ketmasin — yozib bo'lgach qidiriladi
  useEffect(() => {
    const t = setTimeout(() => setQuery(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  // Joriy bot ID si botlar ro'yxati kelgach aniq bo'ladi
  const ready = Boolean(currentBotId) || botsLoaded;
  const botParam = bot === BOT_CURRENT ? currentBotId || undefined : bot || undefined;

  const load = useCallback(async () => {
    if (!ready) return;
    const id = ++requestId.current;
    try {
      const params = { time: hours, limit: LIMIT };
      if (level) params.level = levelsFrom(level).join(",");
      if (botParam) params.bot = botParam;
      if (query) params.q = query;

      const res = await client.get(ENDPOINTS.LOGS, { params });
      if (id !== requestId.current) return;
      // Backend yangidan eskiga beradi — jurnal esa eskidan yangiga o'qiladi
      const items = [...(res?.data || [])].reverse();
      const total = res?.meta?.totalDocs ?? items.length;
      setResult({ items, total, truncated: total > items.length });
      setError(null);
    } catch (e) {
      if (id === requestId.current) setError(e);
    }
  }, [ready, hours, level, botParam, query]);

  useEffect(() => {
    load();
  }, [load]);

  /**
   * Jonli oqim.
   *
   * Faqat filtrga mos qatorlar qo'shiladi — aks holda "faqat xatolar"
   * tanlangan ekranga info qatorlari yog'ilardi.
   */
  useEffect(() => {
    if (!live) return undefined;
    return streamLogs((entry) => {
      setResult((prev) => {
        if (!prev) return prev;
        if (level && !levelsFrom(level).includes(String(entry.level).toLowerCase())) return prev;
        const ids = botsOf(entry);
        if (bot === BOT_NONE && ids.length) return prev;
        if (bot === BOT_CURRENT && !ids.includes(currentBotId)) return prev;
        if (query && !String(entry.message || "").toLowerCase().includes(query.toLowerCase())) return prev;
        return { ...prev, total: prev.total + 1, items: [...prev.items.slice(-LIMIT), entry] };
      });
    });
  }, [live, level, bot, query, currentBotId]);

  // Yangi qator kelganda pastga tushamiz — LEKIN faqat foydalanuvchi
  // allaqachon pastda tursa. Yuqoriga chiqib biror narsani o'qiyotgan
  // bo'lsa, ekranni tortib olish eng bezovta qiladigan xatti-harakat.
  useEffect(() => {
    const el = boxRef.current;
    if (el && pinnedRef.current) el.scrollTop = el.scrollHeight;
  }, [result]);

  const onScroll = () => {
    const el = boxRef.current;
    if (!el) return;
    pinnedRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
  };

  const items = useMemo(() => result?.items || [], [result]);
  const counts = useMemo(() => {
    const c = { warn: 0, error: 0 };
    for (const e of items) {
      const lv = String(e.level).toLowerCase();
      if (lv === "warn" || lv === "warning") c.warn++;
      if (lv === "error") c.error++;
    }
    return c;
  }, [items]);

  // Bugundan oldingi qator bo'lsa vaqt ustuniga sana ham kerak
  const hasOlder = useMemo(() => items.some((l) => !isToday(l.timestamp)), [items]);

  const filtersOn = Boolean(level || bot !== BOT_CURRENT || q);

  return (
    <>
      <PageHead>
        <button
          type="button"
          className={`btn ${live ? "" : "ghost"} sm`}
          onClick={() => setLive((v) => !v)}
          title={live ? "Jonli oqimni toʻxtatish" : "Jonli oqimni yoqish"}
        >
          {live ? <TbPlayerPause size={14} /> : <TbPlayerPlay size={14} />}
          {live ? "Jonli" : "Toʻxtatilgan"}
        </button>
        <button type="button" className="btn ghost sm" onClick={() => load()}>
          <TbRefresh size={14} /> Yangilash
        </button>
      </PageHead>

      <ErrorBox error={error} onRetry={() => load()} />

      {/* ── Filtrlar ────────────────────────────────────────────── */}
      <Card
        title="Filtr"
        icon={TbFilter}
        actions={
          filtersOn && (
            <button
              type="button"
              className="btn ghost sm"
              onClick={() => {
                setLevel("");
                setBot(BOT_CURRENT);
                setQ("");
              }}
            >
              <TbX size={13} /> Tozalash
            </button>
          )
        }
      >
        <div className={styles.filters}>
          <div className={`${styles.range} swipe`} role="group" aria-label="Vaqt oraligʻi">
            {RANGES.map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`${styles.rangeBtn} ${hours === value ? styles.rangeOn : ""}`}
                onClick={() => setHours(value)}
              >
                {label}
              </button>
            ))}
          </div>

          <Select
            value={level}
            onChange={setLevel}
            ariaLabel="Daraja"
            options={[
              { value: "", label: "Barcha darajalar" },
              ...LEVELS.map((l) => ({ value: l, label: `${l} va yuqori` })),
            ]}
          />

          <Select
            value={bot}
            onChange={setBot}
            ariaLabel="Bot"
            options={[
              {
                value: BOT_CURRENT,
                label: currentBot?.username ? `Faqat @${currentBot.username}` : "Faqat shu bot",
              },
              { value: BOT_NONE, label: "Umumiy tizim loglari" },
              { value: BOT_ALL, label: "Barcha loglar" },
            ]}
          />

          <label className={styles.search}>
            <TbSearch size={15} />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Matn boʻyicha qidirish…"
            />
          </label>
        </div>

        <div className={styles.summary}>
          <span>
            {num(result?.total)} ta qator
            {result?.truncated ? ` · oxirgi ${num(items.length)} tasi koʻrsatilmoqda` : ""}
          </span>
          {counts.warn > 0 && <Badge tone="warn">{counts.warn} ogohlantirish</Badge>}
          {counts.error > 0 && <Badge tone="danger">{counts.error} xato</Badge>}
          <span className="spacer" />
          {!pinnedRef.current && (
            <button
              type="button"
              className="btn ghost sm"
              onClick={() => {
                pinnedRef.current = true;
                if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight;
              }}
            >
              <TbArrowDown size={13} /> Oxiriga
            </button>
          )}
        </div>
      </Card>

      {/* ── Jurnal ──────────────────────────────────────────────── */}
      <Card title="Jurnal" icon={TbFileAnalytics} actions={live ? <Badge tone="info" pulse>jonli</Badge> : null}>
        {items.length ? (
          <div className={`${styles.logs} ${hasOlder ? styles.withDate : ""}`} ref={boxRef} onScroll={onScroll}>
            {items.map((l, i) => (
              <div
                key={`${l._id || l.timestamp}-${i}`}
                className={`${styles.line} ${LEVEL_CLASS[String(l.level).toLowerCase()] || ""}`}
              >
                <span className={styles.lineTime}>{fullTime(l.timestamp)}</span>
                <span className={styles.lineLevel}>{l.level}</span>
                <span className={styles.lineMsg}>{l.message}</span>
              </div>
            ))}
          </div>
        ) : (
          <Empty>{filtersOn ? "Bu filtrga mos qator topilmadi" : "Bu oraliqda yozuv yoʻq"}</Empty>
        )}
      </Card>
    </>
  );
}

/**
 * Server vaqti UTC da keladi: bazadan — ISO ("...Z"), jonli oqimdan —
 * mintaqasiz "2026-09-18 09:47:57". Ikkinchisiga "Z" qo'shilmasa brauzer
 * uni mahalliy deb o'qib, soatni 5 soatga yanglishtirardi.
 */
function toDate(ts) {
  const s = String(ts || "");
  const iso = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/.test(s) ? `${s.replace(" ", "T")}Z` : s;
  return new Date(iso);
}

function isToday(ts) {
  const d = toDate(ts);
  return !Number.isNaN(d.getTime()) && d.toDateString() === new Date().toDateString();
}

/** Jurnalda soat kerak, sana esa faqat boshqa kun bo'lsa: "09.12 14:02:11". */
function fullTime(ts) {
  const d = toDate(ts);
  if (Number.isNaN(d.getTime())) return String(ts ?? "").slice(11, 19);
  const pad = (n) => String(n).padStart(2, "0");
  const clock = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  return isToday(ts) ? clock : `${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${clock}`;
}
