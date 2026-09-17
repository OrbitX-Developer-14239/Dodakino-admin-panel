import { useState, useEffect } from "react";
import { TbListDetails } from "react-icons/tb";
import styles from "./index.module.scss";
import { Badge, Card, ErrorBox, PageHead, Pagination, Table } from "../../components/ui";
import { num, time } from "../../utils/format";
import LogsService from "../../api/services/logsService";

/**
 * Tizim jurnali.
 *
 * Daraja (level) ranglari tasodifiy emas: xato — danger, ogohlantirish
 * — warn, ma'lumot — info. Shu bir xil ohanglar butun panelda bir xil
 * ma'noni bildiradi, shuning uchun jadvalni o'qimasdan ham qaysi
 * qatorga qarash kerakligi ko'rinadi.
 */
const LEVEL_TONE = {
  error: "danger",
  warn: "warn",
  warning: "warn",
  info: "info",
};

function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalDocs, setTotalDocs] = useState(0);

  // Filtrlar
  const [levelFilter, setLevelFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [timeFilter, setTimeFilter] = useState("");

  const fetchLogs = async (page = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = { page, limit: 50 };
      if (levelFilter) params.level = levelFilter;
      if (sourceFilter) params.source = sourceFilter;
      if (timeFilter) params.time = timeFilter;

      const res = await LogsService.getList(params);
      // Backend: { success, data: [...logs], meta: { totalDocs, page, limit, totalPages } }
      setLogs(res?.data || []);
      setCurrentPage(res?.meta?.page || 1);
      setTotalPages(res?.meta?.totalPages || 1);
      setTotalDocs(res?.meta?.totalDocs || 0);
    } catch (error) {
      console.error("Loglarni yuklashda xatolik:", error);
      setError(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // faqat birinchi render da

  const handleFilter = () => {
    setCurrentPage(1);
    fetchLogs(1);
  };

  const handleClear = () => {
    setLevelFilter("");
    setSourceFilter("");
    setTimeFilter("");
    // State tozalangandan keyin fetchlash
    setTimeout(() => fetchLogs(1), 0);
  };

  const columns = [
    {
      title: "Vaqt",
      key: "timestamp",
      width: "150px",
      render: (val) => <span className={styles.stamp}>{time(val)}</span>
    },
    {
      title: "Daraja",
      key: "level",
      width: "100px",
      render: (val) => (
        <Badge tone={LEVEL_TONE[String(val || "").toLowerCase()] || ""}>
          {String(val || "—").toUpperCase()}
        </Badge>
      )
    },
    {
      title: "Xabar",
      key: "message",
      render: (val) => <span className={styles.message}>{val}</span>
    },
    {
      title: "Manba",
      key: "meta",
      width: "160px",
      render: (val) => val?.source || "—"
    }
  ];

  return (
    <>
      <PageHead>
        <div className={styles.filters}>
          <select
            className={styles.filter}
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            aria-label="Daraja"
          >
            <option value="">Barcha darajalar</option>
            <option value="info">Info</option>
            <option value="error">Error</option>
            <option value="warn">Warning</option>
          </select>

          <select
            className={styles.filter}
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            aria-label="Manba"
          >
            <option value="">Barcha manbalar</option>
            <option value="backend">Backend</option>
            <option value="telegram-bot">Telegram Bot</option>
          </select>

          <select
            className={styles.filter}
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
            aria-label="Vaqt oralig'i"
          >
            <option value="">Barcha vaqt (7 kun)</option>
            <option value="1h">Oxirgi 1 soat</option>
            <option value="6h">Oxirgi 6 soat</option>
            <option value="24h">Oxirgi 24 soat</option>
            {/* Loglar bazada 7 kun saqlanadi — undan uzoq variant ma'nosiz */}
            <option value="3d">Oxirgi 3 kun</option>
            <option value="5d">Oxirgi 5 kun</option>
            <option value="7d">Oxirgi 7 kun</option>
          </select>

          <button type="button" className="btn sm" onClick={handleFilter}>
            Filtrlash
          </button>
          <button type="button" className="btn ghost sm" onClick={handleClear}>
            Tozalash
          </button>
        </div>
      </PageHead>

      <ErrorBox error={error} onRetry={() => fetchLogs(currentPage)} />

      <Card
        title="Tizim jurnali"
        subtitle={`Jami ${num(totalDocs)} ta yozuv`}
        icon={TbListDetails}
      >
        <Table
          columns={columns}
          data={logs}
          isLoading={isLoading}
          empty="Tanlangan shartlarga mos yozuv topilmadi"
        />

        <Pagination page={currentPage} totalPages={totalPages} onChange={fetchLogs} />
      </Card>
    </>
  );
}

export default LogsPage;
