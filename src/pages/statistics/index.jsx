import { useState } from "react";
import { TbRefresh } from "react-icons/tb";
import { PageHead } from "../../components/ui";
import UsersGrowthCard from "./UsersGrowthCard";
import FilmViewsCard from "./FilmViewsCard";
import ChannelJoinsCard from "./ChannelJoinsCard";

/**
 * Statistika — uchta savolga javob beradigan uchta grafik:
 *
 *   1. Auditoriya o'syaptimi?       -> foydalanuvchilar o'sishi
 *   2. Qaysi film ko'rilyapti?      -> film tanlanadi, ko'rishlari chiziladi
 *   3. Majburiy kanal to'layaptimi? -> qo'shilgan va chiqib ketganlar
 *
 * Ilgari bu yerda "Top 100 eng ko'p ko'rilgan kinolar" jadvali va uning
 * ustidagi reyting diagrammasi turardi. Ikkalasi ham BITTA holatni —
 * hozirgi reytingni — ko'rsatardi, "qachon" degan savolga javob bermasdi
 * va sahifaning yarmini egallardi. Endi filmni tanlab, aynan o'sha
 * filmning ko'rilish tarixini ko'rish mumkin.
 *
 * Sahifa o'zi ma'lumot yuklamaydi: har kartochka o'zinikini o'zi oladi.
 * "Yangilash" shu raqamni oshiradi, uchalasi ham qayta so'raydi.
 */
function StatisticsPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <>
      <PageHead>
        <button
          type="button"
          className="btn ghost sm"
          onClick={() => setRefreshKey((k) => k + 1)}
        >
          <TbRefresh size={14} /> Yangilash
        </button>
      </PageHead>

      <UsersGrowthCard refreshKey={refreshKey} />
      <FilmViewsCard refreshKey={refreshKey} />
      <ChannelJoinsCard refreshKey={refreshKey} />
    </>
  );
}

export default StatisticsPage;
