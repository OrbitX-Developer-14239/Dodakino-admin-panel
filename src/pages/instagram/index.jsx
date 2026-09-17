import { useState, useEffect } from "react";
import { TbBrandInstagram, TbPhoto, TbRefresh, TbUserPlus, TbUsers } from "react-icons/tb";
import styles from "./index.module.scss";
import { Card, Empty, ErrorBox, Loading, PageHead, Stat } from "../../components/ui";
import { num } from "../../utils/format";
import InstagramService from "../../api/services/instagramService";

/**
 * Instagram profili.
 *
 * Uchta raqam ilgari avatar yonidagi mayda ustunchalar edi va profil
 * nomi bilan bir xil og'irlikda ko'rinardi. Endi ular Stat
 * kartochkalarida — panelning boshqa sahifalaridagi ko'rsatkichlar
 * bilan bir xil o'lchov va joylashuvda.
 */
function InstagramPage() {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProfile = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await InstagramService.getProfile();
      setProfile(res?.data || null);
    } catch (error) {
      console.error("Instagram ma'lumotlarini yuklashda xatolik:", error);
      setError(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  return (
    <>
      <PageHead>
        <button type="button" className="btn ghost sm" onClick={fetchProfile} disabled={isLoading}>
          <TbRefresh size={14} /> Yangilash
        </button>
      </PageHead>

      <ErrorBox error={error} onRetry={fetchProfile} />

      <Card title="Instagram profil" icon={TbBrandInstagram}>
        {isLoading ? (
          <Loading rows={2} />
        ) : profile ? (
          <div className={styles.profile}>
            <div className={styles.avatar} aria-hidden="true">
              {profile.username?.charAt(0)?.toUpperCase()}
            </div>
            <div className={styles.identity}>
              <p className={styles.handle}>@{profile.username}</p>
              <p className="hint">{profile.fullName}</p>
            </div>
          </div>
        ) : (
          <Empty icon={TbBrandInstagram}>
            Instagram ma'lumotlari topilmadi — API ulanishini tekshiring
          </Empty>
        )}
      </Card>

      {!isLoading && profile && (
        <div className="grid c3">
          <Stat icon={TbUsers} label="Obunachilar" value={num(profile.followersCount)} />
          <Stat
            icon={TbUserPlus}
            label="Kuzatuvchilar"
            value={num(profile.followingCount)}
            tone="info"
          />
          <Stat icon={TbPhoto} label="Postlar" value={num(profile.postsCount)} tone="ok" />
        </div>
      )}
    </>
  );
}

export default InstagramPage;
