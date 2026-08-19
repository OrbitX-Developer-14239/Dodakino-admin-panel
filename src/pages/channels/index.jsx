import React, { useState, useEffect } from "react";
import styles from "./index.module.scss";
import Card from "../../components/ui/Card";
import Table from "../../components/ui/Table";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import ChannelsService from "../../api/services/channelService";

function ChannelsPage() {
  const [channels, setChannels] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingChannel, setEditingChannel] = useState(null);

  // Yaratish uchun forma (Backend: telegram_id, name, join_type, is_active, isPrivate)
  const [formData, setFormData] = useState({
    name: "",
    telegram_id: "",
    join_type: "request",
    is_active: true,
    isPrivate: false
  });

  // Bot a'zo bo'lgan chatlar — yangi kanal shu ro'yxatdan tanlanadi
  const [available, setAvailable] = useState([]);
  const [isAvailableLoading, setIsAvailableLoading] = useState(false);

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

  const fetchChannels = async () => {
    setIsLoading(true);
    try {
      const res = await ChannelsService.getList();
      // Backend: { success: true, data: [...] }
      setChannels(res?.data || res || []);
    } catch (error) {
      console.error("Kanallarni yuklashda xatolik:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchChannels();
  }, []);

  const handleOpenModal = (channel = null) => {
    if (channel) {
      setEditingChannel(channel);
      setFormData({
        name: channel.name || "",
        telegram_id: channel.telegram_id || "",
        join_type: channel.join_type || "request",
        is_active: channel.is_active ?? true,
        isPrivate: channel.isPrivate ?? false
      });
    } else {
      setEditingChannel(null);
      setFormData({
        name: "",
        telegram_id: "",
        join_type: "request",
        is_active: true,
        isPrivate: false
      });
      // Yangi kanal qo'shilayotganda ro'yxatni yangilab olamiz
      fetchAvailable(true);
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingChannel) {
        // Tahrirlash — faqat name, join_type, is_active, isPrivate yuboriladi
        const updatePayload = {
          name: formData.name,
          join_type: formData.join_type,
          is_active: formData.is_active,
          isPrivate: formData.isPrivate
        };
        await ChannelsService.update(editingChannel._id, updatePayload);
      } else {
        // Yaratish — telegram_id va name majburiy
        await ChannelsService.create(formData);
      }
      setIsModalOpen(false);
      fetchChannels();
    } catch (error) {
      console.error("Saqlashda xatolik:", error);
      alert("Xatolik: " + (error?.message || "Noma'lum xato"));
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Rostdan ham bu kanalni o'chirmoqchimisiz?")) {
      try {
        await ChannelsService.delete(id);
        fetchChannels();
      } catch (error) {
        console.error("O'chirishda xatolik:", error);
        alert("O'chirishda xatolik: " + (error?.message || "Noma'lum xato"));
      }
    }
  };

  const columns = [
    { title: "Nomi", key: "name" },
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
          <Button variant="ghost" onClick={() => handleOpenModal(channel)}>Tahrirlash</Button>
          <Button variant="danger" onClick={() => handleDelete(channel._id)}>O'chirish</Button>
        </div>
      )
    }
  ];

  return (
    <div className={styles.wrapper}>
      <Card>
        <div className={styles.toolbar}>
          <h3>Majburiy Obuna Kanallari</h3>
          <Button variant="primary" onClick={() => handleOpenModal()}>+ Kanal qo'shish</Button>
        </div>

        <Table 
          columns={columns} 
          data={channels} 
          isLoading={isLoading} 
        />
      </Card>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title={editingChannel ? "Kanalni tahrirlash" : "Yangi kanal qo'shish"}
      >
        <form onSubmit={handleSubmit} className={styles.form}>
          <Input 
            label="Kanal nomi" 
            required 
            value={formData.name} 
            onChange={(e) => setFormData({...formData, name: e.target.value})} 
          />

          {/* Telegram ID faqat yaratishda talab qilinadi.
              Bot a'zo bo'lgan chatlar ro'yxatidan tanlanadi; qo'lda yozish ham mumkin. */}
          {!editingChannel && (
            <div className={styles.select_wrapper}>
              <div className={styles.available_head}>
                <label>Bot a'zo bo'lgan kanal/guruhlar</label>
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
                  o'zi paydo bo'ladi. Yoki ID ni pastga qo'lda yozing.
                </p>
              ) : (
                <div className={styles.available_list}>
                  {available.map((chat) => (
                    <button
                      key={chat.telegram_id}
                      type="button"
                      disabled={chat.already_added || !chat.is_admin}
                      className={`${styles.available_item} ${formData.telegram_id === chat.telegram_id ? styles.available_item_active : ""}`}
                      onClick={() => setFormData({
                        ...formData,
                        telegram_id: chat.telegram_id,
                        name: formData.name || chat.title || "",
                      })}
                    >
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
                        {chat.already_added && <span className={styles.badge_added}>qo'shilgan</span>}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              <Input
                label="Kanal Telegram ID"
                required
                placeholder="-1001234567890"
                value={formData.telegram_id}
                onChange={(e) => setFormData({ ...formData, telegram_id: e.target.value })}
              />
            </div>
          )}

          <div className={styles.select_wrapper}>
            <label>Ulanish turi</label>
            <select
              className={styles.select}
              value={formData.join_type}
              onChange={(e) => setFormData({...formData, join_type: e.target.value})}
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
                onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
              />
              <span>Faol holat</span>
            </label>
            <label className={styles.checkbox_label}>
              <input
                type="checkbox"
                checked={formData.isPrivate}
                onChange={(e) => setFormData({...formData, isPrivate: e.target.checked})}
              />
              <span>Maxfiy kanal</span>
            </label>
          </div>

          <div className={styles.modal_actions}>
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Bekor qilish</Button>
            <Button type="submit" variant="primary">Saqlash</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default ChannelsPage;
