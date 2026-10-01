import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import styles from "./index.module.scss";
import Navbar from "../components/navbar/index";
import Sidebar from "../components/sidebar/index";
import Tabbar from "../components/tabbar/index";
import Footer from "../components/footer/index";
import { findRouteByPath } from "../router/routes";
import { TokenManager } from "../api/tokenManager";
import client from "../api/client";
import { ENDPOINTS } from "../api/endpoints";
import { getSelectedBotId } from "../api/botContext";
import { disconnectSocket } from "../api/socket";

function MainLayout() {
  const { pathname } = useLocation();
  const route = findRouteByPath(pathname);
  const authed = TokenManager.hasAccessToken();

  /**
   * Multibot: botlar ro'yxati BIR MARTA olinadi va navbar (tanlagich),
   * footer hamda sahifalar (Outlet context) o'rtasida bo'lishiladi.
   * `botsLoaded` — ro'yxat kelganini bo'sh ro'yxatdan ajratish uchun
   * (xato bo'lsa ham true: sahifalar abadiy kutib qolmasin).
   */
  const [bots, setBots] = useState([]);
  const [botsLoaded, setBotsLoaded] = useState(false);

  useEffect(() => {
    if (!authed) return undefined;
    let alive = true;
    client
      .get(ENDPOINTS.BOT.LIST, { silent: true })
      .then((res) => alive && setBots(res?.data || []))
      .catch(() => alive && setBots([]))
      .finally(() => alive && setBotsLoaded(true));
    return () => {
      alive = false;
    };
  }, [authed]);

  // Panel yopilganda (chiqish) socket ham yopiladi
  useEffect(() => () => disconnectSocket(), []);

  // MUHIM: himoya aynan SHU YERDA — layout render qilinishidan OLDIN.
  // Tekshiruv faqat ichkarida bo'lsa React Router avval layoutni
  // (Sidebar/Navbar) chizib, keyin ichkaridagi Navigate'ni bajaradi —
  // natijada kirmagan foydalanuvchiga admin karkasi bir lahza ko'rinib
  // ketardi.
  if (route?.private && !authed) {
    return <Navigate to="/auth" replace state={{ from: pathname }} />;
  }

  // Tanlanmagan bo'lsa backend birinchi botga ishlaydi — panel ham shunday
  const currentBotId = getSelectedBotId() || String(bots[0]?.botId || "");
  const currentBot = bots.find((b) => String(b.botId) === currentBotId) || null;
  const context = { bots, botsLoaded, currentBotId, currentBot };

  return (
    <div className={styles.wrapper}>
      {/* CHAP: SIDEBAR — mobilda yashiriladi, o'rniga pastdagi Tabbar */}
      <Sidebar />

      {/* O'NG: ASOSIY USTUN */}
      <div className={styles.container}>
        <Navbar bots={bots} currentBotId={currentBotId} />

        {/*
          Sahifa kontenti. `layout-inner` — navbar bilan BITTA vertikal
          o'q (panel.css dagi izohga qarang), shuning uchun bu yerda
          alohida padding YOZILMAYDI.
        */}
        <main className={styles.content}>
          <div className={`layout-inner ${styles.inner}`}>
            <Outlet context={context} />
          </div>
        </main>

        <Footer currentBot={currentBot} />
      </div>

      {/* Mobil pastki menyu — faqat tor ekranda ko'rinadi */}
      <Tabbar />
    </div>
  );
}

export default MainLayout;
