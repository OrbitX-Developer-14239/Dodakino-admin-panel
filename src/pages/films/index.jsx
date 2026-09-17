import React, { useCallback, useState, useEffect } from "react";
import styles from "./index.module.scss";
import { Button, Card, Input, Modal, Pagination, Table } from "../../components/ui";
import FilmService from "../../api/services/filmService";
import EpisodeService from "../../api/services/episodeService";
import BotService from "../../api/services/botService";
import FilmDetailPanel from "./components/FilmDetailPanel";
import EpisodeDetailModal from "./components/EpisodeDetailModal";
import AddEpisodeModal from "./components/AddEpisodeModal";

// episodesCount ataylab yo'q: u backendda qism qo'shilgan/o'chirilgan sayin
// avtomatik hisoblanadi. Qo'lda kiritilsa haqiqiy qismlar soni bilan chalkashadi.
const EMPTY_FORM = {
  code: "", name: "", originalName: "", year: "",
  country: "", genres: "", description: "",
  // Fasllar soni. 1 = oddiy film/serial: botda qismlar to'g'ridan-to'g'ri
  // chiqadi va "fasl" so'zi umuman ko'rinmaydi. 2+ bo'lsa bot avval
  // "1-fasl, 2-fasl" tugmalarini ko'rsatadi.
  seasonsCount: "1",
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

  // AI to'ldirish holati
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiNotice, setAiNotice] = useState(null);

  /**
   * Tanlangan botning media ("cloud") kanali.
   *
   * Film va qism yaratishda "Kanal ID" maydoni shu bilan o'zi to'ladi —
   * ilgari uni har safar qo'lda yozish kerak edi va bitta raqam xato
   * bo'lsa bot videoni topa olmasdi. Maydon tahrirlanadigan bo'lib qoladi.
   */
  const [botChannelId, setBotChannelId] = useState("");

  useEffect(() => {
    BotService.info()
      .then((res) => setBotChannelId(res?.data?.channelId || ""))
      .catch(() => { /* kanal olinmasa maydon bo'sh qoladi, qo'lda yoziladi */ });
  }, []);

  /**
   * BO'SH KODLAR OLDINDAN TAYYOR.
   *
   * Ilgari kod oyna ochilgandagina so'ralardi va javob kelguncha maydon
   * bo'sh turardi. Endi sahifaga kirilishi bilan ikkalasi (film va qism)
   * olinib turadi — oyna ochilganda kod DARHOL yozilgan bo'ladi.
   *
   * NEGA SERVERDA (Redis) EMAS: oldindan saqlangan kod eskirib qoladi —
   * boshqa admin shu orada film qo'shsa, keshdagi kod band bo'lib qolardi
   * va har yaratish/o'chirishda keshni tozalash kerak bo'lardi. Bu yerda
   * esa kod sahifa ochilganda, har yaratish/o'chirishdan keyin va oyna
   * ochilganda fonda qayta tekshiriladi. Band bo'lib qolgan taqdirda ham
   * backend uni rad etadi — noto'g'ri yozuv tushmaydi.
   */
  const [nextCodes, setNextCodes] = useState({ film: "", episode: "" });

  const refreshNextCodes = useCallback(async () => {
    const [film, episode] = await Promise.allSettled([
      FilmService.nextCode(),
      EpisodeService.nextCodes(1),
    ]);
    const codes = {
      film: film.status === "fulfilled" && film.value?.data?.code ? String(film.value.data.code) : "",
      episode: episode.status === "fulfilled" && episode.value?.data?.codes?.[0]
        ? String(episode.value.data.codes[0])
        : "",
    };
    setNextCodes(codes);
    return codes;
  }, []);

  useEffect(() => {
    refreshNextCodes();
  }, [refreshNextCodes]);

  // Saqlash jarayoni (tugmadagi loader uchun)
  const [isSaving, setIsSaving] = useState(false);

  // Poster: ko'rinish (preview), drag-drop va xato holati
  const [posterPreview, setPosterPreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [posterError, setPosterError] = useState(null);

  // Tanlangan rasm uchun vaqtinchalik URL. Fayl almashsa/olib tashlansa
  // eskisi bo'shatiladi — aks holda xotirada to'planib qoladi.
  useEffect(() => {
    if (!posterFile) {
      setPosterPreview(null);
      return;
    }
    const url = URL.createObjectURL(posterFile);
    setPosterPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [posterFile]);

  const acceptPosterFile = (file) => {
    if (!file) return;
    if (!file.type?.startsWith("image/")) {
      setPosterError("Faqat rasm fayli (jpg, png, webp) qabul qilinadi.");
      return;
    }
    setPosterError(null);
    setPosterFile(file);
  };

  const handlePosterDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    acceptPosterFile(e.dataTransfer.files?.[0]);
  };

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

  // To'liq filmni oladi. Qidiruv natijasida _id bo'lmasligi mumkin
  // (eski qidiruv indeksi) — u holda kod bo'yicha so'raladi.
  const loadFullFilm = async (film) => {
    const res = film._id
      ? await FilmService.getById(film._id)
      : await FilmService.getByCode(film.code);
    const full = res?.data || res;
    if (!full?._id) throw new Error("Film topilmadi");
    return full;
  };

  // ─── Filmni bosish → to'liq ma'lumot olish ──
  const handleFilmClick = async (film) => {
    setSelectedFilm(film);
    setDetailFilm(null);
    setIsDetailLoading(true);
    try {
      setDetailFilm(await loadFullFilm(film));
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
      seasonsCount: String(film.seasonsCount || 1),
      genres: (film.genres || []).join(", "),
      description: film.description || "",
      posterChannelId: film.posterId?.channelId || "",
      posterMsgId: film.posterId?.msgId || ""
    });
    setPosterFile(null);
    setAiNotice(null);
    setIsEditModalOpen(true);
  };

  const handleOpenCreate = () => {
    setEditingFilm(null);
    // Oldindan tayyorlangan kod darhol yoziladi
    const cached = nextCodes.film;
    setFormData({ ...EMPTY_FORM, posterChannelId: botChannelId, code: cached });
    setPosterFile(null);
    setAiNotice(null);
    setIsEditModalOpen(true);

    // Fonda qayta tekshiriladi: shu orada boshqa admin film qo'shgan bo'lsa
    // kod yangilanadi. Foydalanuvchi o'zi kod yozgan bo'lsa tegilmaydi.
    refreshNextCodes().then(({ film }) => {
      if (!film) return;
      setFormData((prev) => (!prev.code || prev.code === cached ? { ...prev, code: film } : prev));
    });
  };

  // ─── AI bilan to'ldirish ──────────────────
  // Nom majburiy; yil/davlat kiritilgan bo'lsa bir xil nomli kinolarni ajratishga yordam beradi.
  const handleAiFill = async () => {
    const name = formData.name.trim();
    if (!name) {
      setAiNotice({ type: "error", text: "Avval kino nomini yozing." });
      return;
    }

    setIsAiLoading(true);
    setAiNotice(null);
    try {
      const res = await FilmService.aiSuggest({
        name,
        year: formData.year,
        country: formData.country,
      });

      const film = res?.data?.film;
      if (!film) throw new Error("AI javob qaytarmadi");

      setFormData((prev) => ({
        ...prev,
        code: film.code ?? prev.code,
        name: film.name || prev.name,
        originalName: film.originalName || prev.originalName,
        year: film.year || prev.year,
        country: film.country || prev.country,
        genres: (film.genres || []).join(", ") || prev.genres,
        description: film.description || prev.description,
      }));

      setAiNotice(
        film.found
          ? { type: "ok", text: "To'ldirildi. Tavsifni o'qib chiqing — AI xato qilishi mumkin." }
          : {
            type: "warn",
            text: "AI bu kinoni aniq tanimadi. Ma'lumotlar taxminiy — tekshirib chiqing " +
              "yoki yil va davlatni yozib qayta urinib ko'ring.",
          }
      );
    } catch (error) {
      setAiNotice({ type: "error", text: "AI xatosi: " + (error?.message || "Noma'lum xato") });
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    if (isSaving) return; // ikki marta yuborilmasin

    setIsSaving(true);
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
          seasonsCount: Number(formData.seasonsCount) || 1,
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
        ["code", "name", "originalName", "year", "country", "description", "seasonsCount"]
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
      refreshNextCodes();
    } catch (error) {
      alert("Xatolik: " + (error?.message || "Noma'lum xato"));
    } finally {
      // finally: poster yo'q bo'lib erta chiqilganda ham loader o'chadi
      setIsSaving(false);
    }
  };

  // ─── Film o'chirish ───────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm("Rostdan ham bu filmni o'chirmoqchimisiz? Barcha qismlar ham o'chadi!")) return;
    try {
      await FilmService.delete(id);
      handleClosePanel();
      refreshNextCodes();
      fetchFilms(films.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage);
    } catch (error) {
      alert("O'chirishda xatolik: " + (error?.message || "Noma'lum xato"));
    }
  };

  // ─── Episode yangilanganda panel refresh ──
  const handleEpisodeUpdate = async () => {
    if (selectedFilm) {
      setDetailFilm(await loadFullFilm(detailFilm || selectedFilm));
    }
    fetchFilms(currentPage);
    refreshNextCodes();
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

        <Pagination page={currentPage} totalPages={totalPages} onChange={fetchFilms} />
      </Card>

      {/* Film detail side panel */}
      {/* Doim render qilinadi: film null bo'lganda panel o'zi silliq
          yopiladi. Shartli render (`{selectedFilm && ...}`) uni DOM dan
          darhol olib tashlab, yopilish animatsiyasiga vaqt qoldirmasdi. */}
      <FilmDetailPanel
        film={selectedFilm ? (isDetailLoading ? selectedFilm : (detailFilm || selectedFilm)) : null}
        loading={isDetailLoading}
        onClose={handleClosePanel}
        onEdit={handleOpenEdit}
        onDelete={handleDelete}
        onEpisodeClick={(ep) => setSelectedEpisode(ep)}
        onAddEpisode={(film) => setAddEpisodeFilm(detailFilm || film)}
      />

      {/* Kino yaratish / tahrirlash modali */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={editingFilm ? "Kinoni tahrirlash" : "Yangi kino qo'shish"}
      >
        <form onSubmit={handleSubmitEdit} className={styles.form}>
          <Input label="Nomi" required value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })} />

          {/* Nomdan boshqa hamma narsani AI to'ldiradi: kod, asl nom, yil,
              davlat, janrlar va tavsif. Yil/davlat oldindan yozilgan bo'lsa,
              bir xil nomli kinolarni ajratishga yordam beradi. */}
          <div className={styles.ai_row}>
            <Button
              type="button"
              variant="ghost"
              onClick={handleAiFill}
              disabled={isAiLoading}
            >
              {isAiLoading ? "AI o'ylayapti..." : "✨ AI bilan to'ldirish"}
            </Button>
            {aiNotice && (
              <span className={`${styles.ai_notice} ${styles["ai_" + aiNotice.type]}`}>
                {aiNotice.text}
              </span>
            )}
          </div>

          <Input label="Kino kodi" type="number" required value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })} />
          <Input label="Asl nomi" required value={formData.originalName}
            onChange={(e) => setFormData({ ...formData, originalName: e.target.value })} />
          <div className={styles.grid_2}>
            <Input label="Yili" type="number" required value={formData.year}
              onChange={(e) => setFormData({ ...formData, year: e.target.value })} />
            <Input label="Mamlakat" required value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })} />
          </div>
          {/* 1 bo'lsa botda fasl tugmalari umuman chiqmaydi (hozirgi holat).
              2+ bo'lsa avval fasl tanlash tugmalari ko'rsatiladi. */}
          <Input label="Fasllar soni" type="number" min="1" value={formData.seasonsCount}
            onChange={(e) => setFormData({ ...formData, seasonsCount: e.target.value })} />
          <Input label="Janrlar (vergul bilan)" required value={formData.genres}
            onChange={(e) => setFormData({ ...formData, genres: e.target.value })} />
          {!editingFilm && (
            <>
              <p className={styles.section_label}>Poster rasm</p>

              {/* 1-usul: Telegram kanal orqali */}
              <div className={styles.poster_method}>
                <span className={styles.poster_method_label}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{flexShrink:0}}>
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.94z"/>
                  </svg>
                  Telegram kanaldan
                </span>
                <div className={styles.grid_2}>
                  <Input label="Kanal ID" placeholder="Masalan: 3831468244"
                    value={formData.posterChannelId}
                    onChange={(e) => setFormData({ ...formData, posterChannelId: e.target.value })} />
                  <Input label="Xabar ID (msgId)" type="number" placeholder="Masalan: 74"
                    value={formData.posterMsgId}
                    onChange={(e) => setFormData({ ...formData, posterMsgId: e.target.value })} />
                </div>
              </div>

              {/* YOKI ajratuvchi */}
              <div className={styles.or_divider}>
                <span className={styles.or_divider_line} />
                <span className={styles.or_divider_text}>YOKI</span>
                <span className={styles.or_divider_line} />
              </div>

              {/* 2-usul: Fayl yuklash */}
              <div className={styles.file_input}>
                <span className={styles.poster_method_label}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{flexShrink:0}}>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  Fayldan yuklang
                </span>

                <label
                  htmlFor="poster-file"
                  className={[
                    styles.file_drop,
                    posterFile ? styles.file_drop_filled : "",
                    isDragging ? styles.file_drop_over : "",
                  ].filter(Boolean).join(" ")}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget)) setIsDragging(false);
                  }}
                  onDrop={handlePosterDrop}
                >
                  {posterPreview ? (
                    /* Rasm to'liq qoplaydi — textlar ko'rinmaydi */
                    <img src={posterPreview} alt="Poster ko'rinishi" className={styles.file_thumb} />
                  ) : (
                    /* Bo'sh holat */
                    <>
                      <span className={styles.file_thumb_empty}>🖼</span>
                      <span className={styles.file_drop_texts}>
                        <span className={styles.file_drop_name}>Rasmni bu yerga tashlang</span>
                        <span className={styles.file_drop_hint}>yoki tanlash uchun bosing (JPG, PNG, WEBP)</span>
                      </span>
                    </>
                  )}

                  {/* O'chirish tugmasi — rasm ustida, absolute */}
                  {posterFile && (
                    <button
                      type="button"
                      className={styles.file_clear}
                      title="Bekor qilish"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setPosterFile(null);
                        setPosterError(null);
                      }}
                    >
                      ✕
                    </button>
                  )}
                </label>

                {posterError && <span className={styles.file_error}>{posterError}</span>}

                <input
                  id="poster-file"
                  type="file"
                  accept="image/*"
                  onChange={(e) => acceptPosterFile(e.target.files[0])}
                />
              </div>
            </>
          )}
          <div className={styles.textarea_wrapper}>
            <label>Ta'rifi</label>
            <textarea required rows={4} value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
          </div>
          <div className={styles.modal_actions}>
            <Button
              type="button"
              variant="ghost"
              disabled={isSaving}
              onClick={() => setIsEditModalOpen(false)}
            >
              Bekor
            </Button>
            <Button type="submit" variant="primary" loading={isSaving}>
              {isSaving ? "Saqlanmoqda..." : "Saqlash"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Qism detail modali */}
      {selectedEpisode && (
        <EpisodeDetailModal
          episode={selectedEpisode}
          onClose={() => setSelectedEpisode(null)}
          onUpdate={handleEpisodeUpdate}
        />
      )}

      {/* Qism qo'shish modali */}
      {addEpisodeFilm && (
        <AddEpisodeModal
          film={addEpisodeFilm}
          defaultChannelId={botChannelId}
          defaultCode={nextCodes.episode}
          onClose={() => setAddEpisodeFilm(null)}
          onSuccess={handleEpisodeUpdate}
        />
      )}
    </div>
  );
}

export default FilmsPage;
