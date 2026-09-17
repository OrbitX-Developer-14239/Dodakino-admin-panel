import { useCallback, useEffect, useState } from "react";
import {
  TbMovie,
  TbUsers,
  TbBroadcast,
  TbEye,
  TbRefresh,
  TbTrophy,
} from "react-icons/tb";
import styles from "./index.module.scss";
import { Card, Stat, Empty, ErrorBox, Loading, PageHead, Badge } from "../../components/ui";
import { RankChart } from "../../components/charts";
import { num } from "../../utils/format";
import FilmService from "../../api/services/filmService";
import UsersService from "../../api/services/usersService";
import StatisticsService from "../../api/services/statisticsService";
import ChannelsService from "../../api/services/channelService";

/**
 * Boshqaruv paneli — "hozir qanday holat" degan savolga bir qarashda
 * javob beradi.
 *
 * Ilgari bu yerda uchta kartochka ichida harf-o'rinbosarlar ("F",
 * "U", "★") va "Xush kelibsiz" matni turardi. Xush kelibsiz matni har
 * kuni panelni ochadigan odam uchun ma'lumot emas — o'rniga eng ko'p
 * ko'rilgan filmlar reytingi qo'yildi.
 */
function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);

    // Hammasi parallel: ketma-ket so'ralsa sahifa to'rt marta kutilardi.
    // `allSettled` — bittasi yiqilsa ham qolganlari ko'rsatiladi, chunki
    // to'liq bo'sh ekrandan ko'ra qisman ma'lumot foydaliroq.
    const [films, users, top, channels] = await Promise.allSettled([
      FilmService.getList(),
      UsersService.getList({ page: 1 }),
      StatisticsService.getTop(8, 1),
      ChannelsService.getList(),
    ]);

    const val = (r) => (r.status === "fulfilled" ? r.value : null);
    const failed = [films, users, top, channels].find((r) => r.status === "rejected");

    const channelList = val(channels)?.data || [];

    setData({
      films: val(films)?.pagination?.totalFilms ?? 0,
      users: val(users)?.data?.totalDocs ?? 0,
      channels: channelList.length,
      activeChannels: channelList.filter((c) => c.is_active).length,
      top: val(top)?.data || [],
    });

    if (failed) setError(failed.reason);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!data && !error) return <Loading rows={4} />;

  const top = data?.top || [];
  const totalViews = top.reduce((sum, f) => sum + (f.views || 0), 0);
  const chart = top.slice(0, 6).map((f) => ({ name: f.name, value: f.views || 0 }));

  return (
    <>
      <PageHead>
        <button type="button" className="btn ghost sm" onClick={load}>
          <TbRefresh size={14} /> Yangilash
        </button>
      </PageHead>

      <ErrorBox error={error} onRetry={load} />

      {/* ── Asosiy ko'rsatkichlar ─────────────────────────────── */}
      <div className="grid c4">
        <Stat
          icon={TbMovie}
          label="Jami filmlar"
          value={num(data?.films)}
          sub="katalogdagi kinolar"
        />
        <Stat
          icon={TbUsers}
          label="Bot foydalanuvchilari"
          value={num(data?.users)}
          sub="ro'yxatdan o'tganlar"
          tone="info"
        />
        <Stat
          icon={TbBroadcast}
          label="Majburiy kanallar"
          value={num(data?.channels)}
          sub={`${num(data?.activeChannels)} tasi faol`}
          tone="ok"
        />
        <Stat
          icon={TbEye}
          label="Top filmlar ko'rishi"
          value={num(totalViews)}
          sub="eng mashhur 8 ta bo'yicha"
          tone="warn"
        />
      </div>

      {/* ── Eng ko'p ko'rilganlar ─────────────────────────────── */}
      <Card title="Eng ko'p ko'rilgan filmlar" icon={TbTrophy}>
        {chart.length ? (
          <RankChart data={chart} height={280} />
        ) : (
          <Empty>Hozircha ko'rishlar statistikasi yo'q</Empty>
        )}
      </Card>

      {/* ── Reyting ro'yxati ──────────────────────────────────── */}
      {top.length > 0 && (
        <Card title="Reyting" icon={TbEye}>
          <ol className={styles.rankList}>
            {top.map((film, i) => (
              <li key={film._id || film.code || i} className={styles.rankRow}>
                <span className={styles.rankNum}>{i + 1}</span>
                <span className={styles.rankName} title={film.name}>
                  {film.name}
                </span>
                <Badge tone={i === 0 ? "ok" : ""}>{num(film.views)} ko'rish</Badge>
              </li>
            ))}
          </ol>
        </Card>
      )}
    </>
  );
}

export default Dashboard;
