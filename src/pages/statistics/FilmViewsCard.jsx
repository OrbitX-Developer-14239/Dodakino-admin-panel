import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TbChartAreaLine, TbEye, TbTable } from "react-icons/tb";
import styles from "./parts.module.scss";
import { Card, Empty, ErrorBox, Loading, Table } from "../../components/ui";
import { RankChart, TrendChart } from "../../components/charts";
import { num } from "../../utils/format";
import { Figure, RANGES, Segmented, ViewToggle, fullDay, withLabels } from "./parts";
import StatisticsService from "../../api/services/statisticsService";

/**
 * Bitta filmning ko'rilish statistikasi.
 *
 * IKKI XIL RAQAM BOR VA ULAR TENG EMAS:
 *   "Jami ko'rish"  — boshidan beri yig'ilgan hisoblagich;
 *   grafikdagi kunlar — kunlik hisob shu imkoniyat qo'shilgandan keyin
 *   to'plana boshlagan.
 * Shuning uchun ular bitta grafikda aralashtirilmaydi va kartochka
 * hisob qachondan boshlanganini ochiq yozadi — aks holda "jami 27,
 * grafikda 3" degan farq xato bo'lib ko'rinardi.
 */

const MODES = [
  { key: "daily", label: "Kunlik" },
  { key: "episodes", label: "Qismlar" },
];

const SERIES = [
  { key: "filmViews", name: "Film ochilgan", token: "--color-chart-users" },
  { key: "episodeViews", name: "Qism ko'rilgan", token: "--color-chart-users-active" },
];

