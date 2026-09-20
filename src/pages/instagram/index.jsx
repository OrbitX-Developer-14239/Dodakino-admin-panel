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
  TbStars,
} from "react-icons/tb";
import styles from "./index.module.scss";
import client from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import { TrendChart } from "../../components/charts";
import { Badge, Card, Empty, ErrorBox, Loading, Modal, PageHead, Stat } from "../../components/ui";
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
  const overall = data?.posts?.overallStats;
  const posts = data?.posts?.allMedia || [];
  const stories = Array.isArray(data?.stories) ? data.stories : [];

  const growthData = (data?.growth?.labels || []).map((label, i) => ({
    label,
    followers: data.growth.datasets?.[0]?.data?.[i] ?? 0,
  }));

  return (
    <>
      <PageHead>
        <button type="button" className="btn ghost sm" onClick={() => load()}>
          <TbRefresh size={14} /> Yangilash
        </button>
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

      <div className="grid c4">
        <Stat label="Obunachilar" value={compact(p?.followers_count)} sub="followers" tone="ok" />
        <Stat label="Obunalar" value={compact(p?.follows_count)} sub="following" />
        <Stat label="Postlar" value={num(p?.media_count)} sub="jami nashrlar" tone="info" />
        <Stat
          label="Koʻrishlar"
          value={stat(overall?.totalViews)}
          sub={`${num(overall?.totalPosts)} ta post · ${stat(overall?.totalReach)} qamrov`}
          tone="warn"
        />
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
        {posts.length ? (
          <div className={`${styles.posts} anim-stagger`}>
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

      {openMedia && <MediaModal {...openMedia} onClose={() => setOpenMedia(null)} />}
    </>
  );
}

/* ── Post / hikoya oynasi ─────────────────────────────────── */
function MediaModal({ kind, item, onClose }) {
  const isStory = kind === "story";
  const isVideo = item.type === "VIDEO";

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
    </Modal>
  );
}

/* ── Hikoyalar va yuklash ─────────────────────────────────── */
function StoriesCard({ stories, onUploaded, onOpen }) {
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);
  const fileRef = useRef(null);

  const upload = async () => {
    if (!file) return;
    setBusy(true);
    setError(null);
    setDone(false);
    try {
      const fd = new FormData();
      fd.append("media", file);
      await client.post(ENDPOINTS.INSTAGRAM.STORIES, fd, { timeout: 120000 });
      setFile(null);
      setDone(true);
      onUploaded?.();
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card title="Hikoyalar" icon={TbPhotoUp} actions={<Badge>{num(stories.length)} ta faol</Badge>}>
      <ErrorBox error={error} />
      {done && <p className={styles.ok}>Hikoya yuklandi — Instagram uni bir necha soniyada koʻrsatadi.</p>}

      <div className={styles.upload}>
        <button type="button" className="btn ghost sm" onClick={() => fileRef.current?.click()}>
          Rasm yoki video tanlash
        </button>
        <span className={`hint ${styles.fileName}`}>{file ? file.name : "tanlanmagan"}</span>
        <button type="button" className="btn sm" disabled={!file || busy} onClick={upload}>
          {busy ? "Yuklanmoqda…" : "Hikoya qilish"}
        </button>
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
