import React, { useState, useEffect } from "react";
import styles from "./index.module.scss";
import Card from "../../components/ui/Card";
import Asset from "@asset";
import FilmService from "../../api/services/filmService";
import UsersService from "../../api/services/usersService";
import StatisticsService from "../../api/services/statisticsService";

function Dashboard() {
  const [stats, setStats] = useState({
    films: 0,
    users: 0,
    topFilm: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [filmsRes, usersRes, topRes] = await Promise.all([
          FilmService.getList(),
          UsersService.getList({ page: 1 }),
          StatisticsService.getTop(1, 1),
        ]);

        setStats({
          films: filmsRes?.pagination?.totalFilms || 0,
          users: usersRes?.data?.totalDocs || 0,
          topFilm: topRes?.data?.[0] || null,
        });
      } catch (error) {
        console.error("Dashboard yuklashda xatolik:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className={styles.wrapper}>
      <div className={styles.stats_grid}>
        <Card className={styles.stat_card}>
          <div className={styles.stat_icon_wrapper} style={{ backgroundColor: 'var(--color-accent-soft)' }}>
            <span className={styles.icon_placeholder}>F</span>
          </div>
          <div className={styles.stat_info}>
            <p className={styles.stat_label}>Jami Filmlar</p>
            <h3 className={styles.stat_value}>{isLoading ? "..." : stats.films}</h3>
          </div>
        </Card>
        
        <Card className={styles.stat_card}>
          <div className={styles.stat_icon_wrapper} style={{ backgroundColor: 'var(--color-danger-soft)' }}>
            <span className={styles.icon_placeholder}>U</span>
          </div>
          <div className={styles.stat_info}>
            <p className={styles.stat_label}>Bot Foydalanuvchilari</p>
            <h3 className={styles.stat_value}>{isLoading ? "..." : stats.users}</h3>
          </div>
        </Card>

        <Card className={styles.stat_card}>
          <div className={styles.stat_icon_wrapper} style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
            <span className={styles.icon_placeholder}>★</span>
          </div>
          <div className={styles.stat_info}>
            <p className={styles.stat_label}>Eng ko'p ko'rilgan</p>
            <h3 className={styles.stat_value_text} title={stats.topFilm?.name}>
              {isLoading ? "..." : (stats.topFilm?.name || "Yo'q")}
            </h3>
            <p className={styles.stat_subvalue}>{stats.topFilm?.views || 0} marta</p>
          </div>
        </Card>
      </div>

      <div className={styles.content_grid}>
        <Card title="Xush kelibsiz!" subtitle="Doda Kino administrator boshqaruv paneli" className={styles.welcome_card}>
          <Asset.Icon name="logo" style={{ width: "200px", margin: "20px 0" }} />
          <p className={styles.welcome_text}>
            Bu yerdan siz barcha filmlar, epizodlar, obuna kanallari va bot foydalanuvchilarini boshqarishingiz mumkin. Chap tomondagi menyudan kerakli bo'limni tanlang.
          </p>
        </Card>
      </div>
    </div>
  );
}

export default Dashboard;
