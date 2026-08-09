import React, { useState } from "react";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Modal from "../../../components/ui/Modal";
import EpisodeService from "../../../api/services/episodeService";
import styles from "../index.module.scss";

function AddEpisodeModal({ film, onClose, onSuccess }) {
  const [isSaving, setIsSaving] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiNotice, setAiNotice] = useState(null);
  const [formData, setFormData] = useState({
    code: "",
    episodeNumber: "",
    name: "",
    description: "",
    videoChannelId: "",
    videoMsgId: "",
    caption: "",
    releaseYear: film?.year || "",
    country: film?.country || "",
    genres: (film?.genres || []).join(", ")
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const fd = new FormData();
      fd.append("filmId", film._id);
      fd.append("code", formData.code);
      fd.append("episodeNumber", formData.episodeNumber);
      fd.append("name", formData.name);
      if (formData.description) fd.append("description", formData.description);
      if (formData.caption) fd.append("caption", formData.caption);
      if (formData.releaseYear) fd.append("releaseYear", formData.releaseYear);
      if (formData.country) fd.append("country", formData.country);

      // Genres vergul bilan ajratilgan string sifatida yuboriladi
      formData.genres.split(",").map(g => g.trim()).filter(Boolean)
        .forEach(genre => fd.append("genres[]", genre));

      // videoFileId JSON sifatida yuboriladi — backend normalizeMediaId parse qiladi
      fd.append("videoFileId", JSON.stringify({
        channelId: formData.videoChannelId,
        msgId: Number(formData.videoMsgId)
      }));

      await EpisodeService.create(fd);
      onSuccess();
      onClose();
    } catch (error) {
      alert("Xatolik: " + (error?.message || "Noma'lum xato"));
    } finally {
      setIsSaving(false);
    }
  };

  const update = (field) => (e) => setFormData({ ...formData, [field]: e.target.value });

  // Qism nomi, tavsifi va bo'sh kodni AI to'ldiradi.
  // Serial ma'lumoti (nomi, yili, davlati) backendda filmId bo'yicha olinadi.
  const handleAiFill = async () => {
    setIsAiLoading(true);
    setAiNotice(null);
    try {
      const res = await EpisodeService.aiSuggest({
        filmId: film._id,
        episodeNumber: Number(formData.episodeNumber) || 1,
      });

      const ep = res?.data?.episode;
      if (!ep) throw new Error("AI javob qaytarmadi");

      setFormData((prev) => ({
        ...prev,
        code: ep.code ?? prev.code,
        name: ep.name || prev.name,
        description: ep.description || prev.description,
      }));

      setAiNotice(
        ep.found
          ? { type: "ok", text: "To'ldirildi. Matnni o'qib chiqing." }
          : { type: "warn", text: "AI bu qismni aniq tanimadi — matn taxminiy, tekshiring." }
      );
    } catch (error) {
      setAiNotice({ type: "error", text: "AI xatosi: " + (error?.message || "Noma'lum xato") });
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={`"${film?.name}" ga qism qo'shish`}>
      <form onSubmit={handleSubmit} className={styles.ep_edit_form}>
        <div className={styles.grid_2}>
          <Input
            label="Qism raqami"
            type="number"
            required
            value={formData.episodeNumber}
            onChange={update("episodeNumber")}
          />
          <Input
            label="Qism kodi"
            type="number"
            required
            value={formData.code}
            onChange={update("code")}
          />
        </div>

        <Input
          label="Qism nomi"
          required
          value={formData.name}
          onChange={update("name")}
        />

        <div className={styles.ai_row}>
          <Button type="button" variant="ghost" onClick={handleAiFill} disabled={isAiLoading}>
            {isAiLoading ? "AI o'ylayapti..." : "✨ AI bilan to'ldirish"}
          </Button>
          {aiNotice && (
            <span className={`${styles.ai_notice} ${styles["ai_" + aiNotice.type]}`}>
              {aiNotice.text}
            </span>
          )}
        </div>

        <p className={styles.section_label}>Video fayl (Telegram)</p>
        <div className={styles.grid_2}>
          <Input
            label="Kanal ID"
            required
            placeholder="Masalan: 3831468244"
            value={formData.videoChannelId}
            onChange={update("videoChannelId")}
          />
          <Input
            label="Xabar ID (msgId)"
            type="number"
            required
            placeholder="Masalan: 42"
            value={formData.videoMsgId}
            onChange={update("videoMsgId")}
          />
        </div>

        <div className={styles.grid_2}>
          <Input
            label="Chiqgan yili"
            type="number"
            value={formData.releaseYear}
            onChange={update("releaseYear")}
          />
          <Input
            label="Mamlakat"
            value={formData.country}
            onChange={update("country")}
          />
        </div>

        <Input
          label="Janrlar (vergul bilan)"
          value={formData.genres}
          onChange={update("genres")}
        />

        <div className={styles.textarea_wrapper}>
          <label>Ta'rif</label>
          <textarea
            rows={3}
            value={formData.description}
            onChange={update("description")}
          />
        </div>

        <Input
          label="Caption (Instagram uchun)"
          value={formData.caption}
          onChange={update("caption")}
        />

        <div className={styles.modal_actions}>
          <Button type="button" variant="ghost" onClick={onClose}>Bekor qilish</Button>
          <Button type="submit" variant="primary" loading={isSaving}>
            {isSaving ? "Saqlanmoqda..." : "Qo'shish"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default AddEpisodeModal;
