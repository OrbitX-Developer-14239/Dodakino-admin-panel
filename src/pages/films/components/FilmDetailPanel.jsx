import React, { useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "../../../components/ui";
import { lockScroll } from "../../../utils/scrollLock";
import { usePresence } from "../../../hooks/usePresence";
import styles from "../index.module.scss";

/**
 * Filmning yon paneli.
 *
 * PORTAL VA SCROLL QULFI — ikkalasi ham shart:
 *
 *   1) Sahifa `.page-transition` ichida chiziladi va uning animatsiyasi
 *      oxirida `transform` qoladi. Transformli ota element ichidagi
 *      `position: fixed` ekranga emas, SHU BLOKKA bog'lanadi. Natijada
 *      overlay ekranni emas, butun sahifa balandligini qoplardi va
 *      sahifa bilan birga surilib, panel tepaga ketib qolardi.
 *      <body> ga portal qilinganda bu muammo butunlay yo'qoladi —
 *      umumiy Modal komponenti ham aynan shunday ishlaydi.
 *
 *   2) Panel ochiqligida orqadagi sahifa surilmasligi kerak — aks holda
 *      panel ichini aylantirmoqchi bo'lgan foydalanuvchi ro'yxatni
 *      aylantirib yuborardi.
 *
 * SILLIQ YOPILISH: panel yopilganda o'ngga qaytib ketadi. Buning uchun
 * animatsiya tugaguncha oxirgi film eslab qolinadi (ota komponent uni
 * allaqachon null qilgan bo'lishi mumkin) va X/fon/Escape bosilganda
 * onClose animatsiyadan KEYIN chaqiriladi.
 */
const PANEL_EXIT_MS = 200;

/**
 * Yuklanish holati.
 *
 * Ro'yxatdagi qatorda qismlar, mamlakat va tavsif yo'q — ular alohida
 * so'rov bilan keladi. Ilgari shu vaqt ichida panel "Qismlar (0)",
 * "Hali qismlar qo'shilmagan" va "Mamlakat: —" ni ko'rsatardi, ya'ni
 * yolg'on ma'lumot. Endi ro'yxatdagi kabi yaltiraydigan joy egallovchilar.
 */
function PanelSkeleton() {
  return (
    <div className={styles.panel_skeleton} aria-busy="true" aria-label="Yuklanmoqda">
      <div className={styles.film_meta_grid}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={`skeleton ${styles.sk_meta}`} style={{ "--i": i }} />
        ))}
      </div>
      <div className={styles.sk_row}>
        {[70, 90, 60].map((w, i) => (
          <div key={i} className={`skeleton ${styles.sk_tag}`} style={{ width: w, "--i": i }} />
        ))}
      </div>
      <div className={`skeleton ${styles.sk_block}`} />
      <div className={styles.sk_row}>
        <div className={`skeleton ${styles.sk_button}`} />
        <div className={`skeleton ${styles.sk_button}`} />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className={`skeleton ${styles.sk_episode}`} style={{ "--i": i }} />
      ))}
    </div>
  );
}

function FilmDetailPanel({ film: filmProp, loading = false, onClose, onEdit, onDelete, onEpisodeClick, onAddEpisode }) {
  const shown = Boolean(filmProp);

  const lastFilm = useRef(filmProp);
  if (filmProp) lastFilm.current = filmProp;
  const film = filmProp || lastFilm.current;

  const closingByUser = useRef(false);
  const { mounted, leaving, leave } = usePresence(shown, {
    exitMs: PANEL_EXIT_MS,
    onExited: () => {
      if (closingByUser.current) {
        closingByUser.current = false;
        onClose?.();
      }
    },
  });

  const requestClose = useCallback(() => {
    if (leaving) return;
    closingByUser.current = true;
    leave();
  }, [leaving, leave]);

  useEffect(() => {
    if (!mounted) return undefined;
    return lockScroll();
  }, [mounted]);

  useEffect(() => {
    if (!mounted || leaving) return undefined;
    const onKey = (e) => e.key === "Escape" && requestClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mounted, leaving, requestClose]);

  if (!mounted || !film) return null;

  const sortedEpisodes = [...(film.episodes || [])].sort(
    (a, b) => a.episodeNumber - b.episodeNumber
  );

  return createPortal(
    <div className={styles.panel_overlay} onClick={requestClose} data-leaving={leaving || undefined}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.panel_header}>
          <div>
            <h2 className={styles.panel_title}>{film.name}</h2>
            <p className={styles.panel_subtitle}>{film.originalName}</p>
          </div>
          <button className={styles.panel_close} onClick={requestClose}>✕</button>
        </div>

        <div className={styles.panel_body}>
          {loading ? <PanelSkeleton /> : (<>
          {/* Film meta */}
          <div className={styles.film_meta_grid}>
            <div className={styles.meta_item}>
              <span className={styles.meta_label}>Kod</span>
              <span className={styles.meta_value}>{film.code}</span>
            </div>
            <div className={styles.meta_item}>
              <span className={styles.meta_label}>Yil</span>
              <span className={styles.meta_value}>{film.year}</span>
            </div>
            <div className={styles.meta_item}>
              <span className={styles.meta_label}>Mamlakat</span>
              <span className={styles.meta_value}>{film.country || "—"}</span>
            </div>
            <div className={styles.meta_item}>
              <span className={styles.meta_label}>Ko'rishlar</span>
              <span className={styles.meta_value}>{film.views ?? 0}</span>
            </div>
            <div className={styles.meta_item}>
              <span className={styles.meta_label}>Qismlar soni</span>
              <span className={styles.meta_value}>
                {film.episodesCount ?? (film.episodes?.length || 0)}
              </span>
            </div>
          </div>

          {/* Janrlar */}
          {film.genres?.length > 0 && (
            <div className={styles.genres_row}>
              {film.genres.map((g) => (
                <span key={g} className={styles.genre_tag}>{g}</span>
              ))}
            </div>
          )}

          {/* Ta'rif */}
          {film.description && (
            <div className={styles.description_box}>
              <p className={styles.meta_label}>Ta'rif</p>
              <p className={styles.description_text}>{film.description}</p>
            </div>
          )}

          {/* Amallar */}
          <div className={styles.panel_actions}>
            <Button variant="ghost" onClick={() => onEdit(film)}>✏️ Tahrirlash</Button>
            <Button variant="danger" onClick={() => onDelete(film._id)}>🗑 O'chirish</Button>
          </div>

          {/* Epizodlar */}
          <div className={styles.episodes_section}>
            <div className={styles.episodes_header}>
              <h3 className={styles.episodes_title}>
                Qismlar ({sortedEpisodes.length})
              </h3>
              <Button variant="primary" onClick={() => onAddEpisode(film)}>
                + Qism qo'shish
              </Button>
            </div>

            {sortedEpisodes.length === 0 ? (
              <div className={styles.empty_episodes}>
                <p>Hali qismlar qo'shilmagan</p>
              </div>
            ) : (
              <div className={styles.episodes_list}>
                {sortedEpisodes.map((ep) => (
                  <div
                    key={ep.code}
                    className={styles.episode_row}
                    onClick={() => onEpisodeClick(ep)}
                  >
                    <div className={styles.ep_number}>{ep.episodeNumber}</div>
                    <div className={styles.ep_info}>
                      <span className={styles.ep_name}>{ep.name}</span>
                      <span className={styles.ep_code}>Kod: {ep.code}</span>
                    </div>
                    <span className={styles.ep_arrow}>›</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          </>)}
        </div>
      </div>
    </div>,
    document.body
  );
}

export default FilmDetailPanel;
