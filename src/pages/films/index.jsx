import { useCallback, useEffect, useRef, useState } from "react";
import {
  TbArrowLeft,
  TbDeviceFloppy,
  TbEye,
  TbMovie,
  TbPencil,
  TbPlus,
  TbRefresh,
  TbSearch,
  TbSparkles,
  TbTrash,
  TbX,
} from "react-icons/tb";
import styles from "./index.module.scss";
import client from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import { useBusy } from "../../hooks/useBusy";
import { useConfirm } from "../../hooks/useConfirm";
import {
  Badge,
  Button,
  Card,
  Empty,
  ErrorBox,
  Loading,
  Modal,
  PageHead,
  Pagination,
  Stat,
} from "../../components/ui";
import { compact, num } from "../../utils/format";

/**
 * Filmlar va qismlar.
 *
 * Ro'yxat → film oynasi. Film oynasi BITTA: tafsilot, tahrirlash va
 * qism qo'shish uning ichida almashadi. Oyna ustiga oyna ochilmaydi —
 * aks holda Escape ikkalasini birdan yopib, yozilgan matn yo'qolardi.
 *
 * KODLAR: bo'sh film va qism kodlari sahifa ochilishi bilan oldindan
 * olinadi, shuning uchun forma ochilganda kod maydoni bo'sh turmaydi.
 * Film kodlari 50000 dan 10 qadam bilan, qismlarniki 100 dan bittalab.
 */
