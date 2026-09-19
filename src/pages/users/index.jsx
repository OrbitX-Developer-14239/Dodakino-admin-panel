import { useCallback, useEffect, useRef, useState } from "react";
import { TbRefresh, TbUsers } from "react-icons/tb";
import styles from "./index.module.scss";
import client from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import {
  Badge,
  Card,
  Empty,
  ErrorBox,
  Loading,
  PageHead,
  Pagination,
  Segmented,
  Select,
  Stat,
} from "../../components/ui";
import { num, time } from "../../utils/format";

const ALL = "all";

const STATUS_OPTIONS = [
  { value: ALL, label: "Hammasi" },
  { value: "true", label: "Obunachi" },
  { value: "false", label: "Obuna emas" },
];

const PAGE_SIZE = 50;

const percent = (part, whole) => (whole ? `${Math.round((part / whole) * 100)}%` : "0%");

/**
 * Bot foydalanuvchilari — ro'yxat va obuna holati.
 *
 * Kanal tanlanganda obuna holati (filtr, belgi va kartochkalar) faqat
 * SHU kanal bo'yicha hisoblanadi; tanlanmaganda — barcha majburiy
 * kanallarga a'zolik bo'yicha. Kartochkalardagi sonlar serverdan
 * keladi va butun bazani qamraydi, ochiq sahifadagi 50 tani emas.
 */
export default function UsersPage() {
  const [data, setData] = useState(null);
  const [channels, setChannels] = useState([]);
  const [channel, setChannel] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [page, setPage] = useState(1);
  const [error, setError] = useState(null);

  // Filtr tez almashtirilganda eskirgan javob yangisining ustiga yozilmasin
  const requestId = useRef(0);

  const load = useCallback(
    async (silent = false) => {
      const id = ++requestId.current;
      try {
        const params = { page, limit: PAGE_SIZE };
        if (channel !== ALL) params.channel_id = channel;
        if (status !== ALL) params.is_subscribed = status;

        const res = await client.get(ENDPOINTS.USERS, { params, silent });
        if (id !== requestId.current) return;
        setData(res?.data || null);
        setError(null);
      } catch (e) {
        if (id === requestId.current) setError(e);
      }
    },
    [page, channel, status]
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    client
      .get(ENDPOINTS.CHANNELS.LIST, { silent: true })
      .then((res) => setChannels(Array.isArray(res?.data) ? res.data : []))
      .catch(() => {});
  }, []);

  // Filtr o'zgarsa birinchi sahifaga qaytamiz — 7-sahifada qolib,
  // "hech narsa topilmadi" ko'rib o'tirish ma'nosiz
  const changeChannel = (v) => {
    setChannel(v);
    setPage(1);
  };
  const changeStatus = (v) => {
    setStatus(v);
    setPage(1);
  };

  const selected = channels.find((c) => String(c.telegram_id) === channel);
  const counts = data?.counts;
  const users = data?.users || [];

  // Kanal nomi odatda "kanal" so'zini o'zi o'z ichiga oladi ("1-kanal") —
  // "1-kanal kanaliga" bo'lib qolmasligi uchun nom alohida yoziladi
  const scope = (member) =>
    selected ? selected.name : `barcha kanallarga ${member ? "aʼzo" : "aʼzo emas"}`;

  const isSubscribed = (u) => {
    const list = Array.isArray(u.channels_condition) ? u.channels_condition : [];
    return selected
      ? list.some((c) => String(c.telegram_id) === channel && c.is_member)
      : list.length > 0 && list.every((c) => c.is_member);
  };

  const channelOptions = [
    { value: ALL, label: "Barcha kanallar" },
    ...channels.map((c) => ({ value: String(c.telegram_id), label: c.name || String(c.telegram_id) })),
  ];

  if (!data && !error) return <Loading rows={5} />;

  return (
    <>
      <PageHead>
        <button type="button" className="btn ghost sm" onClick={() => load()}>
          <TbRefresh size={14} /> Yangilash
        </button>
      </PageHead>

      <ErrorBox error={error} onRetry={() => load()} />

      <div className="grid c3">
        <Stat label="Jami foydalanuvchilar" value={num(counts?.all)} sub="botdan foydalanganlar" />
        <Stat
          label="Obunachilar"
          value={num(counts?.subscribed)}
          sub={`${scope(true)} · ${percent(counts?.subscribed, counts?.all)}`}
          tone="ok"
        />
        <Stat
          label="Obuna emas"
          value={num(counts?.unsubscribed)}
          sub={`${scope(false)} · ${percent(counts?.unsubscribed, counts?.all)}`}
          tone="danger"
        />
      </div>

      <Card title="Bot foydalanuvchilari" icon={TbUsers}>
        <div className={styles.filters}>
          {channels.length > 0 &&
            (channels.length <= 3 ? (
              <Segmented label="Kanal" options={channelOptions} value={channel} onChange={changeChannel} />
            ) : (
              // Kanal ko'p bo'lsa kapsula sig'maydi — ro'yxat
              <Select
                className={styles.channelSelect}
                size="sm"
                ariaLabel="Kanal"
                options={channelOptions}
                value={channel}
                onChange={changeChannel}
              />
            ))}
          <Segmented label="Obuna holati" options={STATUS_OPTIONS} value={status} onChange={changeStatus} />
          <span className="spacer" />
          <span className="hint">{num(data?.totalDocs)} ta</span>
        </div>

        {users.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Telegram ID</th>
                  <th>Ism</th>
                  <th>Username</th>
                  <th>{selected ? `${selected.name} holati` : "Obuna holati"}</th>
                  <th>Qoʻshilgan</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id || u.telegram_id}>
                    <td className="mono">{u.telegram_id}</td>
                    <td>{u.first_name || "—"}</td>
                    <td>{u.username ? `@${u.username}` : "—"}</td>
                    <td>
                      {isSubscribed(u) ? (
                        <Badge tone="ok">obunachi</Badge>
                      ) : (
                        <Badge tone="danger">obuna emas</Badge>
                      )}
                    </td>
                    <td className={styles.date}>{time(u.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty icon={TbUsers}>Bu filtr boʻyicha foydalanuvchi topilmadi</Empty>
        )}

        <Pagination page={data?.page || page} totalPages={data?.totalPages} onChange={setPage} />
      </Card>
    </>
  );
}
