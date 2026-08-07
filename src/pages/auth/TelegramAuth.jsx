import { useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import AdminService from "../../api/services/authService";
import styles from "./index.module.scss";

function TelegramAuth() {
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const authenticate = async () => {
      try {
        const queryParams = new URLSearchParams(location.search);
        const token = queryParams.get("token");

        if (!token) {
          setStatus("error");
          setError("Telegram token topilmadi.");
          return;
        }

        const response = await AdminService.telegramAuth(token);
        
        if (response.data?.success) {
          setStatus("success");
          setTimeout(() => {
            navigate("/dashboard", { replace: true });
          }, 1500);
        } else {
          setStatus("error");
          setError("Telegram orqali tizimga kirishda xatolik yuz berdi.");
        }
      } catch (err) {
        setStatus("error");
        setError(err?.response?.data?.message || err?.message || "Telegram login token yaroqsiz yoki eskirgan.");
      }
    };

    authenticate();
  }, [location, navigate]);

  return (
    <main className={styles.wrapper}>
      <section className={styles.container}>
        <div className={styles.left} style={{ justifyContent: "center", alignItems: "center", textAlign: "center" }}>
          {status === "loading" && (
            <div>
              <h1 className={styles.title} style={{ marginBottom: "20px" }}>Telegram orqali ulanmoqda...</h1>
              <p className={styles.text}>Iltimos, kutib turing.</p>
            </div>
          )}

          {status === "success" && (
            <div>
              <h1 className={styles.title} style={{ marginBottom: "20px", color: "var(--color-success)" }}>
                Muvaffaqiyatli uladingiz!
              </h1>
              <p className={styles.text}>Boshqaruv paneliga yo'naltirilmoqdasiz...</p>
            </div>
          )}

          {status === "error" && (
            <div>
              <h1 className={styles.title} style={{ marginBottom: "20px", color: "var(--color-danger)" }}>
                Xatolik yuz berdi
              </h1>
              <p className={styles.text} style={{ marginBottom: "30px" }}>{error}</p>
              <Link to="/auth" className={styles.button} style={{ textDecoration: "none", display: "inline-block" }}>
                Ortga qaytish
              </Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default TelegramAuth;
