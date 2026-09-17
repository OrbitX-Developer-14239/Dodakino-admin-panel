import React, { useState } from "react";
import { Button, Input, Modal } from "../../../components/ui";
import EpisodeService from "../../../api/services/episodeService";
import styles from "../index.module.scss";

/**
 * Qism tafsilotlari.
 *
 * Oyna ota komponentda shartli render qilinadi (`{selectedEpisode && ...}`).
 * Agar yopish to'g'ridan-to'g'ri ota onClose ni chaqirsa, oyna DOM dan
 * darhol olib tashlanib, yopilish animatsiyasi ko'rinmasdi. Shuning uchun
 * yopish avval shu yerdagi `open` ni o'chiradi, Modal animatsiyani
 * ko'rsatadi va tugagach onExited orqali ota xabardor qilinadi.
 */
function EpisodeDetailModal({ episode, onClose, onUpdate }) {
  const [open, setOpen] = useState(true);
  const close = () => setOpen(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState({
    code: episode?.code || "",
    episodeNumber: episode?.episodeNumber || "",
    season: String(episode?.season || 1),
    name: episode?.name || "",
    description: episode?.description || "",
    releaseYear: episode?.releaseYear || "",
    country: episode?.country || "",
    genres: (episode?.genres || []).join(", ")
  });

  if (!episode) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        code: Number(formData.code),
        episodeNumber: Number(formData.episodeNumber),
        season: Number(formData.season) || 1,
        releaseYear: formData.releaseYear ? Number(formData.releaseYear) : undefined,
        genres: formData.genres.split(",").map(g => g.trim()).filter(Boolean)
      };
      await EpisodeService.update(episode.episodeId, payload);
      onUpdate();
      setIsEditing(false);
      close();
    } catch (error) {
      alert("Xatolik: " + (error?.message || "Noma'lum xato"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    const ok = window.confirm(
      `"${episode.episodeNumber}-qism: ${episode.name}" o'chirilsinmi?\n\n` +
      `Bu amalni ortga qaytarib bo'lmaydi. Telegram kanalidagi video o'chmaydi.`
    );
    if (!ok) return;

    setIsDeleting(true);
    try {
      await EpisodeService.delete(episode.episodeId);
      onUpdate();
      close();
    } catch (error) {
      alert("O'chirishda xatolik: " + (error?.message || "Noma'lum xato"));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={close}
      onExited={onClose}
      title={`${episode.episodeNumber}-qism: ${episode.name}`}
    >
      <div className={styles.episode_detail}>
        {!isEditing ? (
          <>
            <div className={styles.film_meta_grid}>
              <div className={styles.meta_item}>
                <span className={styles.meta_label}>Qism raqami</span>
                <span className={styles.meta_value}>{episode.episodeNumber}</span>
              </div>
              <div className={styles.meta_item}>
                <span className={styles.meta_label}>Kod</span>
                <span className={styles.meta_value}>{episode.code}</span>
              </div>
              {episode.releaseYear && (
                <div className={styles.meta_item}>
                  <span className={styles.meta_label}>Chiqgan yili</span>
                  <span className={styles.meta_value}>{episode.releaseYear}</span>
                </div>
              )}
              {episode.country && (
                <div className={styles.meta_item}>
                  <span className={styles.meta_label}>Mamlakat</span>
                  <span className={styles.meta_value}>{episode.country}</span>
                </div>
              )}
            </div>

            {episode.genres?.length > 0 && (
              <div className={styles.genres_row}>
                {episode.genres.map((g) => (
                  <span key={g} className={styles.genre_tag}>{g}</span>
                ))}
              </div>
            )}

            {episode.description && (
              <div className={styles.description_box}>
                <p className={styles.meta_label}>Ta'rif</p>
                <p className={styles.description_text}>{episode.description}</p>
              </div>
            )}

            {episode.videoFileId && (
              <div className={styles.description_box}>
                <p className={styles.meta_label}>Video (Telegram)</p>
                <code className={styles.video_code}>
                  Channel: {episode.videoFileId?.channelId} | Msg: {episode.videoFileId?.msgId}
                </code>
              </div>
            )}

            <div className={styles.modal_actions}>
              <Button variant="ghost" onClick={close}>Yopish</Button>
              <Button variant="danger" onClick={handleDelete} loading={isDeleting}>
                {isDeleting ? "O'chirilmoqda..." : "🗑 O'chirish"}
              </Button>
              <Button variant="primary" onClick={() => setIsEditing(true)}>✏️ Tahrirlash</Button>
            </div>
          </>
        ) : (
          <div className={styles.ep_edit_form}>
            <div className={styles.grid_2}>
              <Input
                label="Qism raqami"
                type="number"
                value={formData.episodeNumber}
                onChange={(e) => setFormData({ ...formData, episodeNumber: e.target.value })}
              />
              <Input
                label="Kod"
                type="number"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              />
            </div>
            <Input
              label="Nomi"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <div className={styles.grid_2}>
              <Input
                label="Chiqgan yili"
                type="number"
                value={formData.releaseYear}
                onChange={(e) => setFormData({ ...formData, releaseYear: e.target.value })}
              />
              <Input
                label="Mamlakat"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              />
            </div>
            <Input
              label="Janrlar (vergul bilan)"
              value={formData.genres}
              onChange={(e) => setFormData({ ...formData, genres: e.target.value })}
            />
            <div className={styles.textarea_wrapper}>
              <label>Ta'rif</label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className={styles.modal_actions}>
              <Button variant="ghost" onClick={() => setIsEditing(false)}>Bekor</Button>
              <Button variant="primary" onClick={handleSave} loading={isSaving}>
                {isSaving ? "Saqlanmoqda..." : "Saqlash"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default EpisodeDetailModal;
