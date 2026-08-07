import React, { useState, useEffect } from "react";
import styles from "./index.module.scss";
import Card from "../../components/ui/Card";
import Table from "../../components/ui/Table";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import FilmService from "../../api/services/filmService";
import FilmDetailPanel from "./components/FilmDetailPanel";
import EpisodeDetailModal from "./components/EpisodeDetailModal";
import AddEpisodeModal from "./components/AddEpisodeModal";

// episodesCount ataylab yo'q: u backendda qism qo'shilgan/o'chirilgan sayin
// avtomatik hisoblanadi. Qo'lda kiritilsa haqiqiy qismlar soni bilan chalkashadi.
const EMPTY_FORM = {
  code: "", name: "", originalName: "", year: "",
  country: "", genres: "", description: "",
  posterChannelId: "", posterMsgId: ""
};

function FilmsPage() {
  const [films, setFilms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalFilms, setTotalFilms] = useState(0);

  // Film detail panel
  const [selectedFilm, setSelectedFilm] = useState(null);
  const [detailFilm, setDetailFilm] = useState(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingFilm, setEditingFilm] = useState(null);
  const [selectedEpisode, setSelectedEpisode] = useState(null);
  const [addEpisodeFilm, setAddEpisodeFilm] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [posterFile, setPosterFile] = useState(null);

  // ─── Filmlar ro'yxatini yuklash ────────────
  const fetchFilms = async (page = 1) => {
    setIsLoading(true);
    try {
      const res = await FilmService.getList(page);
      setFilms(res?.films || []);
      setCurrentPage(res?.pagination?.currentPage || 1);
      setTotalPages(res?.pagination?.totalPages || 1);
      setTotalFilms(res?.pagination?.totalFilms || 0);
    } catch (error) {
      console.error("Filmlarni yuklashda xatolik:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFilms(1); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Filmni bosish → to'liq ma'lumot olish ──
  const handleFilmClick = async (film) => {
    setSelectedFilm(film);
    setDetailFilm(null);
    setIsDetailLoading(true);
    try {
      const res = await FilmService.getById(film._id);
      setDetailFilm(res?.data || res);
    } catch (error) {
      console.error("Film ma'lumotini yuklashda xatolik:", error);
      setDetailFilm(film);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleClosePanel = () => {
    setSelectedFilm(null);
    setDetailFilm(null);
  };

  // ─── Qidiruv ──────────────────────────────
  const handleSearch = async () => {
    if (!searchQuery) return fetchFilms(1);
    setIsLoading(true);
    try {
      const res = await FilmService.search(searchQuery);
      const result = res?.data;
      if (Array.isArray(result)) setFilms(result);
      else if (result) setFilms([result]);
      else setFilms([]);
      setTotalPages(1);
      setTotalFilms(Array.isArray(result) ? result.length : result ? 1 : 0);
    } catch (error) {
      console.error("Qidiruvda xatolik:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Film tahrirlash ──────────────────────
  const handleOpenEdit = (film) => {
    setEditingFilm(film);
    setFormData({
      code: film.code || "",
      name: film.name || "",
      originalName: film.originalName || "",
      year: film.year || "",
      country: film.country || "",
      genres: (film.genres || []).join(", "),
      description: film.description || "",
      posterChannelId: film.posterId?.channelId || "",
      posterMsgId: film.posterId?.msgId || ""
    });
    setPosterFile(null);
    setIsEditModalOpen(true);
  };

  const handleOpenCreate = () => {
    setEditingFilm(null);
    setFormData(EMPTY_FORM);
    setPosterFile(null);
    setIsEditModalOpen(true);
  };

  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    try {
      const genres = formData.genres.split(",").map(g => g.trim()).filter(Boolean);

      if (editingFilm) {
        // episodesCount yuborilmaydi — backend uni o'zi hisoblaydi
        await FilmService.update(editingFilm._id, {
          code: Number(formData.code),
          name: formData.name,
          originalName: formData.originalName,
          year: Number(formData.year),
          country: formData.country,
          description: formData.description,
          genres
        });
      } else {
        // Poster ikki yo'l bilan berilishi mumkin: fayl yuklash yoki
        // Telegram kanalidagi mavjud xabarga ko'rsatkich (kanal + msgId).
        if (!posterFile && !(formData.posterChannelId && formData.posterMsgId)) {
          alert("Poster kerak: yo rasm faylini tanlang, yo kanal ID va xabar ID (msgId) ni kiriting.");
          return;
        }

        const fd = new FormData();
        ["code", "name", "originalName", "year", "country", "description"]
          .forEach(key => fd.append(key, formData[key]));
        genres.forEach(genre => fd.append("genres[]", genre));

        if (posterFile) {
          fd.append("poster", posterFile);
        } else {
          fd.append("posterId", JSON.stringify({
            channelId: formData.posterChannelId,
            msgId: Number(formData.posterMsgId)
          }));
        }

        await FilmService.create(fd);
      }
      setIsEditModalOpen(false);
      fetchFilms(currentPage);
    } catch (error) {
      alert("Xatolik: " + (error?.message || "Noma'lum xato"));
    }
  };

  // ─── Film o'chirish ───────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm("Rostdan ham bu filmni o'chirmoqchimisiz? Barcha qismlar ham o'chadi!")) return;
    try {
      await FilmService.delete(id);
      handleClosePanel();
      fetchFilms(films.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage);
    } catch (error) {
      alert("O'chirishda xatolik: " + (error?.message || "Noma'lum xato"));
    }
  };

  // ─── Episode yangilanganda panel refresh ──
  const handleEpisodeUpdate = async () => {
    if (selectedFilm) {
      const res = await FilmService.getById(selectedFilm._id);
      setDetailFilm(res?.data || res);
    }
    fetchFilms(currentPage);
  };

  // ─── Jadval ustunlari ─────────────────────
  const columns = [
    { title: "Kod", key: "code", width: "80px" },
    { title: "Nomi", key: "name" },
    { title: "Asl nomi", key: "originalName" },
    { title: "Yil", key: "year", width: "70px" },
    {
      title: "Ko'rishlar",
      key: "views",
      width: "100px",
      render: (val) => <span>{val ?? 0}</span>
    },
    {
      title: "Qismlar",
      key: "episodes",
      width: "80px",
      render: (val, film) => <span>{film.episodesCount ?? val?.length ?? 0} ta</span>
    },
    {
      title: "Amallar",
      key: "actions",
      width: "130px",
      render: (_, film) => (
        <div className={styles.actions} onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" onClick={() => handleOpenEdit(film)}>✏️</Button>
          <Button variant="danger" onClick={() => handleDelete(film._id)}>🗑</Button>
        </div>
      )
    }
  ];

  return (
    <div className={styles.wrapper}>
      <Card>
        {/* Toolbar */}
        <div className={styles.toolbar}>
          <div className={styles.search_bar}>
            <Input
              placeholder="Kino nomi yoki kodi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
            />
            <Button onClick={handleSearch}>Qidirish</Button>
            {searchQuery && (
              <Button variant="ghost" onClick={() => { setSearchQuery(""); fetchFilms(1); }}>
                Tozalash
              </Button>
            )}
          </div>
          <div className={styles.toolbar_right}>
            <span className={styles.total_info}>Jami: {totalFilms} ta kino</span>
            <Button variant="primary" onClick={handleOpenCreate}>+ Yangi kino</Button>
          </div>
        </div>

        {/* Hint */}
        <div className={styles.table_hint}>
          <span>💡 Kino qatoriga bosing — to'liq ma'lumot va qismlar ko'rinadi</span>
        </div>

        {/* Jadval */}
        <Table
          columns={columns}
          data={films}
          isLoading={isLoading}
          onRowClick={handleFilmClick}
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className={styles.pagination}>
            <Button variant="ghost" disabled={currentPage <= 1} onClick={() => fetchFilms(currentPage - 1)}>
              ← Oldingi
            </Button>
            <span className={styles.page_info}>{currentPage} / {totalPages}</span>
            <Button variant="ghost" disabled={currentPage >= totalPages} onClick={() => fetchFilms(currentPage + 1)}>
              Keyingi →
            </Button>
          </div>
        )}
      </Card>

      {/* Film detail side panel */}
      {selectedFilm && (
        <FilmDetailPanel
          film={isDetailLoading ? selectedFilm : (detailFilm || selectedFilm)}
          onClose={handleClosePanel}
          onEdit={handleOpenEdit}
          onDelete={handleDelete}
          onEpisodeClick={(ep) => setSelectedEpisode(ep)}
          onAddEpisode={(film) => setAddEpisodeFilm(detailFilm || film)}
        />
      )}

      {/* Kino yaratish / tahrirlash modali */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={editingFilm ? "Kinoni tahrirlash" : "Yangi kino qo'shish"}
      >
        <form onSubmit={handleSubmitEdit} className={styles.form}>
          <Input label="Kino kodi" type="number" required value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })} />
          <Input label="Nomi" required value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
          <Input label="Asl nomi" required value={formData.originalName}
            onChange={(e) => setFormData({ ...formData, originalName: e.target.value })} />
          <div className={styles.grid_2}>
            <Input label="Yili" type="number" required value={formData.year}
              onChange={(e) => setFormData({ ...formData, year: e.target.value })} />
            <Input label="Mamlakat" required value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })} />
          </div>
          <Input label="Janrlar (vergul bilan)" required value={formData.genres}
            onChange={(e) => setFormData({ ...formData, genres: e.target.value })} />
          {!editingFilm && (
            <>
              <p className={styles.section_label}>Poster — quyidagi ikki yo'ldan birini tanlang</p>
              <div className={styles.grid_2}>
                <Input label="Kanal ID" placeholder="Masalan: 3831468244"
                  value={formData.posterChannelId}
                  onChange={(e) => setFormData({ ...formData, posterChannelId: e.target.value })} />
                <Input label="Xabar ID (msgId)" type="number" placeholder="Masalan: 74"
                  value={formData.posterMsgId}
                  onChange={(e) => setFormData({ ...formData, posterMsgId: e.target.value })} />
              </div>
              <div className={styles.file_input}>
                <label>...yoki rasm faylini yuklang</label>
                <input type="file" accept="image/*" onChange={(e) => setPosterFile(e.target.files[0])} />
              </div>
            </>
          )}
          <div className={styles.textarea_wrapper}>
            <label>Ta'rifi</label>
            <textarea required rows={4} value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
          </div>
          <div className={styles.modal_actions}>
            <Button type="button" variant="ghost" onClick={() => setIsEditModalOpen(false)}>Bekor</Button>
            <Button type="submit" variant="primary">Saqlash</Button>
          </div>
        </form>
      </Modal>

      {/* Qism detail modali */}
      {selectedEpisode && (
        <EpisodeDetailModal
          episode={selectedEpisode}
          onClose={() => setSelectedEpisode(null)}
          onUpdate={() => { handleEpisodeUpdate(); setSelectedEpisode(null); }}
        />
      )}

      {/* Qism qo'shish modali */}
      {addEpisodeFilm && (
        <AddEpisodeModal
          film={addEpisodeFilm}
          onClose={() => setAddEpisodeFilm(null)}
          onSuccess={handleEpisodeUpdate}
        />
      )}
    </div>
  );
}

export default FilmsPage;