export default function FilmViewsCard({ refreshKey = 0 }) {
  const [films, setFilms] = useState([]);
  const [code, setCode] = useState("");
  const [range, setRange] = useState("30");
  const [mode, setMode] = useState("daily");
  const [view, setView] = useState("chart");
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const requestId = useRef(0);

  // Filmlar ro'yxati bir marta yuklanadi; eng ko'p ko'rilgani birinchi
  // bo'lib tanlanadi — sahifa ochilishi bilan mazmunli grafik ko'rinadi
  useEffect(() => {
    let alive = true;
    StatisticsService.getFilmsForPicker()
      .then((res) => {
        if (!alive) return;
        const list = res?.data || [];
        setFilms(list);
        setCode((c) => c || String(list[0]?.code || ""));
        if (!list.length) setIsLoading(false);
      })
      .catch((err) => {
        if (alive) {
          setError(err);
          setIsLoading(false);
        }
      });
    return () => { alive = false; };
  }, [refreshKey]);

  const load = useCallback(async () => {
    if (!code) return;
    const id = ++requestId.current;
    setIsLoading(true);
    setError(null);
    try {
      const res = await StatisticsService.getFilmViews(code, range);
      if (id === requestId.current) setData(res?.data || null);
    } catch (err) {
      if (id === requestId.current) setError(err);
    } finally {
      if (id === requestId.current) setIsLoading(false);
    }
  }, [code, range]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const points = useMemo(() => withLabels(data?.points), [data]);
  const film = data?.film;
  const totals = data?.totals;
  // useMemo ichida ishlatiladi — har renderda yangi massiv bo’lsa keshlash ma’nosiz
  const byEpisode = useMemo(() => data?.byEpisode || [], [data]);
  const during = RANGES.find((r) => r.key === (data?.range?.key ?? range))?.during;

  /**
   * Qismlar diagrammasi — FAQAT ko'rilgan qismlar.
   *
   * "Merlin" da 65 qism bor, ulardan 4 tasi ko'rilgan. Hammasini
   * chizganda ustunlar 5 piksel ingichka bo'lib qolar, yorliqlar esa
   * sig'magani uchun har uchinchisi ko'rsatilardi — qaysi ustun qaysi
   * qismniki ekanini aniqlab bo'lmasdi. Nol qiymatli ustundan ma'lumot
   * ham chiqmaydi. To'liq ro'yxat jadval ko'rinishida turadi.
   */
  const MAX_BARS = 24;
  const viewedEpisodes = useMemo(() => byEpisode.filter((e) => e.views > 0), [byEpisode]);

  const episodeBars = useMemo(() => {
    const byOrder = (a, b) => a.season - b.season || a.episodeNumber - b.episodeNumber;
    // Juda ko'p bo'lsa eng ko'p ko'rilganlari olinadi, lekin chizilishi
    // qism tartibida qoladi — ko'z bilan qidirish oson bo'lsin
    const shown =
      viewedEpisodes.length > MAX_BARS
        ? [...viewedEpisodes].sort((a, b) => b.views - a.views).slice(0, MAX_BARS).sort(byOrder)
        : viewedEpisodes;

    return shown.map((e) => ({
      name: (film?.seasonsCount || 1) > 1 ? `${e.season}x${e.episodeNumber}` : `${e.episodeNumber}-qism`,
      value: e.views,
    }));
  }, [viewedEpisodes, film]);

  const topEpisode = useMemo(
    () => byEpisode.reduce((best, e) => (!best || e.views > best.views ? e : best), null),
    [byEpisode]
  );

  const numCell = (val) => <span className={styles.num}>{num(val)}</span>;
  const dailyRows = useMemo(() => [...points].reverse(), [points]);
  const dailyColumns = [
    { title: "Sana", key: "date", render: (val) => fullDay(val) },
    { title: "Film ochilgan", key: "filmViews", width: "130px", render: numCell },
    { title: "Qism ko'rilgan", key: "episodeViews", width: "130px", render: numCell },
    { title: "Jami", key: "total", width: "90px", render: numCell },
  ];
  const episodeColumns = [
    { title: "Fasl", key: "season", width: "70px", render: numCell },
    { title: "Qism", key: "episodeNumber", width: "70px", render: numCell },
    { title: "Nomi", key: "name" },
    { title: "Kod", key: "code", width: "90px", render: (val) => <span className="mono">{val}</span> },
    { title: "Ko'rishlar", key: "views", width: "110px", render: numCell },
  ];

  const firstLoad = isLoading && !data;
  const hasDaily = points.some((p) => p.total > 0);

  return (
    <Card
      title="Film ko'rishlari"
      subtitle="Film tanlang · kunlar Toshkent vaqtida"
      icon={TbEye}
      actions={
        <ViewToggle view={view} onChange={setView} chartIcon={TbChartAreaLine} tableIcon={TbTable} />
      }
    >
      <div className={styles.toolbar}>
        <select
          className={styles.picker}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          aria-label="Film tanlash"
        >
          {films.map((f) => (
            <option key={f.code} value={f.code}>
              {f.name} — {num(f.views)} ko'rish
            </option>
          ))}
        </select>

        <Segmented label="Davr" options={RANGES} value={range} onChange={setRange} />
        <Segmented label="Ko'rsatkich" options={MODES} value={mode} onChange={setMode} />
      </div>

      {error && !data && <ErrorBox error={error} onRetry={load} />}
      {firstLoad && <Loading rows={4} />}
      {!films.length && !isLoading && !error && <Empty icon={TbEye}>Hali film qo'shilmagan</Empty>}

      {film && (
        <div className={styles.body} data-refreshing={isLoading || undefined}>
          <div className={styles.figures}>
            <Figure label="Jami ko'rish" value={num(totals.allTime)} sub="boshidan beri" />
            {/* Belgi YO'Q: bu raqam ikkala chiziqning yig'indisi,
                bitta seriyaga tegishli emas */}
            <Figure label="Tanlangan davrda" value={num(totals.inRange)} sub={during} />
            <Figure
              label="Qismlar"
              value={num(film.episodesCount)}
              sub={film.seasonsCount > 1 ? `${num(film.seasonsCount)} fasl` : "bir fasl"}
            />
            <Figure
              label="Eng ko'p ko'rilgan qism"
              value={topEpisode ? num(topEpisode.views) : "—"}
              sub={topEpisode ? `${topEpisode.season}x${topEpisode.episodeNumber}` : "qismlar yo'q"}
            />
          </div>

          {mode === "episodes" ? (
            byEpisode.length === 0 ? (
              <Empty icon={TbEye}>Bu filmda qismlar yo'q</Empty>
            ) : view === "chart" ? (
              episodeBars.length === 0 ? (
                <Empty icon={TbEye}>Bu filmning qismlari hali ko'rilmagan</Empty>
              ) : (
                <>
                  <RankChart
                    data={episodeBars}
                    sameColor
                    token="--color-chart-users"
                    height={Math.max(160, Math.min(620, episodeBars.length * 34 + 40))}
                  />
                  <p className={styles.note}>
                    {viewedEpisodes.length > MAX_BARS
                      ? `${num(byEpisode.length)} qismdan eng ko'p ko'rilgan ${MAX_BARS} tasi. To'liq ro'yxat jadvalda.`
                      : `${num(byEpisode.length)} qismdan ${num(viewedEpisodes.length)} tasi ko'rilgan. To'liq ro'yxat jadvalda.`}
                  </p>
                </>
              )
            ) : (
              <div className={styles.tableWrap}>
                <Table columns={episodeColumns} data={byEpisode} empty="Qismlar yo'q" />
              </div>
            )
          ) : !hasDaily ? (
            // Bo'sh grafik "buzuq" bo'lib ko'rinadi — sababi aytiladi
            <Empty icon={TbChartAreaLine}>
              {data.trackingSince
                ? `Bu davrda ko'rish bo'lmagan. Kunlik hisob ${fullDay(data.trackingSince)} dan yig'ilmoqda.`
                : "Kunlik hisob endi yo'lga qo'yildi — birinchi ko'rishdan keyin grafik to'la boshlaydi."}
            </Empty>
          ) : view === "chart" ? (
            <TrendChart data={points} series={SERIES} height={300} endLabels integer />
          ) : (
            <div className={styles.tableWrap}>
              <Table columns={dailyColumns} data={dailyRows} empty="Bu davrda ma'lumot yo'q" />
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
