import { useCallback, useEffect, useState } from "react";
import { TbCheck, TbPencil, TbPlus, TbRefresh, TbSpeakerphone, TbTrash, TbUsersGroup } from "react-icons/tb";
import styles from "./index.module.scss";
import client from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import { Badge, Button, Card, Empty, ErrorBox, Loading, Modal, PageHead, Select, Switch } from "../../components/ui";
import { useBusy } from "../../hooks/useBusy";
import { num } from "../../utils/format";

const JOIN_TYPES = [
  { value: "request", label: "Soʻrovli (obuna talab qilinadi)" },
  { value: "public", label: "Ochiq (toʻgʻridan-toʻgʻri)" },
];

const EMPTY_FORM = { name: "", join_type: "request", is_active: true, isPrivate: false };

/**
 * Kanallar sahifasi — ikki bo'lim:
 *   TEPADA: majburiy obuna kanallari (qo'shilganlar) — tahrirlash/o'chirish
 *   PASTDA: bot a'zo bo'lgan kanal/guruhlar — har qatorning o'ngida
 *           "Majburiy kanallarga qo'shish" tugmasi
 *
 * Qo'shishda kanal nomi ATAYLAB avtomatik yozilmaydi: bu yozuv botning
 * obuna tugmasida ko'rinadi, admin uni o'zi xohlagancha yozadi.
 */
