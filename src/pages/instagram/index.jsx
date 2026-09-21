import { useCallback, useEffect, useRef, useState } from "react";
import {
  TbBrandInstagram,
  TbChartLine,
  TbExternalLink,
  TbHeart,
  TbMessageCircle,
  TbPhotoUp,
  TbRefresh,
  TbEye,
  TbPlus,
  TbStars,
  TbTrash,
} from "react-icons/tb";
import styles from "./index.module.scss";
import client from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import { TrendChart } from "../../components/charts";
import { Badge, Button, Card, Empty, ErrorBox, Loading, Modal, PageHead, Stat } from "../../components/ui";
import { useBusy } from "../../hooks/useBusy";
import { useConfirm } from "../../hooks/useConfirm";
import { ago, compact, num, time } from "../../utils/format";

/**
 * Instagram sahifasi — obunachilar, postlar va hikoyalar.
 *
 * Ma'lumot Meta API dan keladi. Token eskirsa yoki API javob bermasa
 * sahifa bo'sh qolmaydi: har bo'lim alohida so'raladi va nima
 * yiqilgani aniq aytiladi.
 *
 * Post yoki hikoya ustiga bosilganda o'rtadan oyna ochiladi: to'liq
 * matn, sana va statistika o'sha yerda. Ro'yxatning o'zida faqat eng
 * kerakli uchta raqam turadi — aks holda kartochkalar raqamga to'lib
 * ketardi.
 */

/**
 * Sana va "necha vaqt oldin". Eski sanada `ago()` ning o'zi sanaga
 * aylanadi — u holda bir narsa ikki marta yozilmasligi uchun bittasi qoladi.
 */
const when = (ts) => {
  const abs = time(ts);
  const rel = ago(ts);
  return rel === abs ? abs : `${abs} · ${rel}`;
};

/** Instagram kam ko'rilgan media statistikasini bermaydi — nol EMAS, "—" */
const stat = (v) => (v === null || v === undefined ? "—" : compact(v));

