import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  TbBookmark,
  TbBookmarkFilled,
  TbBrandInstagram,
  TbChartLine,
  TbCheck,
  TbDots,
  TbExternalLink,
  TbEye,
  TbHeart,
  TbHeartFilled,
  TbMessageCircle,
  TbMoodSmile,
  TbPhotoUp,
  TbPlus,
  TbRefresh,
  TbSend,
  TbStars,
  TbTrash,
  TbUsers,
  TbX,
} from "react-icons/tb";
import styles from "./index.module.scss";
import client from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import { TrendChart } from "../../components/charts";
import { Badge, Button, Card, Empty, ErrorBox, Loading, Modal, PageHead, Stat } from "../../components/ui";
import { useBusy } from "../../hooks/useBusy";
import { useConfirm } from "../../hooks/useConfirm";
import { ago, compact, num, time } from "../../utils/format";
import { lockScroll } from "../../utils/scrollLock";

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
  const [extraPosts, setExtraPosts] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async (silent = false) => {
    const get = (url) => client.get(url, { silent }).then((r) => r?.data);
    const [profile, growth, posts, stories, invites] = await Promise.allSettled([
      get(ENDPOINTS.INSTAGRAM.PROFILE),
      get(ENDPOINTS.INSTAGRAM.GROWTH),
      get(`${ENDPOINTS.INSTAGRAM.POSTS}?limit=30`),
      get(ENDPOINTS.INSTAGRAM.STORIES),
      get(ENDPOINTS.INSTAGRAM.COLLAB_INVITES),
    ]);
    const val = (r) => (r.status === "fulfilled" ? r.value : null);
    const postsVal = val(posts);
    setData({
      profile: val(profile),
      growth: val(growth),
      posts: postsVal,
      stories: val(stories),
      invites: val(invites),
      invitesError: invites.status === "rejected" ? invites.reason : null,
    });
    setExtraPosts([]);
    setNextCursor(postsVal?.nextCursor || null);
    setHasMore(Boolean(postsVal?.hasMore));
    setError(profile.status === "rejected" ? profile.reason : null);
  }, []);

  const loadMorePosts = async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await client
        .get(`${ENDPOINTS.INSTAGRAM.POSTS}?limit=30&after=${nextCursor}`)
        .then((r) => r?.data);
      const newPosts = res?.allMedia || [];
      setExtraPosts((prev) => [...prev, ...newPosts]);
      setNextCursor(res?.nextCursor || null);
      setHasMore(Boolean(res?.hasMore));
    } catch (err) {
      console.error("Ko'proq postlarni yuklashda xatolik:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    load();
  }, [load]);

  if (!data && !error) return <Loading rows={5} />;

  const p = data?.profile;
  const serverPosts = [...(data?.posts?.allMedia || []), ...extraPosts];
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

  const isNotConfigured = Boolean(
    error?.status === 404 ||
    error?.raw?.response?.data?.notConfigured ||
    /instagram tokenlari olinmagan/i.test(error?.message || "")
  );

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

      {isNotConfigured ? (
        <Card>
          <Empty icon={TbBrandInstagram}>
            Bu bot uchun instagram tokenlari olinmagan
          </Empty>
        </Card>
      ) : (
        <>
          {error && (
            <ErrorBox
              error={{
                message:
                  error.message ||
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

          <CollabInvitesCard
            invites={Array.isArray(data?.invites) ? data.invites : []}
            error={data?.invitesError}
            onAnswered={() => load(true)}
          />

          <Card title="Postlar" icon={TbStars}>
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
            {hasMore && (
              <div className={styles.loadMoreWrap}>
                <Button
                  variant="secondary"
                  onClick={loadMorePosts}
                  busy={loadingMore}
                  busyText="Yuklanmoqda…"
                  icon={TbPlus}
                >
                  Koʻproq yuklash (+30)
                </Button>
              </div>
            )}
          </Card>
        </>
      )}

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
          profile={p}
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

/* ── Bizga kelgan collab takliflari ───────────────────────── */
/**
 * Boshqa akkaunt bizni postiga hammuallif qilib chaqirsa — shu yerda.
 * Javob ikkala yo'nalishda ham tasdiqlash oynasi orqali: qabul qilish
 * postni bizning profilimizga chiqaradi, rad etish esa taklifni yopadi,
 * va ikkalasini ham panel orqali qaytarib bo'lmaydi.
 */
function CollabInvitesCard({ invites, error, onAnswered }) {
  const [confirm, confirmDialog] = useConfirm();
  // Javob berilganlar ro'yxat qayta yuklanguncha ham ko'rinmasin
  const [answered, setAnswered] = useState([]);
  const list = invites.filter((inv) => !answered.includes(inv.mediaId || inv.id));

  const respond = (inv, accept) => {
    const mediaId = inv.mediaId || inv.id;
    const who = inv.owner ? `@${inv.owner}` : (inv.ownerName || "Bu akkaunt");
    confirm({
      title: accept ? "Collab taklifini qabul qilish" : "Collab taklifini rad etish",
      message: accept
        ? `${who} posti sizning profilingizda ham chiqsinmi?`
        : `${who} taklifi rad etilsinmi?`,
      details: accept
        ? "Post ikkala profilda koʻrinadi, layk va izohlar umumiy boʻladi. Buni panel orqali qaytarib boʻlmaydi."
        : "Post sizning profilingizda chiqmaydi. Buni panel orqali qaytarib boʻlmaydi.",
      confirmText: accept ? "Qabul qilish" : "Rad etish",
      busyText: accept ? "Qabul qilinmoqda…" : "Rad etilmoqda…",
      tone: accept ? "primary" : "danger",
      action: async () => {
        await client.post(ENDPOINTS.INSTAGRAM.COLLAB_INVITE(mediaId), { accept });
        setAnswered((ids) => [...ids, mediaId]);
        onAnswered?.();
      },
    });
  };

  const formatInviteTime = (timestamp) => {
    if (!timestamp) return null;
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return null;
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  };

  return (
    <Card
      title="Collab takliflari"
      icon={TbUsers}
      actions={list.length ? <Badge tone="warn" pulse>{list.length}</Badge> : null}
    >
      {error ? (
        <ErrorBox error={error} />
      ) : list.length ? (
        <div className={`${styles.invites} anim-stagger`}>
          {list.map((inv, i) => {
            const inviteKey = inv.mediaId || inv.id || i;
            const timeStr = formatInviteTime(inv.timestamp);
            return (
              <div key={inviteKey} className={styles.invite} style={{ "--i": i }}>
                <div className={`${styles.inviteThumb} ${inv.ownerAvatar ? styles.hasAvatar : ""}`}>
                  {inv.ownerAvatar ? (
                    <img
                      src={inv.ownerAvatar}
                      alt={inv.owner || ""}
                      className={styles.avatarImg}
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : inv.thumbnail ? (
                    <img src={inv.thumbnail} alt="" loading="lazy" />
                  ) : (
                    <TbBrandInstagram size={22} />
                  )}
                </div>
                <div className={styles.inviteText}>
                  <strong>{inv.owner ? `@${inv.owner}` : (inv.ownerName || "Nomaʼlum akkaunt")}</strong>
                  {inv.ownerName && inv.owner && <span className="hint"> ({inv.ownerName})</span>}
                  <span className="hint"> sizni hammuallif qilib chaqirdi</span>
                  {timeStr && <span className={styles.inviteDate}> • {timeStr}</span>}
                  {inv.caption && <p>{inv.caption}</p>}
                </div>
                <div className={styles.inviteActions}>
                  <Button variant="ghost" size="sm" icon={TbX} onClick={() => respond(inv, false)}>
                    Rad etish
                  </Button>
                  <Button size="sm" icon={TbCheck} onClick={() => respond(inv, true)}>
                    Qabul qilish
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Empty icon={TbUsers}>Hozircha collab taklifi yoʻq</Empty>
      )}
      {confirmDialog}
    </Card>
  );
}

/* ── Post / hikoya oynasi ─────────────────────────────────── */

function MediaModal({ kind, item, profile, onClose, onDeleted }) {
  const isStory = kind === "story";
  const isVideo = item.type === "VIDEO" || item.productType === "REELS";
  const [confirm, confirmDialog] = useConfirm();
  const [collaborators, setCollaborators] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // Izohlar ro'yxati
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [afterCursor, setAfterCursor] = useState(null);
  const [hasMoreComments, setHasMoreComments] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Yangi izoh yozish holati
  const [newCommentText, setNewCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showEmojis, setShowEmojis] = useState(false);
  const commentInputRef = useRef(null);

  // Layk, saqlash va hisoblagichlar
  const [isLiked, setIsLiked] = useState(() => {
    try {
      const stored = localStorage.getItem(`ig_liked_${item.id}`);
      if (stored !== null) return stored === "true";
    } catch (_) {}
    return false;
  });
  const [likeWarning, setLikeWarning] = useState(null);
  const [likesCount, setLikesCount] = useState(Number(item.likes) || 0);
  const [isSaved, setIsSaved] = useState(() => {
    try {
      const stored = localStorage.getItem(`ig_saved_${item.id}`);
      if (stored !== null) return stored === "true";
    } catch (_) {}
    return Number(item.saved) > 0;
  });
  const [savedCount, setSavedCount] = useState(Number(item.saved) || 0);
  const [commentsCount, setCommentsCount] = useState(Number(item.comments) || 0);

  // Escape tugmasi va sahifani surilishdan qulflash
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    const unlock = lockScroll();
    return () => {
      unlock();
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  // Hammualliflar faqat post/Reels da bo'ladi
  useEffect(() => {
    if (isStory || !/^\d+$/.test(String(item.id))) return undefined;
    let alive = true;
    client
      .get(ENDPOINTS.INSTAGRAM.COLLABORATORS(item.id), { silent: true })
      .then((r) => alive && setCollaborators(Array.isArray(r?.data) ? r.data : []))
      .catch(() => alive && setCollaborators([]));
    return () => {
      alive = false;
    };
  }, [isStory, item.id]);

  // Izohlarni olish (dastlabki 30 ta, eng oxirgisi tepada)
  useEffect(() => {
    if (isStory || !/^\d+$/.test(String(item.id))) {
      setCommentsLoading(false);
      return undefined;
    }
    let alive = true;
    setCommentsLoading(true);
    client
      .get(ENDPOINTS.INSTAGRAM.COMMENTS(item.id), { params: { limit: 30 }, silent: true })
      .then((r) => {
        if (!alive) return;
        const raw = r?.data?.comments || [];
        // Eng oxirgi izoh tepada tursin (sana bo'yicha kamayish tartibi)
        const sorted = [...raw].sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
        setComments(sorted);
        const cursor = r?.data?.nextCursor || r?.data?.paging?.cursors?.after;
        setAfterCursor(cursor || null);
        setHasMoreComments(Boolean(cursor));
      })
      .catch(() => {
        if (alive) setComments([]);
      })
      .finally(() => {
        if (alive) setCommentsLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [isStory, item.id]);

  // Aylana ichidagi + tugmasi: keyingi 30 ta izohni yuklash
  const loadMoreComments = async () => {
    if (loadingMore || !afterCursor) return;
    setLoadingMore(true);
    try {
      const r = await client.get(ENDPOINTS.INSTAGRAM.COMMENTS(item.id), {
        params: { limit: 30, after: afterCursor },
        silent: true,
      });
      const raw = r?.data?.comments || [];
      setComments((prev) => {
        const ids = new Set(prev.map((c) => c.id));
        const merged = [...prev];
        for (const it of raw) {
          if (!ids.has(it.id)) {
            merged.push(it);
            ids.add(it.id);
          }
        }
        return merged.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
      });
      const cursor = r?.data?.nextCursor || r?.data?.paging?.cursors?.after;
      setAfterCursor(cursor || null);
      setHasMoreComments(Boolean(cursor));
    } catch {
      // xato bo'lsa hech narsa buzilmaydi
    } finally {
      setLoadingMore(false);
    }
  };

  // Xatolik xabarini 7 soniyadan so'ng avtomatik yopish
  useEffect(() => {
    if (!likeWarning) return undefined;
    const t = setTimeout(() => setLikeWarning(null), 7000);
    return () => clearTimeout(t);
  }, [likeWarning]);

  // Layk bosish (Meta API ruxsatini tekshirish bilan)
  const toggleLike = async () => {
    const nextLiked = !isLiked;
    setIsLiked(nextLiked);
    setLikesCount((prev) => Math.max(0, prev + (nextLiked ? 1 : -1)));

    try {
      const res = nextLiked
        ? await client.post(ENDPOINTS.INSTAGRAM.LIKES(item.id), {}, { silent: true })
        : await client.delete(ENDPOINTS.INSTAGRAM.LIKES(item.id), { silent: true });

      // Agar Meta ruxsat bermasa (Authorization Error yoki success: false)
      if (res?.data?.success === false || res?.success === false) {
        setIsLiked(!nextLiked);
        setLikesCount((prev) => Math.max(0, prev + (nextLiked ? -1 : 1)));

        const rawErr = String(res?.data?.error || res?.error || "");
        const isAuthErr = rawErr.toLowerCase().includes("authorization") || rawErr.toLowerCase().includes("permission");
        setLikeWarning(
          isAuthErr
            ? "Meta ruxsati yetarli emas: Instagramda layk bosish uchun Meta ilovangizda 'instagram_manage_engagement' ruxsati yoqilgan bo'lishi kerak."
            : rawErr || "Instagram API orqali laykni o'zgartirib bo'lmadi."
        );
      } else {
        setLikeWarning(null);
        try {
          localStorage.setItem(`ig_liked_${item.id}`, String(nextLiked));
        } catch (_) {}
      }
    } catch (err) {
      setIsLiked(!nextLiked);
      setLikesCount((prev) => Math.max(0, prev + (nextLiked ? -1 : 1)));
      setLikeWarning(
        "Meta ruxsati yetarli emas: Instagramda layk bosish uchun Meta ilovangizda 'instagram_manage_engagement' ruxsati kerak."
      );
    }
  };

  // Saqlash (bookmark) tugmasi — ichi oq bo'lib to'ladi
  const toggleSave = () => {
    const nextSaved = !isSaved;
    setIsSaved(nextSaved);
    try {
      localStorage.setItem(`ig_saved_${item.id}`, String(nextSaved));
    } catch (_) {}
    setSavedCount((prev) => Math.max(0, prev + (nextSaved ? 1 : -1)));
  };

  // Izoh yuborish
  const submitComment = async (e) => {
    e?.preventDefault();
    const text = newCommentText.trim();
    if (!text || submittingComment) return;
    setSubmittingComment(true);
    try {
      const r = await client.post(ENDPOINTS.INSTAGRAM.COMMENTS(item.id), { message: text });
      const created = {
        id: r?.data?.id || `local-${Date.now()}`,
        text,
        timestamp: new Date().toISOString(),
        username: profile?.username || "doda.kino",
        like_count: 0,
      };
      // Yangi izoh eng tepaga joylashadi
      setComments((prev) => [created, ...prev]);
      setCommentsCount((c) => (c || 0) + 1);
      setNewCommentText("");
      setShowEmojis(false);
    } catch (err) {
      console.error("Izoh yuborishda xatolik:", err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const insertEmoji = (emoji) => {
    setNewCommentText((prev) => prev + emoji);
    commentInputRef.current?.focus();
  };

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

  const username = profile?.username || "doda.kino";
  const avatarUrl = profile?.profile_picture_url;

  return createPortal(
    <div className={styles.postViewerOverlay} onClick={onClose} role="dialog" aria-modal="true">
      <button
        type="button"
        className={styles.postViewerCloseBtn}
        onClick={onClose}
        aria-label="Yopish"
      >
        <TbX size={26} />
      </button>

      <div className={styles.postViewerBox} onClick={(e) => e.stopPropagation()}>
        {/* Chap taraf: Video yoki Rasm */}
        <div className={`${styles.mediaCol} ${isStory ? styles.mediaColStory : ""}`}>
          {isVideo && item.mediaUrl ? (
            <video
              src={item.mediaUrl}
              controls
              autoPlay
              loop
              playsInline
              poster={item.thumbnail || undefined}
            />
          ) : item.thumbnail ? (
            <img src={item.thumbnail} alt="" />
          ) : (
            <div className={styles.mediaPlaceholder}>
              <TbBrandInstagram size={48} />
            </div>
          )}
        </div>

        {/* O'ng taraf: Akkauntlar, Izoh, Commentlar, Layklar va Input */}
        <div className={styles.detailsCol}>
          {/* Tepada: Men va Collab akkauntlar nomi */}
          <div className={styles.postHeader}>
            <div className={styles.headerProfile}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className={styles.headerAvatar} />
              ) : (
                <div className={styles.headerAvatarPlaceholder}>
                  {username.charAt(0).toUpperCase()}
                </div>
              )}
              <div className={styles.headerMeta}>
                <div className={styles.headerAccountNames}>
                  <strong className={styles.primaryUser}>{username}</strong>
                  {collaborators && collaborators.length > 0 && (
                    <span className={styles.collabNamesRow}>
                      <span className={styles.collabWithText}>va</span>
                      {collaborators.map((c, i) => (
                        <span key={c.username} className={styles.collabChip}>
                          <span className={styles.collabHandle}>@{c.username}</span>
                          {c.status === "PENDING" && (
                            <span className={styles.pendingTag} title="Taklif hali qabul qilinmagan">
                              (kutilmoqda)
                            </span>
                          )}
                          {i < collaborators.length - 1 && <span className={styles.collabComma}>,</span>}
                        </span>
                      ))}
                    </span>
                  )}
                </div>
                <span className={styles.headerSubtitle}>Asl audio</span>
              </div>
            </div>

            {/* Uch nuqta amallar menyusi */}
            <div className={styles.moreMenuWrap}>
              <button
                type="button"
                className={styles.headerMoreBtn}
                onClick={() => setMenuOpen((o) => !o)}
                title="Qoʻshimcha amallar"
              >
                <TbDots size={20} />
              </button>
              {menuOpen && (
                <div className={styles.moreDropdown}>
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.dropdownItem}
                      onClick={() => setMenuOpen(false)}
                    >
                      <TbExternalLink size={16} /> Instagramda ochish
                    </a>
                  )}
                  <button
                    type="button"
                    className={`${styles.dropdownItem} ${styles.danger}`}
                    onClick={() => {
                      setMenuOpen(false);
                      remove();
                    }}
                  >
                    <TbTrash size={16} /> {isStory ? "Hikoyani oʻchirish" : "Postni oʻchirish"}
                  </button>
                  <button
                    type="button"
                    className={styles.dropdownItem}
                    onClick={() => {
                      setMenuOpen(false);
                      onClose?.();
                    }}
                  >
                    <TbX size={16} /> Yopish
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Izoh va Commentlar ro'yxati (scrollable) */}
          <div className={styles.commentsScrollArea}>
            {/* Akauntlar tagida izoh (post caption) */}
            {item.caption && (
              <div className={styles.captionBlock}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className={styles.commentAvatar} />
                ) : (
                  <div className={styles.commentAvatarPlaceholder}>
                    {username.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className={styles.captionContent}>
                  <div className={styles.captionText}>
                    <strong>{username}</strong> <span>{item.caption}</span>
                  </div>
                  <div className={styles.captionTime}>{when(item.timestamp)}</div>
                </div>
              </div>
            )}

            {/* Commentlar */}
            {commentsLoading ? (
              <div className={styles.commentsLoading}>
                <Loading message="Izohlar yuklanmoqda…" />
              </div>
            ) : comments.length === 0 ? (
              <div className={styles.noComments}>
                <span>Hozircha izohlar yoʻq</span>
              </div>
            ) : (
              comments.map((c) => (
                <div key={c.id} className={styles.commentItem}>
                  <div className={styles.commentAvatarPlaceholder}>
                    {(c.username || "U").charAt(0).toUpperCase()}
                  </div>
                  <div className={styles.commentBody}>
                    <div className={styles.commentText}>
                      <strong>{c.username || "foydalanuvchi"}</strong> <span>{c.text}</span>
                    </div>
                    <div className={styles.commentMeta}>
                      <span>{c.timestamp ? ago(c.timestamp) : "hozir"}</span>
                      {Number(c.like_count) > 0 && <span>{c.like_count} layk</span>}
                    </div>
                  </div>
                </div>
              ))
            )}

            {/* Aylana ichida + belgisi bor tugmacha — yana 30 tasini oladi */}
            {hasMoreComments && (
              <div className={styles.loadMoreWrap}>
                <button
                  type="button"
                  className={styles.loadMoreRoundBtn}
                  onClick={loadMoreComments}
                  disabled={loadingMore}
                  title="Yana 30 ta izoh yuklash"
                >
                  <TbPlus size={16} className={loadingMore ? styles.spinning : ""} />
                </button>
              </div>
            )}
          </div>

          {/* Pastda: Like, Comment, Samolyot va Saqlash tugmalari va sonlari */}
          <div className={styles.actionsFooter}>
            <div className={styles.actionBar}>
              <div className={styles.actionsLeft}>
                {/* Like: bosganda qizaradi, rostan ham API orqali bosiladi */}
                <div className={styles.actionCol}>
                  <button
                    type="button"
                    className={`${styles.actionBtn} ${isLiked ? styles.liked : ""}`}
                    onClick={toggleLike}
                    title="Layk"
                  >
                    {isLiked ? (
                      <TbHeartFilled size={24} style={{ color: "#ed4956" }} />
                    ) : (
                      <TbHeart size={24} />
                    )}
                  </button>
                  <span className={styles.actionCount}>{stat(likesCount)}</span>
                </div>

                {/* Comment: bosganda pastdagi inputga fokus beradi */}
                <div className={styles.actionCol}>
                  <button
                    type="button"
                    className={styles.actionBtn}
                    onClick={() => commentInputRef.current?.focus()}
                    title="Izoh yozish"
                  >
                    <TbMessageCircle size={24} />
                  </button>
                  <span className={styles.actionCount}>{stat(commentsCount)}</span>
                </div>

                {/* Samolyot (ulashish): ko'rinish va soni */}
                <div className={styles.actionCol}>
                  <button type="button" className={styles.actionBtn} title="Ulashish">
                    <TbSend size={24} />
                  </button>
                  <span className={styles.actionCount}>{stat(item.shares)}</span>
                </div>
              </div>

              {/* Saqlash tugmasi: saqlangan bo'lsa ichi oq bo'lib to'ladi */}
              <div className={styles.actionsRight}>
                <div className={styles.actionCol}>
                  <button
                    type="button"
                    className={`${styles.actionBtn} ${isSaved ? styles.saved : ""}`}
                    onClick={toggleSave}
                    title="Saqlash"
                  >
                    {isSaved ? (
                      <TbBookmarkFilled size={24} style={{ color: "#ffffff" }} />
                    ) : (
                      <TbBookmark size={24} />
                    )}
                  </button>
                  <span className={styles.actionCount}>{stat(savedCount)}</span>
                </div>
              </div>
            </div>

            {/* Sana */}
            <div className={styles.postFooterTime}>{when(item.timestamp)}</div>
            {likeWarning && (
              <div className={styles.likeWarningBox}>
                <span>{likeWarning}</span>
              </div>
            )}
          </div>

          {/* Eng pastda: Comment yozish inputi */}
          <form className={styles.commentInputRow} onSubmit={submitComment}>
            <div className={styles.emojiPickerWrap}>
              <button
                type="button"
                className={styles.emojiToggleBtn}
                onClick={() => setShowEmojis((v) => !v)}
                title="Smayllar"
              >
                <TbMoodSmile size={24} />
              </button>
              {showEmojis && (
                <div className={styles.quickEmojisBar}>
                  {["❤️", "🔥", "👏", "🎬", "🍿", "😍", "🙌", "✨"].map((em) => (
                    <button
                      key={em}
                      type="button"
                      className={styles.quickEmoji}
                      onClick={() => insertEmoji(em)}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <input
              ref={commentInputRef}
              type="text"
              className={styles.commentInputField}
              placeholder="Fikr bildiring…"
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
            />

            <button
              type="submit"
              className={styles.submitCommentBtn}
              disabled={!newCommentText.trim() || submittingComment}
            >
              {submittingComment ? "…" : "Joylash"}
            </button>
          </form>
        </div>
      </div>

      {confirmDialog}
    </div>,
    document.body
  );
}

/* ── Yangi post ───────────────────────────────────────────── */
const CAPTION_MAX = 2200; // Instagram chegarasi
const FILE_MAX = 100 * 1024 * 1024; // backenddagi chegara bilan bir xil
const COLLAB_MAX = 3; // Instagram chegarasi
const DEFAULT_COLLAB_ACCOUNTS = [
  { username: "mega_filmlar_", name: "Mega Filmlar", label: "Tavsiya etilgan hamkor" },
  { username: "shou_bisnes_yulduzlari", name: "Shou-biznes yulduzlari", label: "Tavsiya etilgan hamkor" },
  { username: "sekretvideo", name: "Sekret Video", label: "Tavsiya etilgan hamkor" },
];
const DEFAULT_POST_CAPTION = "✨ Kino kodi: 000\n🎬 Kinoni profilimizdagi botdan olishingiz mumkin! 🤖🍿";
const USERNAME_RE = /^[a-z0-9._]{1,30}$/; // backenddagi tekshiruv bilan bir xil

/**
 * Kiritilgan matnni hammualliflar ro'yxatiga qo'shadi: "@ali, vali" →
 * ["ali", "vali"]. Noto'g'ri username yoki chegaradan oshgani — xato matni.
 */
function mergeCollabs(list, raw) {
  const next = [...list];
  for (const part of String(raw).split(/[\s,]+/)) {
    const name = part.trim().replace(/^@+/, "").toLowerCase();
    if (!name || next.includes(name)) continue;
    if (!USERNAME_RE.test(name)) return { list, error: `“${part}” — notoʻgʻri Instagram username` };
    if (next.length >= COLLAB_MAX) return { list: next, error: `Eng koʻpi ${COLLAB_MAX} ta hammuallif` };
    next.push(name);
  }
  return { list: next, error: null };
}

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
const SOURCE_LABEL = {
  collab: "avvalgi hammuallif",
  invite: "sizga collab taklif yuborgan",
  comment: "postingizga izoh yozgan",
};

/**
 * Hammuallif yozilayotganda mos akkauntlar.
 *
 * Instagram API da erkin qidiruv yo'q: aniq username (biznes/kreator
 * akkaunt — rasm va obunachilar bilan) hamda biz bilan aloqada
 * bo'lganlar ichidan moslari keladi. Topilmasa ham yozilgan username
 * taklif qilinadi — shaxsiy ommaviy akkaunt ham hammuallif bo'la oladi.
 *
 * Yozish to'xtagach 350 ms kutiladi, eskirgan javob e'tiborsiz qoldiriladi.
 */
function useCollabSuggest(input, exclude) {
  const [state, setState] = useState({ q: "", exact: null, known: [], loading: false });
  const q = String(input).trim().replace(/^@+/, "").toLowerCase();
  const valid = q.length >= 2 && USERNAME_RE.test(q);

  useEffect(() => {
    if (!valid) {
      setState({ q: "", exact: null, known: [], loading: false });
      return undefined;
    }
    let alive = true;
    setState((s) => ({ ...s, loading: true }));
    const timer = setTimeout(() => {
      client
        .get(ENDPOINTS.INSTAGRAM.ACCOUNT_SEARCH, { params: { q }, silent: true })
        .then((r) => alive && setState({ q, exact: r?.data?.exact || null, known: r?.data?.known || [], loading: false }))
        .catch(() => alive && setState({ q, exact: null, known: [], loading: false }));
    }, 350);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [q, valid]);

  const defaultOptions = DEFAULT_COLLAB_ACCOUNTS
    .filter((d) => !exclude.includes(d.username) && (!q || d.username.includes(q)))
    .map((d) => ({
      kind: "default",
      username: d.username,
      name: d.name,
      label: d.label,
    }));

  if (!valid) {
    return {
      options: defaultOptions,
      loading: false,
    };
  }

  const current = state.q === q; // javob hozirgi matnga tegishlimi
  const options = [];

  // Tavsiya etilgan hamkorlardan mos kelganlarini oldinga qo'yamiz
  defaultOptions.forEach((d) => options.push(d));

  if (current && state.exact && !options.some((o) => o.username === state.exact.username)) {
    options.push({ kind: "exact", ...state.exact });
  }
  if (current) {
    state.known.forEach((k) => {
      if (!options.some((o) => o.username === k.username)) {
        options.push({ kind: "known", ...k });
      }
    });
  }
  if (current && !state.exact && !state.loading && !options.some((o) => o.username === q)) {
    options.push({ kind: "manual", username: q });
  }

  return {
    options: options.filter((o) => !exclude.includes(o.username)),
    loading: state.loading || !current,
  };
}

function NewPostModal({ onClose, onPublished }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [caption, setCaption] = useState(DEFAULT_POST_CAPTION);
  const [collabs, setCollabs] = useState([]);
  const [collabInput, setCollabInput] = useState("");
  const [collabError, setCollabError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);
  const videoRef = useRef(null);

  const addCollabs = (raw) => {
    const { list, error: err } = mergeCollabs(collabs, raw);
    setCollabs(list);
    setCollabError(err);
    if (!err) setCollabInput("");
    return { list, err };
  };

  const [suggestOpen, setSuggestOpen] = useState(false);
  const [hi, setHi] = useState(0); // klaviatura bilan tanlangan qator
  const { options: suggestions, loading: suggesting } = useCollabSuggest(collabInput, collabs);
  const showSuggest =
    suggestOpen && !busy && collabs.length < COLLAB_MAX && (suggestions.length > 0 || suggesting);

  const pickSuggestion = (o) => {
    const { list } = addCollabs(o.username);
    // Collabchi tanlangandan keyin ham taklif qilinganlar ro'yxati ochiq tursin
    if (list && list.length < COLLAB_MAX) {
      setSuggestOpen(true);
    } else {
      setSuggestOpen(false);
    }
    setHi(0);
  };

  const onCollabKey = (e) => {
    if (showSuggest && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      e.preventDefault();
      const last = Math.max(0, suggestions.length - 1);
      setHi((h) => (e.key === "ArrowDown" ? Math.min(h + 1, last) : Math.max(h - 1, 0)));
      return;
    }
    if (showSuggest && e.key === "Escape") {
      // Faqat ro'yxat yopiladi — oyna emas
      e.preventDefault();
      e.nativeEvent.stopPropagation();
      setSuggestOpen(false);
      return;
    }
    if (showSuggest && e.key === "Enter" && suggestions[hi]) {
      e.preventDefault();
      pickSuggestion(suggestions[hi]);
      return;
    }
    if (e.key === "Enter" || e.key === "," || e.key === " ") {
      e.preventDefault();
      if (collabInput.trim()) addCollabs(collabInput);
    } else if (e.key === "Backspace" && !collabInput && collabs.length) {
      setCollabs(collabs.slice(0, -1));
      setCollabError(null);
    }
  };

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
    // Maydonda yozilib, Enter bosilmay qolgan username ham hisobga olinadi
    let finalCollabs = collabs;
    if (collabInput.trim()) {
      const { list, err } = addCollabs(collabInput);
      if (err) return;
      finalCollabs = list;
    }
    setBusy(true);
    setProgress(0);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("media", file);
      if (caption.trim()) fd.append("caption", caption.trim());
      if (finalCollabs.length) fd.append("collaborators", JSON.stringify(finalCollabs));
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

          <div className="field">
            <div className={styles.collabHeader}>
              <span>Hammualliflar (collab)</span>
              <span className={styles.collabCount}>{collabs.length} / {COLLAB_MAX}</span>
            </div>

            {/* Tanlangan hammualliflar — input tepasida alohida chiplar ko'rinishida */}
            {collabs.length > 0 && (
              <div className={styles.collabChips}>
                {collabs.map((name) => (
                  <span key={name} className={styles.collabChip}>
                    <TbBrandInstagram size={14} className={styles.chipBrand} />
                    <strong>@{name}</strong>
                    {!busy && (
                      <button
                        type="button"
                        aria-label={`@${name} ni olib tashlash`}
                        title="Olib tashlash"
                        onClick={() => {
                          setCollabs(collabs.filter((n) => n !== name));
                          setCollabError(null);
                        }}
                      >
                        <TbX size={12} />
                      </button>
                    )}
                  </span>
                ))}
              </div>
            )}

            {/* Input qismi — toza, zamonaviy fokus halqasi bilan */}
            {collabs.length < COLLAB_MAX ? (
              <div className={styles.collabInputWrap}>
                <input
                  className={styles.collabInput}
                  value={collabInput}
                  onChange={(e) => {
                    setCollabInput(e.target.value);
                    setCollabError(null);
                    setSuggestOpen(true);
                    setHi(0);
                  }}
                  onKeyDown={onCollabKey}
                  onBlur={() => setSuggestOpen(false)}
                  onFocus={() => {
                    setSuggestOpen(true);
                    setHi(0);
                  }}
                  placeholder={
                    collabs.length
                      ? "Yana boshqa username yozing yoki pastdan tanlang…"
                      : "Username yozing yoki tavsiyalardan tanlang…"
                  }
                  disabled={busy}
                  autoComplete="off"
                  spellCheck={false}
                  role="combobox"
                  aria-controls="collab-suggest"
                  aria-expanded={showSuggest}
                  aria-autocomplete="list"
                />

                {showSuggest && (
                  <div id="collab-suggest" className={styles.suggest} role="listbox">
                    <div className={styles.suggestHeader}>
                      <span>Tavsiya etilgan hamkorlar</span>
                      <button
                        type="button"
                        className={styles.suggestCloseBtn}
                        title="Roʻyxatni yopish (Esc)"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => setSuggestOpen(false)}
                      >
                        <TbX size={14} />
                      </button>
                    </div>
                    {suggestions.map((o, i) => (
                      <button
                        key={`${o.kind}-${o.username}`}
                        type="button"
                        role="option"
                        aria-selected={i === hi}
                        className={`${styles.suggestItem} ${i === hi ? styles.suggestActive : ""}`}
                        onMouseDown={(e) => e.preventDefault()}
                        onMouseEnter={() => setHi(i)}
                        onClick={() => pickSuggestion(o)}
                      >
                        <span className={styles.suggestAvatar}>
                          {o.picture ? <img src={o.picture} alt="" /> : o.username[0].toUpperCase()}
                        </span>
                        <span className={styles.suggestText}>
                          <strong>@{o.username}</strong>
                          <small>
                            {o.kind === "default"
                              ? (o.label || "Tavsiya etilgan hamkor")
                              : o.kind === "exact"
                              ? [o.name, o.followers != null ? `${compact(o.followers)} obunachi` : null].filter(Boolean).join(" · ")
                              : o.kind === "known"
                                ? SOURCE_LABEL[o.source] || "aloqada boʻlgan"
                                : "Biznes akkaunt sifatida topilmadi — shaxsiy boʻlsa ham qoʻshish mumkin"}
                          </small>
                        </span>
                      </button>
                    ))}
                    {suggesting && <div className={styles.suggestHint}>Qidirilmoqda…</div>}
                  </div>
                )}
              </div>
            ) : (
              <div className={styles.collabMaxNotice}>
                Maksimal {COLLAB_MAX} ta hammuallif tanlandi (Instagram limiti toʻldi)
              </div>
            )}

            <small className={collabError ? styles.collabError : undefined}>
              {collabError ||
                `Instagram rasmiy qoidasiga koʻra bitta postga eng koʻpi bilan ${COLLAB_MAX} tagacha hammuallif qoʻshish mumkin. Ularga taklif boradi.`}
            </small>
          </div>

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
