import React, { useState, useEffect } from "react";
import styles from "./index.module.scss";
import Card from "../../components/ui/Card";
import InstagramService from "../../api/services/instagramService";

function InstagramPage() {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      const res = await InstagramService.getProfile();
      setProfile(res?.data || null);
    } catch (error) {
      console.error("Instagram ma'lumotlarini yuklashda xatolik:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  return (
    <div className={styles.wrapper}>
      <Card title="Instagram Profil">
        {isLoading ? (
          <p>Yuklanmoqda...</p>
        ) : profile ? (
          <div className={styles.profile_info}>
            <div className={styles.avatar_placeholder}>
              {profile.username?.charAt(0)?.toUpperCase()}
            </div>
            <div className={styles.details}>
              <h3>@{profile.username}</h3>
              <p>{profile.fullName}</p>
              
              <div className={styles.stats}>
                <div className={styles.stat_box}>
                  <strong>{profile.followersCount}</strong>
                  <span>Obunachilar</span>
                </div>
                <div className={styles.stat_box}>
                  <strong>{profile.followingCount}</strong>
                  <span>Kuzatuvchilar</span>
                </div>
                <div className={styles.stat_box}>
                  <strong>{profile.postsCount}</strong>
                  <span>Postlar</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p>Instagram ma'lumotlari topilmadi. (API ulanishini tekshiring)</p>
        )}
      </Card>
    </div>
  );
}

export default InstagramPage;
