import React, { useState, useEffect } from "react";
import styles from "./index.module.scss";
import Card from "../../components/ui/Card";
import Table from "../../components/ui/Table";
import Button from "../../components/ui/Button";
import LogsService from "../../api/services/logsService";

function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalDocs, setTotalDocs] = useState(0);

  // Filtrlar
  const [levelFilter, setLevelFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [timeFilter, setTimeFilter] = useState("");

  const fetchLogs = async (page = 1) => {
    setIsLoading(true);
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
      width: "180px",
      render: (val) => val ? new Date(val).toLocaleString("uz-UZ") : "—"
    },
    { 
      title: "Daraja", 
      key: "level", 
      width: "100px",
      render: (val) => (
        <span className={`${styles.level_badge} ${styles[val?.toLowerCase()] || ""}`}>
          {val}
        </span>
      )
    },
    { title: "Xabar", key: "message" },
    { 
      title: "Manba", 
      key: "meta", 
      width: "160px",
      render: (val) => val?.source || "—"
    }
  ];

  return (
    <div className={styles.wrapper}>
      <Card title="Tizim Jurnali (Logs)">
        {/* Filter qatori */}
        <div className={styles.filters}>
          <select
            className={styles.filter_select}
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
          >
            <option value="">Barcha darajalar</option>
            <option value="info">Info</option>
            <option value="error">Error</option>
            <option value="warn">Warning</option>
          </select>

          <select
            className={styles.filter_select}
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
          >
            <option value="">Barcha manbalar</option>
            <option value="backend">Backend</option>
            <option value="telegram-bot">Telegram Bot</option>
          </select>

          <select
            className={styles.filter_select}
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
          >
            <option value="">Barcha vaqt</option>
            <option value="1h">Oxirgi 1 soat</option>
            <option value="6h">Oxirgi 6 soat</option>
            <option value="24h">Oxirgi 24 soat</option>
          </select>

          <Button onClick={handleFilter}>Filtrlash</Button>
          <Button variant="ghost" onClick={handleClear}>Tozalash</Button>
          <span className={styles.total_info}>Jami: {totalDocs} ta log</span>
        </div>

        <Table 
          columns={columns} 
          data={logs} 
          isLoading={isLoading} 
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className={styles.pagination}>
            <Button
              variant="ghost"
              disabled={currentPage <= 1}
              onClick={() => fetchLogs(currentPage - 1)}
            >
              ← Oldingi
            </Button>
            <span className={styles.page_info}>
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="ghost"
              disabled={currentPage >= totalPages}
              onClick={() => fetchLogs(currentPage + 1)}
            >
              Keyingi →
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}

export default LogsPage;
