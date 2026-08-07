import React, { useState, useEffect } from "react";
import styles from "./index.module.scss";
import Card from "../../components/ui/Card";
import Table from "../../components/ui/Table";
import Button from "../../components/ui/Button";
import StatisticsService from "../../api/services/statisticsService";

function StatisticsPage() {
  const [topItems, setTopItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const TOP_COUNT = 100;

  const fetchStats = async (page = 1) => {
    setIsLoading(true);
    try {
      const res = await StatisticsService.getTop(TOP_COUNT, page);
      // Backend: { success: true, data: [...], pagination: { page, limit, totalPages } }
      setTopItems(res?.data || []);
      setCurrentPage(res?.pagination?.page || 1);
      setTotalPages(res?.pagination?.totalPages || 1);
    } catch (error) {
      console.error("Statistika yuklashda xatolik:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats(1);
  }, []);

  const columns = [
    { 
      title: "O'rin", 
      key: "rank", 
      width: "70px",
      render: (val) => <span className={styles.rank}>#{val}</span>
    },
    { title: "Kino Nomi", key: "name" },
    { title: "Kod", key: "code", width: "90px" },
    { 
      title: "Ko'rishlar soni", 
      key: "views", 
      width: "140px",
      render: (val) => (
        <span className={styles.views_badge}>{val ?? 0} ta</span>
      )
    },
    { 
      title: "Epizodlar", 
      key: "episodes", 
      width: "110px",
      render: (val) => `${val?.length || 0} ta`
    }
  ];

  // Har bir elementga rank raqami qo'shamiz
  const dataWithRank = topItems.map((item, index) => ({
    ...item,
    rank: (currentPage - 1) * 20 + index + 1
  }));

  return (
    <div className={styles.wrapper}>
      <Card title={`Top ${TOP_COUNT} Eng ko'p ko'rilgan kinolar`}>
        <Table 
          columns={columns} 
          data={dataWithRank} 
          isLoading={isLoading} 
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className={styles.pagination}>
            <Button
              variant="ghost"
              disabled={currentPage <= 1}
              onClick={() => fetchStats(currentPage - 1)}
            >
              ← Oldingi
            </Button>
            <span className={styles.page_info}>
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="ghost"
              disabled={currentPage >= totalPages}
              onClick={() => fetchStats(currentPage + 1)}
            >
              Keyingi →
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}

export default StatisticsPage;