export default function Instagram() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [openMedia, setOpenMedia] = useState(null); // { kind: "post"|"story", item }
  const [refreshing, runRefresh] = useBusy();
  const [composing, setComposing] = useState(false);
  // Shu sessiyada joylangan postlar — ro'yxat boshida turadi. Server ro'yxati
  // "eng yaxshi" bo'yicha tartiblangan, yangi post esa hali 0 ball bilan
  // oxiriga tushib, admin uni ko'rmay qolardi.
  const [fresh, setFresh] = useState([]);
  // Instagram o'chirganini tasdiqlagan post/hikoyalar — ro'yxat qayta
  // yuklanishini kutmay darhol yashiriladi
  const [removed, setRemoved] = useState([]);

  const load = useCallback(async (silent = false) => {
    const get = (url) => client.get(url, { silent }).then((r) => r?.data);
    const [profile, growth, posts, stories] = await Promise.allSettled([
      get(ENDPOINTS.INSTAGRAM.PROFILE),
      get(ENDPOINTS.INSTAGRAM.GROWTH),
      get(ENDPOINTS.INSTAGRAM.POSTS),
      get(ENDPOINTS.INSTAGRAM.STORIES),
    ]);
    const val = (r) => (r.status === "fulfilled" ? r.value : null);
    setData({ profile: val(profile), growth: val(growth), posts: val(posts), stories: val(stories) });
    setError(profile.status === "rejected" ? profile.reason : null);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!data && !error) return <Loading rows={5} />;

  const p = data?.profile;
  const serverPosts = data?.posts?.allMedia || [];
  // Server nusxasi kelgach u ishlatiladi (haqiqiy rasm va statistika), lekin joyi boshida qoladi
  const pinned = fresh.map((f) => serverPosts.find((s) => s.id === f.id) || f);
  const posts = [...pinned, ...serverPosts.filter((s) => !fresh.some((f) => f.id === s.id))].filter(
    (m) => !removed.includes(m.id)
  );
  const stories = (Array.isArray(data?.stories) ? data.stories : []).filter((m) => !removed.includes(m.id));

  const growthData = (data?.growth?.labels || []).map((label, i) => ({
    label,
    followers: data.growth.datasets?.[0]?.data?.[i] ?? 0,
  }));

  return (
    <>
      <PageHead>
        <Button
          variant="ghost"
          size="sm"
          icon={TbRefresh}
          busy={refreshing}
          busyText="Yangilanmoqda…"
          onClick={() => runRefresh(() => load())}
        >
          Yangilash
        </Button>
        <Button icon={TbPlus} onClick={() => setComposing(true)} disabled={!p}>
          Yangi post
        </Button>
      </PageHead>

      {error && (
        <ErrorBox
          error={{
            message:
              "Instagram maʼlumotini olib boʻlmadi. Koʻpincha sabab — Instagram tokenining muddati tugagan: " +
              "backend .env dagi INSTAGRAM_ACCESS_TOKEN ni yangilang.",
          }}
          onRetry={() => load()}
        />
      )}

      {p && (
        <Card>
          <div className={styles.profile}>
            {p.profile_picture_url ? (
              <img className={styles.avatar} src={p.profile_picture_url} alt="" />
            ) : (
              <span className={styles.avatar}>
                <TbBrandInstagram size={26} />
              </span>
            )}
            <div className={styles.profileText}>
              <strong className={styles.profileName}>{p.name || p.username}</strong>
              <a
                className="link"
                href={`https://instagram.com/${p.username}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                @{p.username}
              </a>
              {p.biography && <p className={styles.bio}>{p.biography}</p>}
            </div>
          </div>
        </Card>
      )}

      <div className="grid c3">
        <Stat label="Obunachilar" value={compact(p?.followers_count)} sub="followers" tone="ok" />
        <Stat label="Obunalar" value={compact(p?.follows_count)} sub="following" />
        <Stat label="Postlar" value={num(p?.media_count)} sub="jami nashrlar" tone="info" />
      </div>

      <div className="grid c2">
        <Card title="Obunachilar oʻsishi" icon={TbChartLine}>
          {growthData.length ? (
            <TrendChart data={growthData} series={[{ key: "followers", name: "Obunachilar" }]} />
          ) : (
            <Empty>Oʻsish maʼlumoti yoʻq</Empty>
          )}
        </Card>

        <StoriesCard
          stories={stories}
          onUploaded={() => load(true)}
          onOpen={(item) => setOpenMedia({ kind: "story", item })}
        />
      </div>

      <Card title="Eng yaxshi postlar" icon={TbStars}>
        {p || posts.length ? (
          <div className={`${styles.posts} anim-stagger`}>
            {p && (
              <button type="button" className={styles.addPost} onClick={() => setComposing(true)}>
                <span className={styles.addIcon}>
                  <TbPlus size={22} />
                </span>
                <strong>Yangi post</strong>
                <span className="hint">rasm — post, video — Reels</span>
              </button>
            )}
            {posts.map((post, i) => (
              <button
                key={post.id}
                type="button"
                className={styles.post}
                style={{ "--i": i }}
                onClick={() => setOpenMedia({ kind: "post", item: post })}
              >
                <div className={styles.thumb}>
                  {post.thumbnail ? <img src={post.thumbnail} alt="" loading="lazy" /> : <TbBrandInstagram size={24} />}
                  {post.type === "VIDEO" && <Badge tone="info">video</Badge>}
                </div>
                <p className={styles.caption}>{post.caption || "Izohsiz"}</p>
                <div className={styles.postStats}>
                  <span title="Yoqtirishlar">
                    <TbHeart size={13} /> {stat(post.likes)}
                  </span>
                  <span title="Izohlar">
                    <TbMessageCircle size={13} /> {stat(post.comments)}
                  </span>
                  <span title="Koʻrishlar">
                    <TbEye size={13} /> {stat(post.views)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <Empty>Post topilmadi</Empty>
        )}
      </Card>

      {composing && (
        <NewPostModal
          onClose={() => setComposing(false)}
          onPublished={(post) => {
            setComposing(false);
            setFresh((list) => [post, ...list]);
            load(true);
          }}
        />
      )}

      {openMedia && (
        <MediaModal
          {...openMedia}
          onClose={() => setOpenMedia(null)}
          onDeleted={() => {
            setRemoved((ids) => [...ids, openMedia.item.id]);
            setOpenMedia(null);
            load(true);
          }}
        />
      )}
    </>
  );
}

/* ── Post / hikoya oynasi ─────────────────────────────────── */
function MediaModal({ kind, item, onClose, onDeleted }) {
  const isStory = kind === "story";
  const isVideo = item.type === "VIDEO";
  const [confirm, confirmDialog] = useConfirm();

  const remove = () =>
    confirm({
      title: isStory ? "Hikoyani oʻchirish" : "Postni oʻchirish",
      message: isStory
        ? "Bu hikoya Instagramdan oʻchirilsinmi?"
        : `Bu ${item.productType === "REELS" ? "Reels" : "post"} Instagramdan oʻchirilsinmi?`,
      details: isStory
        ? "Hikoya darhol yoʻqoladi, uni koʻrganlar statistikasi ham oʻchadi. Bu amalni qaytarib boʻlmaydi."
        : `Layklar (${stat(item.likes)}), izohlar (${stat(item.comments)}) va koʻrishlar ham birga oʻchadi. Bu amalni qaytarib boʻlmaydi.`,
      confirmText: "Instagramdan oʻchirish",
      busyText: "Oʻchirilmoqda…",
      action: async () => {
        await client.delete(ENDPOINTS.INSTAGRAM.MEDIA(item.id));
        onDeleted?.();
      },
    });

  const rows = isStory
    ? [
        ["Turi", isVideo ? "Video" : "Rasm"],
        ["Qoʻyilgan", when(item.timestamp)],
        ["Oʻchadi", item.expiresAt ? time(item.expiresAt) : "—"],
        ["Koʻrishlar", stat(item.views)],
        ["Qamrov", stat(item.reach)],
        ["Javoblar", stat(item.replies)],
      ]
    : [
        ["Turi", isVideo ? (item.productType === "REELS" ? "Reels" : "Video") : "Rasm"],
        ["Nashr etilgan", when(item.timestamp)],
        ["Yoqtirishlar", stat(item.likes)],
        ["Izohlar", stat(item.comments)],
        ["Koʻrishlar", stat(item.views)],
        ["Qamrov", stat(item.reach)],
        ["Ulashilgan", stat(item.shares)],
        ["Saqlagan", stat(item.saved)],
      ];

  // Statistika yo'qligi xato emas: Instagram kam ko'rilgan media uchun
  // uni bermaydi. Shuni ochiq aytamiz, aks holda "—" tushunarsiz qoladi.
  const noStats = item.views === null && item.reach === null;

  return (
    <Modal
      open
      title={isStory ? "Hikoya" : "Post"}
      onClose={onClose}
      actions={
        <>
          <Button variant="danger" size="sm" icon={TbTrash} onClick={remove}>
            Oʻchirish
          </Button>
          <span className="spacer" />
          <button type="button" className="btn ghost sm" onClick={onClose}>
            Yopish
          </button>
          {item.url && (
            <a className="btn" href={item.url} target="_blank" rel="noopener noreferrer">
              <TbExternalLink size={14} /> {isStory ? "Hikoyani ochish" : "Instagramda ochish"}
            </a>
          )}
        </>
      }
    >
      <div className={styles.modalBody}>
        <div className={`${styles.preview} ${isStory ? styles.previewStory : ""}`}>
          {isVideo && item.mediaUrl ? (
            <video src={item.mediaUrl} controls playsInline poster={item.thumbnail || undefined} />
          ) : item.thumbnail ? (
            <img src={item.thumbnail} alt="" />
          ) : (
            <TbBrandInstagram size={28} />
          )}
        </div>

        <div className={styles.details}>
          <dl className={styles.rows}>
            {rows.map(([label, value]) => (
              <div key={label} className={styles.row}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>

          {noStats && (
            <p className="hint">
              Instagram statistikani kam koʻrilgan media uchun bermaydi — koʻruvchilar
              koʻpaygach raqamlar oʻzi paydo boʻladi.
            </p>
          )}

          {item.caption && <p className={styles.modalCaption}>{item.caption}</p>}
        </div>
      </div>

      {/* Portal: post oynasi ustiga chiqadi, Escape faqat uni yopadi */}
      {confirmDialog}
    </Modal>
  );
}

/* ── Yangi post ───────────────────────────────────────────── */
const CAPTION_MAX = 2200; // Instagram chegarasi
const FILE_MAX = 100 * 1024 * 1024; // backenddagi chegara bilan bir xil

/**
 * Rasm — oddiy post, video — Reels (lentaga ham chiqadi).
 *
 * Ikki bosqich, ikkalasi ham tugmada ko'rinadi:
 *   1) fayl serverga ketmoqda — foiz bilan;
 *   2) server uni Instagramga joylayapti — video uchun 1-3 daqiqa,
 *      bu bosqichning foizi yo'q.
 * Oyna shu vaqt yopilmaydi: yopilsa ham post baribir chiqib ketardi va
 * admin natijasini bilmay qolardi.
 */
function NewPostModal({ onClose, onPublished }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);
  const videoRef = useRef(null);

  const isVideo = file?.type?.startsWith("video/");

  // Video uchun ro'yxatdagi muqova — oyna ko'rsatib turgan kadr
  const videoFrame = () => {
    const v = videoRef.current;
    if (!v?.videoWidth) return null;
    try {
      const c = document.createElement("canvas");
      c.width = v.videoWidth;
      c.height = v.videoHeight;
      c.getContext("2d").drawImage(v, 0, 0);
      return c.toDataURL("image/jpeg", 0.8);
    } catch {
      return null;
    }
  };

  // Tanlangan fayl ko'rinishi — eski havola xotiradan bo'shatiladi
  useEffect(() => {
    if (!file) return undefined;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const pick = (f) => {
    setError(null);
    if (!f) return;
    if (f.size > FILE_MAX) {
      setError(new Error(`Fayl juda katta (${Math.round(f.size / 1024 / 1024)} MB) — eng koʻpi 100 MB`));
      return;
    }
    setFile(f);
  };

  const publish = async () => {
    if (!file) return;
    setBusy(true);
    setProgress(0);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("media", file);
      if (caption.trim()) fd.append("caption", caption.trim());
      const res = await client.post(ENDPOINTS.INSTAGRAM.POSTS, fd, {
        timeout: 330000, // Reels qayta ishlanishi — 5 daqiqagacha
        onUploadProgress: (e) => {
          if (e.total) setProgress(Math.min(100, Math.round((e.loaded / e.total) * 100)));
        },
      });
      // Ro'yxatga darhol qo'yiladigan post — Instagram ma'lumoti kelguncha
      // lokal fayldan. Oyna yopilganda preview havolasi bo'shatiladi,
      // shuning uchun alohida havola ochiladi.
      const mediaUrl = URL.createObjectURL(file);
      onPublished?.({
        id: res?.data?.id || `local-${Date.now()}`,
        caption: caption.trim(),
        type: isVideo ? "VIDEO" : "IMAGE",
        productType: isVideo ? "REELS" : "FEED",
        mediaUrl,
        thumbnail: isVideo ? videoFrame() : mediaUrl,
        likes: 0,
        comments: 0,
        views: 0,
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  const busyText =
    progress < 100
      ? `Yuklanmoqda… ${progress}%`
      : isVideo
        ? "Reels tayyorlanmoqda…"
        : "Instagramga joylanmoqda…";

  return (
    <Modal
      open
      title="Yangi post"
      onClose={() => !busy && onClose()}
      actions={
        <>
          <span className="hint">
            {file ? (isVideo ? "Video Reels boʻlib chiqadi" : "Rasm post boʻlib chiqadi") : "Fayl tanlanmagan"}
          </span>
          <span className="spacer" />
          <button type="button" className="btn ghost sm" onClick={onClose} disabled={busy}>
            Bekor qilish
          </button>
          <Button icon={TbBrandInstagram} busy={busy} busyText={busyText} disabled={!file} onClick={publish}>
            Joylash
          </Button>
        </>
      }
    >
      <ErrorBox error={error} />

      <div className={styles.modalBody}>
        <button
          type="button"
          className={`${styles.preview} ${styles.picker} ${isVideo ? styles.previewStory : ""}`}
          onClick={() => !busy && fileRef.current?.click()}
          disabled={busy}
          aria-label="Rasm yoki video tanlash"
        >
          {preview ? (
            isVideo ? <video ref={videoRef} src={preview} muted controls playsInline /> : <img src={preview} alt="" />
          ) : (
            <span className={styles.pickerEmpty}>
              <TbPlus size={24} />
              Rasm yoki video tanlang
              <small>JPEG rasm yoki MP4/MOV video · 100 MB gacha</small>
            </span>
          )}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,video/mp4,video/quicktime"
          hidden
          onChange={(e) => pick(e.target.files?.[0] || null)}
        />

        <div className={styles.details}>
          <label className="field">
            <span>Izoh</span>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value.slice(0, CAPTION_MAX))}
              placeholder="Post matni, heshteglar…"
              rows={8}
              disabled={busy}
            />
            <small>{num(caption.length)} / {num(CAPTION_MAX)} belgi</small>
          </label>

          {file && (
            <p className="hint">
              {file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB
              {!busy && (
                <>
                  {" · "}
                  <button type="button" className={styles.linkBtn} onClick={() => fileRef.current?.click()}>
                    boshqasini tanlash
                  </button>
                </>
              )}
            </p>
          )}

          {busy && (
            <div className={styles.progress} role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
              <span className={progress >= 100 ? styles.progressWait : ""} style={{ width: `${progress}%` }} />
            </div>
          )}

          {busy && progress >= 100 && isVideo && (
            <p className="hint">Instagram videoni qayta ishlayapti — bu 1–3 daqiqa davom etishi mumkin.</p>
          )}
        </div>
      </div>
    </Modal>
  );
}

/* ── Hikoyalar va yuklash ─────────────────────────────────── */
function StoriesCard({ stories, onUploaded, onOpen }) {
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  // Yuklash foizi: 0-99 — fayl serverga ketmoqda, 100 — server uni
  // Instagramga joylayapti (bu bosqichning foizi yo'q, faqat kutiladi)
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);
  const fileRef = useRef(null);

  const upload = async () => {
    if (!file) return;
    setBusy(true);
    setProgress(0);
    setError(null);
    setDone(false);
    try {
      const fd = new FormData();
      fd.append("media", file);
      await client.post(ENDPOINTS.INSTAGRAM.STORIES, fd, {
        // Video uzun yuklanadi va Instagram uni qayta ishlaydi — 5 daqiqa
        timeout: 300000,
        onUploadProgress: (e) => {
          if (e.total) setProgress(Math.min(100, Math.round((e.loaded / e.total) * 100)));
        },
      });
      setFile(null);
      setDone(true);
      onUploaded?.();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
      setProgress(0);
    }
  };

  const busyText = progress < 100 ? `Yuklanmoqda… ${progress}%` : "Instagramga joylanmoqda…";

  return (
    <Card title="Hikoyalar" icon={TbPhotoUp} actions={<Badge>{num(stories.length)} ta faol</Badge>}>
      <ErrorBox error={error} />
      {done && <p className={styles.ok}>Hikoya yuklandi — Instagram uni bir necha soniyada koʻrsatadi.</p>}

      <div className={styles.upload}>
        <button type="button" className="btn ghost sm" onClick={() => fileRef.current?.click()} disabled={busy}>
          Rasm yoki video tanlash
        </button>
        <span className={`hint ${styles.fileName}`}>{file ? file.name : "tanlanmagan"}</span>
        <Button size="sm" busy={busy} busyText={busyText} disabled={!file} onClick={upload}>
          Hikoya qilish
        </Button>
      </div>

      {/* Foiz chizig'i — tugmadagi yozuvni ko'z bilan ham ko'rsatadi */}
      {busy && (
        <div className={styles.progress} role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <span className={progress >= 100 ? styles.progressWait : ""} style={{ width: `${progress}%` }} />
        </div>
      )}

      <div hidden>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          hidden
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
      </div>

      {stories.length ? (
        <div className={styles.stories}>
          {stories.map((s) => (
            <button
              key={s.id}
              type="button"
              className={styles.story}
              onClick={() => onOpen?.(s)}
              title="Batafsil"
            >
              {s.type === "VIDEO" ? (
                <video src={s.mediaUrl} muted preload="metadata" poster={s.thumbnail || undefined} />
              ) : (
                <img src={s.thumbnail || s.mediaUrl} alt="" loading="lazy" />
              )}
              <span className={styles.storyTop}>{s.type === "VIDEO" ? "video" : "rasm"}</span>
              <span className={styles.storyTime}>
                {ago(s.timestamp)}
                {s.views !== null && s.views !== undefined && ` · ${compact(s.views)} 👁`}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <Empty>Hozir faol hikoya yoʻq</Empty>
      )}
    </Card>
  );
}
