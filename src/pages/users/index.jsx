import { useState, useEffect } from "react";
import { TbRefresh, TbUserCheck, TbUsers } from "react-icons/tb";
import styles from "./index.module.scss";
import { Badge, Card, ErrorBox, PageHead, Pagination, Stat, Table } from "../../components/ui";
import { num, time } from "../../utils/format";
import UsersService from "../../api/services/usersService";

/**
 * Bot foydalanuvchilari — ro'yxat va obuna holati.
 *
 * Jami son ilgari jadval ustidagi kichik kulrang yozuv edi va ko'zga
 * tashlanmasdi. Endi u Stat kartochkasi: sahifaning eng muhim raqami
 * eng katta shrift bilan turadi.
 */
function UsersPage() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalDocs, setTotalDocs] = useState(0);

  const fetchUsers = async (page = 1) => {
    setIsLoading(true);
    setError(null);
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
      setError(error);
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
      width: "150px",
      render: (val) => <span className={styles.tg_id}>{val}</span>
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
        if (!val || val.length === 0) return <Badge tone="danger">Yo'q</Badge>;
        const allSubscribed = val.every(c => c.is_member);
        return allSubscribed
          ? <Badge tone="ok">Obunachi</Badge>
          : <Badge tone="danger">Obuna emas</Badge>;
      }
    },
    {
      title: "Qo'shilgan sana",
      key: "createdAt",
      render: (val) => time(val)
    }
  ];

  // Shu sahifadagi to'liq obunachilar — jadvalga qarab sanashning
  // o'rniga bir qarashda ko'rinadigan raqam
  const subscribed = users.filter(
    (u) => u.channels_condition?.length && u.channels_condition.every((c) => c.is_member)
  ).length;

  return (
    <>
      <PageHead>
        <button type="button" className="btn ghost sm" onClick={() => fetchUsers(currentPage)}>
          <TbRefresh size={14} /> Yangilash
        </button>
      </PageHead>

      <ErrorBox error={error} onRetry={() => fetchUsers(currentPage)} />

      <div className="grid c2">
        <Stat
          icon={TbUsers}
          label="Jami foydalanuvchilar"
          value={num(totalDocs)}
          sub="botdan foydalanganlar"
        />
        <Stat
          icon={TbUserCheck}
          label="To'liq obunachilar"
          value={num(subscribed)}
          sub={`shu sahifadagi ${num(users.length)} tadan`}
          tone="ok"
        />
      </div>

      <Card title="Bot foydalanuvchilari" icon={TbUsers}>
        <Table
          columns={columns}
          data={users}
          isLoading={isLoading}
          empty="Foydalanuvchilar topilmadi"
        />

        <Pagination page={currentPage} totalPages={totalPages} onChange={fetchUsers} />
      </Card>
    </>
  );
}

export default UsersPage;