export default function Channels() {
  const [channels, setChannels] = useState(null);
  const [error, setError] = useState(null);

  const [available, setAvailable] = useState([]);
  const [availableLoading, setAvailableLoading] = useState(false);
  const [availableError, setAvailableError] = useState(null);

  // Qo'shish oynasi (pastdagi ro'yxatdan tanlangan chat uchun)
  const [addingChat, setAddingChat] = useState(null);
  // Tahrirlash oynasi (mavjud majburiy kanal uchun)
  const [editingChannel, setEditingChannel] = useState(null);

  const [refreshing, runRefresh] = useBusy();
  // Qaysi kanal o'chirilmoqda — faqat o'sha qatordagi tugma aylanadi
  const [removingId, setRemovingId] = useState(null);

  const loadChannels = useCallback(async () => {
    try {
      const res = await client.get(ENDPOINTS.CHANNELS.LIST);
      setChannels(Array.isArray(res?.data) ? res.data : []);
      setError(null);
    } catch (e) {
      setError(e);
    }
  }, []);

  /** refresh=true — Telegramdan har chatning joriy holati qayta so'raladi */
  const loadAvailable = useCallback(async (refresh = true) => {
    setAvailableLoading(true);
    try {
      const res = await client.get(ENDPOINTS.CHANNELS.AVAILABLE, { params: { refresh: String(refresh) } });
      setAvailable(Array.isArray(res?.data) ? res.data : []);
      setAvailableError(null);
    } catch (e) {
      setAvailableError(e);
    } finally {
      setAvailableLoading(false);
    }
  }, []);

  useEffect(() => {
    loadChannels();
    loadAvailable(true);
  }, [loadChannels, loadAvailable]);

  const afterChange = () => Promise.all([loadChannels(), loadAvailable(false)]);

  const remove = async (channel) => {
    if (!window.confirm("Rostdan ham bu kanalni majburiy obunadan olib tashlamoqchimisiz?")) return;
    setRemovingId(channel._id);
    try {
      await client.delete(ENDPOINTS.CHANNELS.ITEM(channel._id));
      await afterChange();
    } catch (e) {
      setError(e);
    } finally {
      setRemovingId(null);
    }
  };

  if (!channels && !error) return <Loading rows={4} />;

  const list = channels || [];
  // Ro'yxatda allaqachon majburiy bo'lganlarni belgilash uchun
  const addedIds = new Set(list.map((c) => String(c.telegram_id)));

  return (
    <>
      <PageHead>
        <Button
          variant="ghost"
          size="sm"
          icon={TbRefresh}
          busy={refreshing}
          busyText="Yangilanmoqda…"
          onClick={() => runRefresh(afterChange)}
        >
          Yangilash
        </Button>
      </PageHead>

      <ErrorBox error={error} onRetry={loadChannels} />

      {/* ── TEPADA: majburiy obuna kanallari ── */}
      <Card title="Majburiy obuna kanallari" icon={TbSpeakerphone} actions={<Badge>{num(list.length)} ta</Badge>}>
        {list.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Tugmadagi yozuv</th>
                  <th>Telegram ID</th>
                  <th>Ulanish turi</th>
                  <th>Havola</th>
                  <th>Holat</th>
                  <th className="num">Amallar</th>
                </tr>
              </thead>
              <tbody>
                {list.map((ch) => (
                  <tr key={ch._id}>
                    <td className={styles.name}>{ch.name}</td>
                    <td className="mono">{ch.telegram_id}</td>
                    <td>
                      <Badge tone={ch.join_type === "request" ? "info" : ""}>
                        {ch.join_type === "request" ? "Soʻrovli" : "Ochiq"}
                      </Badge>
                    </td>
                    <td>
                      {ch.invite_link ? (
                        <a className="link" href={ch.invite_link} target="_blank" rel="noreferrer">
                          Havola
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      <Badge tone={ch.is_active ? "ok" : "danger"}>{ch.is_active ? "Faol" : "Nofaol"}</Badge>
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <button type="button" className="btn ghost sm" onClick={() => setEditingChannel(ch)}>
                          <TbPencil size={13} /> Tahrirlash
                        </button>
                        <Button
                          variant="danger"
                          size="sm"
                          icon={TbTrash}
                          busy={removingId === ch._id}
                          busyText="Oʻchirilmoqda…"
                          disabled={Boolean(removingId) && removingId !== ch._id}
                          onClick={() => remove(ch)}
                        >
                          Oʻchirish
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty icon={TbSpeakerphone}>Hali majburiy kanal yoʻq — pastdagi roʻyxatdan qoʻshing</Empty>
        )}
      </Card>

      {/* ── PASTDA: bot a'zo bo'lgan kanal/guruhlar ── */}
      <Card
        title="Bot aʼzo boʻlgan kanal/guruhlar"
        icon={TbUsersGroup}
        actions={
          <Button
            variant="ghost"
            size="sm"
            icon={TbRefresh}
            busy={availableLoading}
            busyText="Telegramdan tekshirilmoqda…"
            onClick={() => loadAvailable(true)}
          >
            Yangilash
          </Button>
        }
      >
        <ErrorBox error={availableError} onRetry={() => loadAvailable(true)} />

        {availableLoading && !available.length ? (
          <p className="hint">Telegramdan holat olinmoqda…</p>
        ) : available.length === 0 ? (
          <Empty icon={TbUsersGroup}>
            Roʻyxat boʻsh. Botni kanalga admin qilib qoʻshing — u shu yerda oʻzi paydo boʻladi.
          </Empty>
        ) : (
          <div className={`${styles.rows} anim-stagger loading-dim`} data-busy={availableLoading || undefined}>
            {available.map((chat, i) => {
              const alreadyAdded = chat.already_added || addedIds.has(String(chat.telegram_id));
              return (
                <div key={chat.telegram_id} className={styles.row} style={{ "--i": i }}>
                  <div className={styles.rowInfo}>
                    <span className={styles.rowTitle}>
                      {chat.title || "(nomsiz)"}
                      {chat.username && <span className={styles.rowUser}> @{chat.username}</span>}
                    </span>
                    <span className={styles.rowMeta}>
                      <span className="mono">{chat.telegram_id}</span>
                      <Badge tone={chat.is_admin ? "ok" : "warn"}>
                        {chat.is_admin ? "admin" : chat.bot_status || "aʼzo"}
                      </Badge>
                      {chat.member_count != null && <span>{num(chat.member_count)} aʼzo</span>}
                    </span>
                  </div>

                  {alreadyAdded ? (
                    <Badge tone="ok">
                      <TbCheck size={12} /> Majburiy obunada
                    </Badge>
                  ) : (
                    <button
                      type="button"
                      className="btn sm"
                      disabled={!chat.is_admin}
                      title={chat.is_admin ? "" : "Bot bu kanalda admin emas"}
                      onClick={() => setAddingChat(chat)}
                    >
                      <TbPlus size={14} /> Majburiy kanallarga qoʻshish
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {addingChat && (
        <ChannelFormModal
          title="Majburiy kanallarga qoʻshish"
          chat={addingChat}
          initial={EMPTY_FORM}
          submitLabel="Qoʻshish"
          busyLabel="Qoʻshilmoqda…"
          onClose={() => setAddingChat(null)}
          onSubmit={async (form) => {
            await client.post(ENDPOINTS.CHANNELS.CREATE, { telegram_id: addingChat.telegram_id, ...form });
            setAddingChat(null);
            afterChange();
          }}
        />
      )}

      {editingChannel && (
        <ChannelFormModal
          title="Kanalni tahrirlash"
          initial={{
            name: editingChannel.name || "",
            join_type: editingChannel.join_type || "request",
            is_active: editingChannel.is_active ?? true,
            isPrivate: editingChannel.isPrivate ?? false,
          }}
          submitLabel="Saqlash"
          onClose={() => setEditingChannel(null)}
          onSubmit={async (form) => {
            await client.put(ENDPOINTS.CHANNELS.ITEM(editingChannel._id), form);
            setEditingChannel(null);
            loadChannels();
          }}
        />
      )}
    </>
  );
}

/* ── Qo'shish va tahrirlash oynasi (maydonlari bir xil) ───── */
function ChannelFormModal({ title, chat, initial, submitLabel, busyLabel = "Saqlanmoqda…", onClose, onSubmit }) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e?.preventDefault();
    if (!form.name.trim()) return setError(new Error("Tugmadagi yozuvni kiriting"));
    setSaving(true);
    setError(null);
    try {
      await onSubmit({ ...form, name: form.name.trim() });
    } catch (err) {
      // Oyna yopilmaydi — yozilgan narsa yo'qolmasin
      setError(err);
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      title={title}
      onClose={onClose}
      actions={
        <>
          <span className="spacer" />
          <button type="button" className="btn ghost sm" onClick={onClose}>
            Bekor qilish
          </button>
          <Button onClick={submit} busy={saving} busyText={busyLabel}>
            {submitLabel}
          </Button>
        </>
      }
    >
      <form onSubmit={submit}>
        <ErrorBox error={error} />

        {chat && (
          <div className={styles.selected}>
            <span className={styles.rowTitle}>{chat.title || "(nomsiz)"}</span>
            <span className="mono">{chat.telegram_id}</span>
          </div>
        )}

        <label className="field">
          <span>Tugmadagi yozuv</span>
          <input
            type="text"
            required
            autoFocus
            placeholder="Masalan: Bizning kanal 🎬"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <small>Bot obuna soʻraganda tugmada aynan shu yozuv koʻrinadi.</small>
        </label>

        <div className="field">
          <span>Ulanish turi</span>
          <Select
            ariaLabel="Ulanish turi"
            options={JOIN_TYPES}
            value={form.join_type}
            onChange={(v) => setForm({ ...form, join_type: v })}
          />
        </div>

        <Switch
          checked={form.is_active}
          onChange={(v) => setForm({ ...form, is_active: v })}
          label="Faol holat"
        />
        <Switch
          checked={form.isPrivate}
          onChange={(v) => setForm({ ...form, isPrivate: v })}
          label="Maxfiy kanal"
        />
      </form>
    </Modal>
  );
}
