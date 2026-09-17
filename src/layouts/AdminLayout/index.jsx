import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import styles from "./AdminLayout.module.scss";
import Sidebar from "../../components/sidebar/index";
import Navbar from "../../components/navbar/index";
import Tabbar from "../../components/tabbar/index";
import Footer from "../../components/footer/index";
import { TokenManager } from "../../api/tokenManager";
import BotService from "../../api/services/botService";
import { initSocket, disconnectSocket } from "../../api/socket";

/**
 * Panel karkasi.
 *
 * TARTIB: sidebar chapda "yopishib" turadi (sticky), o'ngdagi ustun
 * qolgan kenglikni to'liq egallaydi. 1024px dan tor ekranda sidebar
 * yo'qoladi va o'rnini pastdagi Tabbar egallaydi.
 *
 * ILGARI QANDAY EDI: bitta 173 qatorlik komponent — menyu ro'yxati
 * qo'lda yozilgan, ikonkalar o'rniga kulrang kvadratlar, sarlavha
 * doim "Boshqaruv paneli", mavzu esa ThemeManager'ni chetlab o'tib
 * to'g'ridan-to'g'ri classList bilan boshqarilardi. Endi menyu
 * routes.js dan, sarlavha ham shundan, mavzu esa ThemeManager'dan.
 */
const AdminLayout = () => {
  // Multibot: botlar ro'yxati bir marta olinadi va navbar (tanlagich)
  // hamda footer (holat) o'rtasida bo'lishiladi — ikki marta
  // so'ralmasin.
  const [bots, setBots] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    BotService.list()
      .then((res) => alive && setBots(res?.data || []))
      .catch(() => alive && setBots([]));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    initSocket();

    // Refresh token eskirganda (client.js dan dispatch qilinadi) → login sahifasiga
    const handleAuthLogout = () => {
      TokenManager.clearTokens();
      navigate("/auth", { replace: true });
    };

    window.addEventListener("auth:logout", handleAuthLogout);

    return () => {
      disconnectSocket();
      window.removeEventListener("auth:logout", handleAuthLogout);
    };
  }, [navigate]);

  return (
    <div className={styles.wrapper}>
      {/* CHAP: SIDEBAR — mobilda yashiriladi, o'rniga pastdagi Tabbar */}
      <Sidebar />

      {/* O'NG: ASOSIY USTUN */}
      <div className={styles.container}>
        <Navbar bots={bots} />

        {/*
          Sahifa kontenti. `layout-inner` — navbar bilan BITTA vertikal
          o'q (panel.css dagi izohga qarang), shuning uchun bu yerda
          alohida padding YOZILMAYDI.
        */}
        <main className={styles.content}>
          <div className={`layout-inner ${styles.inner}`}>
            <Outlet />
          </div>
        </main>

        <Footer bots={bots} />
      </div>

      {/* Mobil pastki menyu — faqat tor ekranda ko'rinadi */}
      <Tabbar />
    </div>
  );
};

export default AdminLayout;
