import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import io from "socket.io-client";
import styles from "./index.module.scss";
import Asset from "@asset";
import AdminService from "../../api/services/authService";
import { TokenManager } from "../../api/tokenManager";

function Auth() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const [socket, setSocket] = useState(null);
  const [isWaitingForTelegram, setIsWaitingForTelegram] = useState(false);

  useEffect(() => {
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [socket]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const formData = new FormData(e.target);
    const username = formData.get("username");
    const password = formData.get("password");
    const rememberMe = formData.get("rememberMe") === "on";

    try {
      await AdminService.login({ username, password }, rememberMe);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Login yoki parol noto'g'ri kiritildi. Iltimos, qaytadan urinib ko'ring.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTelegramLogin = async () => {
    try {
      setError("");
      setIsWaitingForTelegram(true);
      
      const response = await AdminService.requestTelegramLogin();
      const payload = response.data?.data || response.data;
      
      if (payload?.loginLink && payload?.authSessionToken) {
        const w = 500;
        const h = 600;
        const left = window.screen.width / 2 - w / 2;
        const top = window.screen.height / 2 - h / 2;
        window.open(payload.loginLink, "TelegramLogin", `width=${w},height=${h},top=${top},left=${left}`);

        // Connect to Socket
        const backendUrl = (process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
        const newSocket = io(backendUrl);
        setSocket(newSocket);

        newSocket.on("connect", () => {
          newSocket.emit("join_auth", payload.authSessionToken);
        });

        newSocket.on("auth_success", (data) => {
          if (data?.success && data?.data?.accessToken) {
            TokenManager.setTokens(data.data.accessToken, data.data.refreshToken, true);
            newSocket.disconnect();
            navigate("/dashboard", { replace: true });
          }
        });

        newSocket.on("auth_error", () => {
          setIsWaitingForTelegram(false);
          newSocket.disconnect();
        });
      } else {
        setError("Bot manzili olinmadi. Keyinroq urinib ko'ring.");
        setIsWaitingForTelegram(false);
      }
    } catch (err) {
      setError("Telegram orqali ulanishda xatolik yuz berdi.");
      setIsWaitingForTelegram(false);
    }
  };

  return (
    <main className={styles.wrapper}>
      <section className={styles.container} aria-labelledby="login-title" aria-describedby="login-description">
        <div className={styles.left}>
          <header className={styles.top}>
            <h1 id="login-title" className={styles.title}>
              Tizimga kirish
            </h1>

            <p id="login-description" className={styles.text}>
              Administrator nomi va paroli yoki Telegram hisobi orqali tizimga kiring.
            </p>
          </header>

          <form className={styles.form} onSubmit={handleSubmit} aria-label="Administrator tizimiga kirish formasi" noValidate>
            {error && (
              <div className={styles.error_message} role="alert">
                <Asset.Icon name="info" stroke={"1px var(--color-danger)"} fill={"var(--color-danger)"} className={styles.error_icon} aria-hidden="true" />
                <span className={styles.error_text}>{error}</span>
              </div>
            )}

            <div className={styles.form_container}>
              <label htmlFor="username" className={styles.input_label}>
                <Asset.Icon name="user" className={styles.icon} aria-hidden="true" fill={"transparent"} stroke={"2px solid var(--color-text-secondary)"} />
                <span className={styles.text}>Administrator nomi</span>
                <input id="username" name="username" type="text" className={styles.input} placeholder=" " autoComplete="username" required aria-required="true" aria-label="Administrator istrator nomi" />
              </label>

              <label htmlFor="password" className={styles.input_label}>
                <span className={styles.text}>Administrator  paroli</span>
                <Asset.Icon name="lock" className={styles.icon} aria-hidden="true" fill={"transparent"} stroke={"0.7px solid var(--color-text-secondary)"} />
                <input id="password" name="password" type={showPassword ? "text" : "password"} className={styles.input} placeholder=" " autoComplete="current-password" required aria-required="true" aria-label="Administrator istrator paroli" />
                <button
                className={styles.button}
                  role="button"
                  tabIndex={0}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    e.preventDefault();
                    setShowPassword((prev) => !prev);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setShowPassword((prev) => !prev);
                    }
                  }}
                  aria-label={showPassword ? "Parolni yashirish" : "Parolni ko'rsatish"}
                >
                  {showPassword ? (
                    <Asset.Icon
                      name="eye"
                      className={styles.eye}
                      aria-hidden="true"
                      focusable="false"
                      fill={"var(--color-text-muted)"}
                    />
                  ) : (
                    <Asset.Icon
                      name="eye-slash"
                      className={styles.eye}
                      aria-hidden="true"
                      focusable="false"
                      width={"20px"}
                      height={"20px"}
                      fill={"var(--color-text-muted)"}
                    />
                  )}
                </button>
              </label>

              <label htmlFor="rememberMe" className={styles.checkbox_label}>
                <input id="rememberMe" name="rememberMe" type="checkbox" className={styles.checkbox_input} aria-label="Meni eslab qolish" />
                <span className={styles.text}>Eslab qolish</span>
              </label>
            </div>

            <button type="submit" title="Tizimga kirish" className={styles.button} aria-label="Administrator istrator sifatida tizimga kirish" disabled={isLoading}>
              {isLoading ? "Kirilmoqda..." : "Kirish"}
            </button>
          </form>

          <div className={styles.other_line} aria-label="Boshqa kirish usullari">
            <div className={styles.line} aria-hidden="true"></div>
            <p className={styles.text}>Boshqa yo'l bilan kirish</p>
            <div className={styles.line} aria-hidden="true"></div>
          </div>

          <div className={styles.other_login}>
            <button type="button" onClick={handleTelegramLogin} title="Telegram orqali kirish" className={styles.other_button} aria-label="Telegram orqali tizimga kirish" disabled={isWaitingForTelegram}>
              <Asset.Icon name="telegram" className={styles.icon} aria-hidden="true" focusable="false" />
              {isWaitingForTelegram ? "Telegramda kutilmoqda..." : "Telegram orqali kirish"}
            </button>
          </div>
        </div>

        <aside className={styles.right} aria-hidden="true">
          <Asset.Icon name="ilustration-auth" className={styles.ilustration} aria-hidden="true" focusable="false" />
        </aside>
      </section>
    </main>
  );
} 

export default Auth;