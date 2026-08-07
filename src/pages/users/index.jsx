import React, { useState, useEffect } from "react";
import styles from "./index.module.scss";
import Card from "../../components/ui/Card";
import Table from "../../components/ui/Table";
import Button from "../../components/ui/Button";
import UsersService from "../../api/services/usersService";

function UsersPage() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalDocs, setTotalDocs] = useState(0);

  const fetchUsers = async (page = 1) => {
    setIsLoading(true);
    try {
      const res = await UsersService.getList({ page, limit: 50 });
      // Backend: { success, data: { users, totalDocs, page, limit, totalPages } }
      const data = res?.data || res;
      setUsers(data?.users || []);
      setCurrentPage(data?.page || 1);
      setTotalPages(data?.totalPages || 1);
      setTotalDocs(data?.totalDocs || 0);
    } catch (error) {
      console.error("Foydalanuvchilarni yuklashda xatolik:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(1);
  }, []);

  const columns = [
    { 
      title: "Telegram ID", 
      key: "telegram_id", 
      width: "150px" 
    },
    { 
      title: "Ism", 
      key: "first_name",
      render: (val) => val || "—"
    },
    { 
      title: "Username", 
      key: "username", 
      render: (val) => val ? `@${val}` : "—" 
    },
    { 
      title: "Obuna holati", 
      key: "channels_condition",
      width: "130px",
      render: (val) => {
        if (!val || val.length === 0) return <span className={styles.badge_inactive}>Yo'q</span>;
        const allSubscribed = val.every(c => c.is_member);
        return allSubscribed 
          ? <span className={styles.badge_active}>Obunachi</span>
          : <span className={styles.badge_inactive}>Obuna emas</span>;
      }
    },
    { 
      title: "Qo'shilgan sana", 
      key: "createdAt",
      render: (val) => val ? new Date(val).toLocaleDateString("uz-UZ") : "—"
    }
  ];

  return (
    <div className={styles.wrapper}>
      <Card title="Bot Foydalanuvchilari">
        <div className={styles.toolbar}>
          <span className={styles.total_info}>Jami: {totalDocs} ta foydalanuvchi</span>
        </div>
        <Table 
          columns={columns} 
          data={users} 
          isLoading={isLoading} 
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className={styles.pagination}>
            <Button
              variant="ghost"
              disabled={currentPage <= 1}
              onClick={() => fetchUsers(currentPage - 1)}
            >
              ← Oldingi
            </Button>
            <span className={styles.page_info}>
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="ghost"
              disabled={currentPage >= totalPages}
              onClick={() => fetchUsers(currentPage + 1)}
            >
              Keyingi →
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}

export default UsersPage;
