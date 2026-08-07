import React from "react";
import Button from "../../../components/ui/Button";
import styles from "../index.module.scss";

function FilmDetailPanel({ film, onClose, onEdit, onDelete, onEpisodeClick, onAddEpisode }) {
  if (!film) return null;

  const sortedEpisodes = [...(film.episodes || [])].sort(
    (a, b) => a.episodeNumber - b.episodeNumber
  );

  return (
    <div className={styles.panel_overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.panel_header}>
          <div>
            <h2 className={styles.panel_title}>{film.name}</h2>
            <p className={styles.panel_subtitle}>{film.originalName}</p>
          </div>
          <button className={styles.panel_close} onClick={onClose}>✕</button>
        </div>

        <div className={styles.panel_body}>
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
        </div>
      </div>
    </div>
  );
}

export default FilmDetailPanel;
