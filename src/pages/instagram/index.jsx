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
import { Badge, Card, Empty, ErrorBox, Loading, PageHead, Stat } from "../../components/ui";
import { ago, compact, num } from "../../utils/format";

/**
 * Instagram sahifasi — obunachilar, postlar va hikoyalar.
 *
 * Ma'lumot Meta API dan keladi. Token eskirsa yoki API javob bermasa
 * sahifa bo'sh qolmaydi: har bo'lim alohida so'raladi va nima
 * yiqilgani aniq aytiladi.
 */
export default function Instagram() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

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
  const posts = data?.posts?.topPosts?.length ? data.posts.topPosts : data?.posts?.allMedia?.slice(0, 8) || [];
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
        <Stat label="Koʻrishlar" value={compact(overall?.totalViews)} sub={`${num(overall?.totalPosts)} ta post boʻyicha`} tone="warn" />
      </div>

      <div className="grid c2">
        <Card title="Obunachilar oʻsishi" icon={TbChartLine}>
          {growthData.length ? (
            <TrendChart data={growthData} series={[{ key: "followers", name: "Obunachilar" }]} />
          ) : (
            <Empty>Oʻsish maʼlumoti yoʻq</Empty>
          )}
        </Card>

        <StoriesCard stories={stories} onUploaded={() => load(true)} />
      </div>

      <Card title="Eng yaxshi postlar" icon={TbStars}>
        {posts.length ? (
          <div className={`${styles.posts} anim-stagger`}>
            {posts.map((post, i) => (
              <a
                key={post.id}
                className={styles.post}
                href={post.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ "--i": i }}
              >
                <div className={styles.thumb}>
                  {post.thumbnail ? <img src={post.thumbnail} alt="" loading="lazy" /> : <TbBrandInstagram size={24} />}
                  {post.type === "VIDEO" && <Badge tone="info">video</Badge>}
                </div>
                <p className={styles.caption}>{post.caption || "Izohsiz"}</p>
                <div className={styles.postStats}>
                  <span>
                    <TbHeart size={13} /> {compact(post.likes)}
                  </span>
                  <span>
                    <TbMessageCircle size={13} /> {compact(post.comments)}
                  </span>
                  <span>
                    <TbEye size={13} /> {compact(post.views)}
                  </span>
                  <span className="spacer" />
                  <TbExternalLink size={13} />
                </div>
              </a>
            ))}
          </div>
        ) : (
          <Empty>Post topilmadi</Empty>
        )}
      </Card>
    </>
  );
}

/* ── Hikoyalar va yuklash ─────────────────────────────────── */
function StoriesCard({ stories, onUploaded }) {
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
            <div key={s.id} className={styles.story} title={s.caption || ""}>
              {s.media_type === "VIDEO" ? (
                <video src={s.media_url} muted preload="metadata" />
              ) : (
                <img src={s.media_url} alt="" loading="lazy" />
              )}
              <span className={styles.storyTime}>{ago(s.timestamp)}</span>
            </div>
          ))}
        </div>
      ) : (
        <Empty>Hozir faol hikoya yoʻq</Empty>
      )}
    </Card>
  );
}