export default function Films() {
  const [list, setList] = useState(null);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState(null); // null — qidiruv yo'q
  const [error, setError] = useState(null);

  const [botInfo, setBotInfo] = useState(null);
  const [nextCodes, setNextCodes] = useState({ film: "", episode: "" });

  const [creating, setCreating] = useState(false);
  const [openFilmId, setOpenFilmId] = useState(null);

  // Sahifa almashganda / qidiruvda jadval xiralashadi
  const [listBusy, setListBusy] = useState(false);
  const [refreshing, runRefresh] = useBusy();
  const [searching, runSearch] = useBusy();

  const load = useCallback(async () => {
    setListBusy(true);
    try {
      const res = await client.get(ENDPOINTS.FILMS.LIST, { params: { page } });
      // Bu endpoint `data` ga o'ramaydi: { success, films, pagination }
      setList({ films: res?.films || [], pagination: res?.pagination || null });
      setError(null);
    } catch (e) {
      setError(e);
    } finally {
      setListBusy(false);
    }
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  /** Bo'sh kodlar — fonda, forma ochilishiga tayyor turadi */
  const refreshCodes = useCallback(() => {
    client
      .get(ENDPOINTS.FILMS.NEXT_CODE, { silent: true })
      .then((r) => setNextCodes((c) => ({ ...c, film: r?.data?.code ?? c.film })))
      .catch(() => {});
    client
      .get(ENDPOINTS.EPISODES.NEXT_CODE, { params: { count: 1 }, silent: true })
      .then((r) => setNextCodes((c) => ({ ...c, episode: r?.data?.codes?.[0] ?? c.episode })))
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshCodes();
    // Botning media kanali — poster va video "Kanal ID" si shundan to'ladi
    client
      .get(ENDPOINTS.BOT.INFO, { silent: true })
      .then((r) => setBotInfo(r?.data || null))
      .catch(() => {});
  }, [refreshCodes]);

  const search = (e) => {
    e?.preventDefault();
    const q = query.trim();
    if (!q) {
      setSearched(null);
      return undefined;
    }
    return runSearch(async () => {
      try {
        const res = await client.post(ENDPOINTS.FILMS.SEARCH, { query: q });
        setSearched(Array.isArray(res?.data) ? res.data : res?.data ? [res.data] : []);
        setError(null);
      } catch (err) {
        setError(err);
      }
    });
  };

  const clearSearch = () => {
    setQuery("");
    setSearched(null);
  };

  // O'zgarishdan keyin: ro'yxat, qidiruv natijasi va bo'sh kodlar yangilanadi
  const afterChange = () => {
    load();
    refreshCodes();
    if (searched) search();
  };

  if (!list && !error) return <Loading rows={6} />;

  const films = searched ?? list?.films ?? [];
  const pg = list?.pagination;
  const composite = botInfo && !botInfo.channelId;

  return (
    <>
      <PageHead>
        <Button
          variant="ghost"
          size="sm"
          icon={TbRefresh}
          busy={refreshing}
          busyText="Yangilanmoqda…"
          onClick={() => runRefresh(() => Promise.all([load(), refreshCodes()]))}
        >
          Yangilash
        </Button>
        <Button
          icon={TbPlus}
          onClick={() => setCreating(true)}
          disabled={composite}
          title={composite ? "Aralash bot kontentni boshqa botlardan oladi — film shu botlarda qoʻshiladi" : ""}
        >
          Yangi kino
        </Button>
      </PageHead>

      <ErrorBox error={error} onRetry={() => load()} />

      <div className="grid c3">
        <Stat label="Filmlar" value={num(pg?.totalFilms)} sub="katalogda" />
        <Stat label="Keyingi film kodi" value={nextCodes.film || "—"} sub="10 qadam bilan" tone="info" />
        <Stat label="Keyingi qism kodi" value={nextCodes.episode || "—"} sub="eng kichik boʻsh kod" tone="ok" />
      </div>

      <Card
        title={searched ? `Qidiruv natijasi · ${num(films.length)} ta` : "Barcha filmlar"}
        icon={TbMovie}
        actions={
          <form className={styles.search} onSubmit={search} role="search" aria-busy={searching || undefined}>
            {searching ? <span className={styles.searchSpinner} aria-label="Qidirilmoqda" /> : <TbSearch size={15} />}
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (!e.target.value) setSearched(null);
              }}
              placeholder="Nomi, kodi yoki tavsifi…"
              aria-label="Film qidirish"
            />
            {searched && (
              <button type="button" className="btn ghost sm" onClick={clearSearch} aria-label="Qidiruvni tozalash">
                <TbX size={13} />
              </button>
            )}
          </form>
        }
      >
        <div className="loading-dim" data-busy={listBusy || searching || undefined}>
        {films.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Kod</th>
                  <th>Nomi</th>
                  <th className="num">Yil</th>
                  <th className="num">Qismlar</th>
                  <th className="num">Koʻrishlar</th>
                </tr>
              </thead>
              <tbody>
                {films.map((f) => (
                  <tr
                    key={f._id || f.code}
                    className={styles.row}
                    onClick={() => setOpenFilmId(f._id || `code:${f.code}`)}
                  >
                    <td className="mono">{f.code}</td>
                    <td>
                      <span className={styles.filmName}>{f.name}</span>
                      {f.originalName && f.originalName !== f.name && (
                        <span className={styles.filmOriginal}>{f.originalName}</span>
                      )}
                    </td>
                    <td className="num">{f.year || "—"}</td>
                    <td className="num">{f.episodesCount ?? "—"}</td>
                    <td className="num">{f.views != null ? compact(f.views) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty icon={TbMovie}>{searched ? "Hech narsa topilmadi" : "Hali film qoʻshilmagan"}</Empty>
        )}

        {!searched && (
          <Pagination page={pg?.currentPage || page} totalPages={pg?.totalPages} onChange={setPage} />
        )}
        </div>
      </Card>

      {creating && (
        <Modal open title="Yangi kino" onClose={() => setCreating(false)}>
          <FilmForm
            defaultCode={nextCodes.film}
            defaultChannelId={botInfo?.channelId || ""}
            onCancel={() => setCreating(false)}
            onSaved={(film) => {
              setCreating(false);
              afterChange();
              // Yaratilgan filmni darhol ochamiz — keyingi qadam odatda qism qo'shish
              if (film?._id) setOpenFilmId(film._id);
            }}
          />
        </Modal>
      )}

      {openFilmId && (
        <FilmModal
          filmRef={openFilmId}
          botChannelId={botInfo?.channelId || ""}
          nextEpisodeCode={nextCodes.episode}
          readOnly={composite}
          onClose={() => setOpenFilmId(null)}
          onChanged={afterChange}
          onDeleted={() => {
            setOpenFilmId(null);
            afterChange();
          }}
        />
      )}
    </>
  );
}

/* ══════════════════════════════════════════════════════════════
   Film oynasi: tafsilot ⇄ tahrirlash ⇄ qism qo'shish/tahrirlash
   ══════════════════════════════════════════════════════════════ */
function FilmModal({ filmRef, botChannelId, nextEpisodeCode, readOnly, onClose, onChanged, onDeleted }) {
  const [film, setFilm] = useState(null);
  const [error, setError] = useState(null);
  const [view, setView] = useState({ name: "detail" });

  const load = useCallback(async () => {
    try {
      // Qidiruv natijasida _id bo'lmasligi mumkin — kod bo'yicha olinadi
      const res = String(filmRef).startsWith("code:")
        ? await client.get(ENDPOINTS.FILMS.BY_CODE(String(filmRef).slice(5)))
        : await client.get(ENDPOINTS.FILMS.BY_ID(filmRef));
      setFilm(res?.data || null);
      setError(null);
    } catch (e) {
      setError(e);
    }
  }, [filmRef]);

  useEffect(() => {
    load();
  }, [load]);

  const back = () => setView({ name: "detail" });

  const saved = async () => {
    await load();
    onChanged?.();
    back();
  };

  const [confirm, confirmDialog] = useConfirm();

  const removeFilm = () =>
    confirm({
      title: "Filmni oʻchirish",
      message: `“${film.name}” (kod ${film.code}) oʻchirilsinmi?`,
      details: `Uning barcha qismlari ham (${num(film.episodesCount ?? film.episodes?.length ?? 0)} ta) oʻchadi. Bu amalni qaytarib boʻlmaydi.`,
      confirmText: "Oʻchirish",
      busyText: "Oʻchirilmoqda…",
      action: async () => {
        await client.delete(ENDPOINTS.FILMS.ITEM(film._id));
        onDeleted?.();
      },
    });

  const removeEpisode = (ep) =>
    confirm({
      title: "Qismni oʻchirish",
      message: `${ep.episodeNumber}-qism — “${ep.name}” (kod ${ep.code}) oʻchirilsinmi?`,
      details: "Bu amalni qaytarib boʻlmaydi.",
      confirmText: "Oʻchirish",
      busyText: "Oʻchirilmoqda…",
      action: async () => {
        await client.delete(ENDPOINTS.EPISODES.ITEM(ep.episodeId));
        await load();
        onChanged?.();
      },
    });

  const episodes = [...(film?.episodes || [])].sort(
    (a, b) => (a.season || 1) - (b.season || 1) || a.episodeNumber - b.episodeNumber
  );
  const nextNumber = episodes.length ? Math.max(...episodes.map((e) => e.episodeNumber || 0)) + 1 : 1;

  const title =
    view.name === "edit"
      ? "Kinoni tahrirlash"
      : view.name === "episode"
        ? view.episode
          ? `${view.episode.episodeNumber}-qismni tahrirlash`
          : "Yangi qism"
        : film?.name || "Film";

  return (
    <Modal
      open
      title={title}
      onClose={onClose}
      actions={
        view.name === "detail" && film && !readOnly ? (
          <>
            <Button variant="danger" size="sm" icon={TbTrash} onClick={removeFilm}>
              Oʻchirish
            </Button>
            <span className="spacer" />
            <button type="button" className="btn ghost sm" onClick={() => setView({ name: "edit" })}>
              <TbPencil size={13} /> Tahrirlash
            </button>
            <button type="button" className="btn" onClick={() => setView({ name: "episode", episode: null })}>
              <TbPlus size={14} /> Qism qoʻshish
            </button>
          </>
        ) : null
      }
    >
      <ErrorBox error={error} onRetry={load} />
      {!film && !error && <Loading rows={4} />}

      {film && view.name === "detail" && (
        <div className={styles.detail}>
          <div className={styles.facts}>
            <Fact label="Kod" value={film.code} mono />
            <Fact label="Yil" value={film.year} />
            <Fact label="Davlat" value={film.country} />
            <Fact label="Koʻrishlar" value={num(film.views)} />
            <Fact label="Qismlar" value={num(film.episodesCount ?? episodes.length)} />
            {film.seasonsCount > 1 && <Fact label="Fasllar" value={film.seasonsCount} />}
          </div>

          {film.originalName && <p className="hint">{film.originalName}</p>}

          {film.genres?.length > 0 && (
            <div className={styles.genres}>
              {film.genres.map((g) => (
                <Badge key={g}>{g}</Badge>
              ))}
            </div>
          )}

          {film.description && <p className={styles.description}>{film.description}</p>}

          <div className={styles.episodesHead}>
            <strong>Qismlar ({num(episodes.length)})</strong>
          </div>

          {episodes.length ? (
            <div className={styles.episodes}>
              {episodes.map((ep) => (
                <div key={ep.episodeId || ep.code} className={styles.episode}>
                  <span className={styles.epNumber}>
                    {film.seasonsCount > 1 ? `${ep.season || 1}·` : ""}
                    {ep.episodeNumber}
                  </span>
                  <span className={styles.epName}>
                    {ep.name}
                    <span className="hint mono"> · {ep.code}</span>
                  </span>
                  {ep.videoFileId?.msgId ? (
                    <Badge tone="ok">video</Badge>
                  ) : (
                    <Badge tone="warn">video yoʻq</Badge>
                  )}
                  {!readOnly && (
                    <span className={styles.epActions}>
                      <button
                        type="button"
                        className="btn ghost sm"
                        onClick={() => setView({ name: "episode", episode: ep })}
                        aria-label="Qismni tahrirlash"
                      >
                        <TbPencil size={13} />
                      </button>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={TbTrash}
                        onClick={() => removeEpisode(ep)}
                        aria-label="Qismni oʻchirish"
                      />
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <Empty icon={TbEye}>Hali qism qoʻshilmagan</Empty>
          )}
        </div>
      )}

      {film && view.name === "edit" && (
        <FilmForm film={film} defaultChannelId={botChannelId} onCancel={back} onSaved={saved} />
      )}

      {film && view.name === "episode" && (
        <EpisodeForm
          film={film}
          episode={view.episode}
          defaultCode={nextEpisodeCode}
          defaultNumber={nextNumber}
          defaultChannelId={botChannelId}
          onCancel={back}
          onSaved={saved}
        />
      )}

      {/* Portal: film oynasining ustiga chiqadi, Escape faqat uni yopadi */}
      {confirmDialog}
    </Modal>
  );
}

function Fact({ label, value, mono }) {
  return (
    <div className={styles.fact}>
      <span className={styles.factLabel}>{label}</span>
      <span className={`${styles.factValue} ${mono ? "mono" : ""}`}>{value ?? "—"}</span>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   Film formasi — yaratish va tahrirlash
   ══════════════════════════════════════════════════════════════ */
function FilmForm({ film, defaultCode = "", defaultChannelId = "", onCancel, onSaved }) {
  const editing = Boolean(film);
  const [form, setForm] = useState(() => ({
    code: film?.code ?? defaultCode ?? "",
    name: film?.name || "",
    originalName: film?.originalName || "",
    year: film?.year || "",
    country: film?.country || "",
    seasonsCount: film?.seasonsCount || 1,
    genres: (film?.genres || []).join(", "),
    description: film?.description || "",
    posterChannelId: film?.posterId?.channelId || defaultChannelId || "",
    posterMsgId: "",
  }));
  const [poster, setPoster] = useState(null);
  const [saving, setSaving] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

  // Kod keyinroq kelsa (sahifa endi ochilgan bo'lsa) — bo'sh maydonni to'ldiramiz
  useEffect(() => {
    if (!editing && defaultCode) setForm((f) => (f.code ? f : { ...f, code: defaultCode }));
  }, [editing, defaultCode]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const genresList = () =>
    form.genres
      .split(",")
      .map((g) => g.trim())
      .filter(Boolean);

  /** AI nomdan qolgan maydonlarni to'ldiradi — bazaga hech narsa yozmaydi */
  const aiFill = async () => {
    if (!form.name.trim()) return setError(new Error("Avval kino nomini yozing"));
    setAiBusy(true);
    setError(null);
    try {
      const res = await client.post(ENDPOINTS.FILMS.AI_SUGGEST, {
        name: form.name.trim(),
        ...(form.year ? { year: Number(form.year) } : {}),
        ...(form.country ? { country: form.country } : {}),
      });
      const s = res?.data?.film || {};
      if (s.found === false) setError(new Error("AI bu kinoni aniq tanimadi — maʼlumotlarni tekshiring"));
      setForm((f) => ({
        ...f,
        name: s.name || f.name,
        originalName: s.originalName || f.originalName,
        year: s.year || f.year,
        country: s.country || f.country,
        genres: s.genres?.length ? s.genres.join(", ") : f.genres,
        description: s.description || f.description,
        code: f.code || s.code || "",
      }));
    } catch (e) {
      setError(e);
    } finally {
      setAiBusy(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const fd = new FormData();
    const fields = {
      code: form.code,
      name: form.name.trim(),
      originalName: form.originalName.trim() || form.name.trim(),
      year: form.year,
      country: form.country.trim(),
      seasonsCount: form.seasonsCount || 1,
      description: form.description.trim(),
    };
    Object.entries(fields).forEach(([k, v]) => fd.append(k, v));
    // Har janr alohida maydon — server massiv sifatida oladi
    genresList().forEach((g) => fd.append("genres", g));
    if (poster) fd.append("poster", poster);
    else if (form.posterMsgId && form.posterChannelId) {
      fd.append("posterId", JSON.stringify({ channelId: form.posterChannelId, msgId: Number(form.posterMsgId) }));
    }

    try {
      const res = editing
        ? await client.put(ENDPOINTS.FILMS.ITEM(film._id), fd)
        : await client.post(ENDPOINTS.FILMS.CREATE, fd);
      onSaved?.(res?.data);
    } catch (err) {
      // Forma yopilmaydi — yozilgan narsa yo'qolmasin
      setError(err);
    } finally {
      setSaving(false);
    }
  };

  const needsPoster = !editing && !poster && !form.posterMsgId;

  return (
    <form onSubmit={submit} className={styles.form}>
      <ErrorBox error={error} />

      <div className={styles.formRow}>
        <label className="field">
          <span>Kino nomi</span>
          <input type="text" value={form.name} onChange={set("name")} required placeholder="Masalan: Afsona" />
        </label>
        <Button
          variant="ghost"
          size="sm"
          className={styles.aiBtn}
          icon={TbSparkles}
          busy={aiBusy}
          busyText="AI toʻldirmoqda…"
          onClick={aiFill}
        >
          AI bilan toʻldirish
        </Button>
      </div>

      <div className={styles.grid2}>
        <label className="field">
          <span>Asl nomi</span>
          <input type="text" value={form.originalName} onChange={set("originalName")} placeholder="Legend" />
        </label>
        <label className="field">
          <span>Kino kodi</span>
          <input type="number" value={form.code} onChange={set("code")} required min={50000} />
          <small>50000 dan, 10 qadam bilan (50000, 50010, …)</small>
        </label>
        <label className="field">
          <span>Yil</span>
          <input type="number" value={form.year} onChange={set("year")} required min={1800} />
        </label>
        <label className="field">
          <span>Davlat</span>
          <input type="text" value={form.country} onChange={set("country")} required placeholder="AQSh" />
        </label>
        <label className="field">
          <span>Janrlar</span>
          <input type="text" value={form.genres} onChange={set("genres")} placeholder="Drama, Triller" />
          <small>Vergul bilan ajrating</small>
        </label>
        <label className="field">
          <span>Fasllar soni</span>
          <input type="number" value={form.seasonsCount} onChange={set("seasonsCount")} min={1} max={100} />
        </label>
      </div>

      <label className="field">
        <span>Tavsif</span>
        <textarea value={form.description} onChange={set("description")} required minLength={10} />
      </label>

      <fieldset className={styles.media}>
        <legend>Poster {editing && <span className="hint">— oʻzgartirmasangiz eskisi qoladi</span>}</legend>
        <div className={styles.fileRow}>
          <button type="button" className="btn ghost sm" onClick={() => fileRef.current?.click()}>
            Rasm tanlash
          </button>
          <span className="hint">{poster ? poster.name : "yoki kanaldagi xabar ID si"}</span>
          {poster && (
            <button type="button" className="btn ghost sm" onClick={() => setPoster(null)} aria-label="Rasmni olib tashlash">
              <TbX size={13} />
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => setPoster(e.target.files?.[0] || null)}
          />
        </div>
        {!poster && (
          <div className={styles.grid2}>
            <label className="field">
              <span>Kanal ID</span>
              <input type="text" value={form.posterChannelId} onChange={set("posterChannelId")} />
            </label>
            <label className="field">
              <span>Xabar ID (msgId)</span>
              <input type="number" value={form.posterMsgId} onChange={set("posterMsgId")} min={1} />
            </label>
          </div>
        )}
      </fieldset>

      <div className="row end">
        {editing && (
          <button type="button" className="btn ghost sm" onClick={onCancel}>
            <TbArrowLeft size={13} /> Orqaga
          </button>
        )}
        {!editing && (
          <button type="button" className="btn ghost sm" onClick={onCancel}>
            Bekor qilish
          </button>
        )}
        <Button
          type="submit"
          icon={TbDeviceFloppy}
          busy={saving}
          busyText={editing ? "Saqlanmoqda…" : poster ? "Poster yuklanmoqda…" : "Yaratilmoqda…"}
          disabled={needsPoster}
          title={needsPoster ? "Poster kerak" : ""}
        >
          {editing ? "Saqlash" : "Yaratish"}
        </Button>
      </div>
    </form>
  );
}

/* ══════════════════════════════════════════════════════════════
   Qism formasi — qo'shish va tahrirlash
   ══════════════════════════════════════════════════════════════ */
function EpisodeForm({ film, episode, defaultCode, defaultNumber, defaultChannelId, onCancel, onSaved }) {
  const editing = Boolean(episode);
  const [form, setForm] = useState(() => ({
    code: episode?.code ?? defaultCode ?? "",
    episodeNumber: episode?.episodeNumber ?? defaultNumber,
    season: episode?.season || 1,
    name: episode?.name || `${defaultNumber}-qism`,
    // Tavsif filmnikidan olinadi — kerak bo'lsa qism uchun o'zgartiriladi
    description: episode?.description ?? film.description ?? "",
    channelId: episode?.videoFileId?.channelId || defaultChannelId || "",
    msgId: episode?.videoFileId?.msgId || "",
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!editing && defaultCode) setForm((f) => (f.code ? f : { ...f, code: defaultCode }));
  }, [editing, defaultCode]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const body = {
      code: Number(form.code),
      episodeNumber: Number(form.episodeNumber),
      season: Number(form.season) || 1,
      name: form.name.trim(),
      description: form.description.trim(),
      ...(form.channelId && form.msgId
        ? { videoFileId: { channelId: String(form.channelId), msgId: Number(form.msgId) } }
        : {}),
    };

    try {
      if (editing) await client.put(ENDPOINTS.EPISODES.ITEM(episode.episodeId), body);
      else await client.post(ENDPOINTS.EPISODES.CREATE, { ...body, filmId: film._id });
      onSaved?.();
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className={styles.form}>
      <ErrorBox error={error} />

      <p className="hint" style={{ marginBottom: "var(--gap-12)" }}>
        {film.name} · {film.year} · {film.country} — yil, davlat va janrlar filmnikidan olinadi.
      </p>

      <div className={styles.grid3}>
        <label className="field">
          <span>Qism raqami</span>
          <input type="number" value={form.episodeNumber} onChange={set("episodeNumber")} required min={1} />
        </label>
        <label className="field">
          <span>Fasl</span>
          <input type="number" value={form.season} onChange={set("season")} min={1} max={100} />
        </label>
        <label className="field">
          <span>Qism kodi</span>
          <input type="number" value={form.code} onChange={set("code")} required min={100} />
        </label>
      </div>

      <label className="field">
        <span>Nomi</span>
        <input type="text" value={form.name} onChange={set("name")} required />
      </label>

      <label className="field">
        <span>Tavsif</span>
        <textarea value={form.description} onChange={set("description")} />
        <small>Filmning tavsifi bilan toʻldirilgan — kerak boʻlsa oʻzgartiring</small>
      </label>

      <fieldset className={styles.media}>
        <legend>Video (bot kanalidagi xabar)</legend>
        <div className={styles.grid2}>
          <label className="field">
            <span>Kanal ID</span>
            <input type="text" value={form.channelId} onChange={set("channelId")} placeholder="3831468244" />
          </label>
          <label className="field">
            <span>Xabar ID (msgId)</span>
            <input type="number" value={form.msgId} onChange={set("msgId")} min={1} />
          </label>
        </div>
      </fieldset>

      <div className="row end">
        <button type="button" className="btn ghost sm" onClick={onCancel}>
          <TbArrowLeft size={13} /> Orqaga
        </button>
        <Button type="submit" icon={TbDeviceFloppy} busy={saving} busyText={editing ? "Saqlanmoqda…" : "Qoʻshilmoqda…"}>
          {editing ? "Saqlash" : "Qoʻshish"}
        </Button>
      </div>
    </form>
  );
}
