import React, { useState, useEffect } from "react";
import styles from "./index.module.scss";
import Card from "../../components/ui/Card";
import Table from "../../components/ui/Table";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import ChannelsService from "../../api/services/channelService";

/**
 * Kanallar sahifasi — ikki bo'lim:
 *   TEPADA: Majburiy obuna kanallari (qo'shilganlar) — tahrirlash/o'chirish
 *   PASTDA: Bot a'zo bo'lgan kanal/guruhlar — har qatorning o'ngida
 *           "Majburiy kanallarga qo'shish" tugmasi
 *
 * Qo'shishda kanal nomi ATAYLAB avtomatik yozilmaydi: bu yozuv botning
 * obuna tugmasida ko'rinadi, admin uni o'zi xohlagancha yozadi.
 */
function ChannelsPage() {
  const [channels, setChannels] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [available, setAvailable] = useState([]);
  const [isAvailableLoading, setIsAvailableLoading] = useState(false);

  // Tahrirlash oynasi (mavjud majburiy kanal uchun)
  const [editingChannel, setEditingChannel] = useState(null);

  // Qo'shish oynasi (pastdagi ro'yxatdan tanlangan chat uchun)
  const [addingChat, setAddingChat] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    join_type: "request",
    is_active: true,
    isPrivate: false,
  });

  const fetchChannels = async () => {
    setIsLoading(true);
    try {
      const res = await ChannelsService.getList();
      setChannels(res?.data || res || []);
    } catch (error) {
      console.error("Kanallarni yuklashda xatolik:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailable = async (refresh = true) => {
    setIsAvailableLoading(true);
    try {
      const res = await ChannelsService.getAvailable(refresh);
      setAvailable(res?.data || []);
    } catch (error) {
      console.error("Chatlar ro'yxatini olishda xatolik:", error);
      setAvailable([]);
    } finally {
      setIsAvailableLoading(false);
    }
  };

  useEffect(() => {
    fetchChannels();
    fetchAvailable(true);
  }, []);

  // ── Qo'shish: pastdagi ro'yxatdan tanlanadi, nom QO'LDA yoziladi ──
  const handleOpenAdd = (chat) => {
    setAddingChat(chat);
    setFormData({
      // Nom bo'sh — botdagi obuna tugmasida qanday yozuv tursa,
      // admin shuni o'zi yozadi
      name: "",
      join_type: "request",
      is_active: true,
      isPrivate: false,
    });
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      await ChannelsService.create({
        telegram_id: addingChat.telegram_id,
        ...formData,
      });
      setAddingChat(null);
      fetchChannels();
      fetchAvailable(false);
    } catch (error) {
      console.error("Qo'shishda xatolik:", error);
      alert("Xatolik: " + (error?.message || "Noma'lum xato"));
    }
  };

  // ── Tahrirlash (mavjud majburiy kanal) ──
  const handleOpenEdit = (channel) => {
    setEditingChannel(channel);
    setFormData({
      name: channel.name || "",
      join_type: channel.join_type || "request",
      is_active: channel.is_active ?? true,
      isPrivate: channel.isPrivate ?? false,
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await ChannelsService.update(editingChannel._id, formData);
      setEditingChannel(null);
      fetchChannels();
    } catch (error) {
      console.error("Saqlashda xatolik:", error);
      alert("Xatolik: " + (error?.message || "Noma'lum xato"));
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Rostdan ham bu kanalni majburiy obunadan olib tashlamoqchimisiz?")) {
      try {
        await ChannelsService.delete(id);
        fetchChannels();
        fetchAvailable(false);
      } catch (error) {
        console.error("O'chirishda xatolik:", error);
        alert("O'chirishda xatolik: " + (error?.message || "Noma'lum xato"));
      }
    }
  };

  const columns = [
    { title: "Tugmadagi yozuv", key: "name" },
    {
      title: "Telegram ID",
      key: "telegram_id",
      width: "180px"
    },
    {
      title: "Ulanish turi",
      key: "join_type",
      width: "130px",
      render: (val) => (
        <span className={val === "request" ? styles.badge_request : styles.badge_public}>
          {val === "request" ? "So'rovli" : "Ochiq"}
        </span>
      )
    },
    {
      title: "Havola",
      key: "invite_link",
      render: (val) => val
        ? <a href={val} target="_blank" rel="noreferrer" className={styles.link}>Havola</a>
        : "—"
    },
    {
      title: "Holat",
      key: "is_active",
      width: "90px",
      render: (val) => (
        <span className={val ? styles.badge_active : styles.badge_inactive}>
          {val ? "Faol" : "Nofaol"}
        </span>
      )
    },
    {
      title: "Amallar",
      key: "actions",
      width: "160px",
      render: (_, channel) => (
        <div className={styles.actions}>
          <Button variant="ghost" onClick={() => handleOpenEdit(channel)}>Tahrirlash</Button>
          <Button variant="danger" onClick={() => handleDelete(channel._id)}>O'chirish</Button>
        </div>
      )
    }
  ];

  // Ro'yxatda allaqachon majburiy bo'lganlarni belgilash uchun
  const addedIds = new Set(channels.map((c) => String(c.telegram_id)));

  return (
    <div className={styles.wrapper}>
      {/* ── TEPADA: majburiy obuna kanallari ── */}
      <Card>
        <div className={styles.toolbar}>
          <h3>Majburiy obuna kanallari</h3>
        </div>

        <Table
          columns={columns}
          data={channels}
          isLoading={isLoading}
        />
      </Card>

      {/* ── PASTDA: bot a'zo bo'lgan kanal/guruhlar ── */}
      <Card>
        <div className={styles.toolbar}>
          <h3>Bot a'zo bo'lgan kanal/guruhlar</h3>
          <button
            type="button"
            className={styles.refresh_btn}
            onClick={() => fetchAvailable(true)}
            disabled={isAvailableLoading}
          >
            {isAvailableLoading ? "Tekshirilmoqda..." : "🔄 Yangilash"}
          </button>
        </div>

        {isAvailableLoading && !available.length ? (
          <p className={styles.available_hint}>Telegramdan holat olinmoqda...</p>
        ) : available.length === 0 ? (
          <p className={styles.available_hint}>
            Ro'yxat bo'sh. Botni kanalga admin qilib qo'shing — u shu yerda
            o'zi paydo bo'ladi.
          </p>
        ) : (
          <div className={styles.available_rows}>
            {available.map((chat) => {
              const alreadyAdded = chat.already_added || addedIds.has(String(chat.telegram_id));
              return (
                <div key={chat.telegram_id} className={styles.available_row}>
                  <div className={styles.row_info}>
                    <span className={styles.available_title}>
                      {chat.title || "(nomsiz)"}
                      {chat.username && <span className={styles.available_user}> @{chat.username}</span>}
                    </span>
                    <span className={styles.available_meta}>
                      <code>{chat.telegram_id}</code>
                      <span className={chat.is_admin ? styles.badge_admin : styles.badge_member}>
                        {chat.is_admin ? "admin" : (chat.bot_status || "a'zo")}
                      </span>
                      {chat.member_count != null && <span>{chat.member_count} a'zo</span>}
                    </span>
                  </div>

                  {alreadyAdded ? (
                    <span className={styles.badge_added}>✓ Majburiy obunada</span>
                  ) : (
                    <Button
                      variant="primary"
                      disabled={!chat.is_admin}
                      title={chat.is_admin ? "" : "Bot bu kanalda admin emas"}
                      onClick={() => handleOpenAdd(chat)}
                    >
                      + Majburiy kanallarga qo'shish
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* ── Qo'shish oynasi ── */}
      <Modal
        isOpen={!!addingChat}
        onClose={() => setAddingChat(null)}
        title="Majburiy kanallarga qo'shish"
      >
        {addingChat && (
          <form onSubmit={handleAddSubmit} className={styles.form}>
            <div className={styles.selected_chat}>
              <span className={styles.available_title}>{addingChat.title || "(nomsiz)"}</span>
              <code>{addingChat.telegram_id}</code>
            </div>

            <Input
              label="Tugmadagi yozuv"
              required
              autoFocus
              placeholder="Masalan: Bizning kanal 🎬"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <p className={styles.field_hint}>
              Bot obuna so'raganda tugmada aynan shu yozuv ko'rinadi.
            </p>

            <div className={styles.select_wrapper}>
              <label>Ulanish turi</label>
              <select
                className={styles.select}
                value={formData.join_type}
                onChange={(e) => setFormData({ ...formData, join_type: e.target.value })}
              >
                <option value="request">So'rovli (obuna talab qilinadi)</option>
                <option value="public">Ochiq (to'g'ridan-to'g'ri)</option>
              </select>
            </div>

            <div className={styles.checkbox_row}>
              <label className={styles.checkbox_label}>
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                />
                <span>Faol holat</span>
              </label>
              <label className={styles.checkbox_label}>
                <input
                  type="checkbox"
                  checked={formData.isPrivate}
                  onChange={(e) => setFormData({ ...formData, isPrivate: e.target.checked })}
                />
                <span>Maxfiy kanal</span>
              </label>
            </div>

            <div className={styles.modal_actions}>
              <Button type="button" variant="ghost" onClick={() => setAddingChat(null)}>Bekor qilish</Button>
              <Button type="submit" variant="primary">Qo'shish</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ── Tahrirlash oynasi ── */}
      <Modal
        isOpen={!!editingChannel}
        onClose={() => setEditingChannel(null)}
        title="Kanalni tahrirlash"
      >
        <form onSubmit={handleEditSubmit} className={styles.form}>
          <Input
            label="Tugmadagi yozuv"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />

          <div className={styles.select_wrapper}>
            <label>Ulanish turi</label>
            <select
              className={styles.select}
              value={formData.join_type}
              onChange={(e) => setFormData({ ...formData, join_type: e.target.value })}
            >
              <option value="request">So'rovli (obuna talab qilinadi)</option>
              <option value="public">Ochiq (to'g'ridan-to'g'ri)</option>
            </select>
          </div>

          <div className={styles.checkbox_row}>
            <label className={styles.checkbox_label}>
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              />
              <span>Faol holat</span>
            </label>
            <label className={styles.checkbox_label}>
              <input
                type="checkbox"
                checked={formData.isPrivate}
                onChange={(e) => setFormData({ ...formData, isPrivate: e.target.checked })}
              />
              <span>Maxfiy kanal</span>
            </label>
          </div>

          <div className={styles.modal_actions}>
            <Button type="button" variant="ghost" onClick={() => setEditingChannel(null)}>Bekor qilish</Button>
            <Button type="submit" variant="primary">Saqlash</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default ChannelsPage;
