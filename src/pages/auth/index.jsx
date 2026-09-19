import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import styles from "./index.module.scss";
import Asset from "@asset";
import AdminService from "../../api/services/authService";
import { startTelegramLoginSession } from "../../api/telegramLoginSocket";
import { preloadRouteByPath } from "../../router/routes";

/**
 * Kirish sahifasi.
 *
 * Chapda forma, o'ngda illyustratsiya. Asosiy yo'l — administrator
 * nomi va paroli. Ikkinchi yo'l — Telegram: bot havolasi ochiladi,
 * kirish botda tasdiqlanadi va panel o'zi ichkariga o'tadi.
 */
function Auth() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [tgState, setTgState] = useState(null); // null | { status, link }
  const stopTelegram = useRef(null);
  const rememberRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Login muvaffaqiyatli bo'lsa keyingi manzil aniq — dashboard.
    // Uni hozirdanoq fonda yuklab qo'yamiz: navigate() paytida chunk
    // tayyor bo'ladi va o'tish kechikishsiz sodir bo'ladi.
    preloadRouteByPath("/dashboard");
    // Sahifadan chiqilsa Telegram kutish sessiyasi yopiladi
    return () => stopTelegram.current?.();
  }, []);

  const goInside = () => {
    // Foydalanuvchi qaysi sahifaga kirmoqchi bo'lgan bo'lsa —
    // o'shanga qaytadi, aks holda boshqaruv paneliga.
    const from = location.state?.from;
    navigate(from && from !== "/auth" ? from : "/dashboard", { replace: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const formData = new FormData(e.target);

    try {
      await AdminService.login(
        {
          username: formData.get("username"),
          password: formData.get("password"),
        },
        formData.get("rememberMe") === "on"
      );
      goInside();
    } catch (err) {
      setError(err?.message || "Login yoki parol notoʻgʻri. Qaytadan urinib koʻring.");
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithTelegram = () => {
    setError("");
    stopTelegram.current?.();
    setTgState({ status: "starting" });

    stopTelegram.current = startTelegramLoginSession({
      onUpdate: (state) => {
        setTgState(state);
        // Havola yangi varaqda ochiladi — panel shu yerda kutib turadi
        if (state.link) window.open(state.link, "_blank", "noopener");
      },
      onDone: ({ accessToken }) => {
        AdminService.acceptToken(accessToken, rememberRef.current?.checked !== false);
        goInside();
      },
      onError: (err) => {
        setTgState(null);
        setError(err?.message || "Telegram orqali kirib boʻlmadi");
      },
    });
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
              Troya Admin boshqaruv paneli. Davom etish uchun administrator nomi va parolini kiriting.
            </p>
          </header>

          <form
            className={styles.form}
            onSubmit={handleSubmit}
            aria-label="Administrator tizimiga kirish formasi"
            noValidate
          >
            {error && (
              <div className={styles.error_message} role="alert">
                <Asset.Icon
                  name="info"
                  fill={"var(--color-danger-text)"}
                  className={styles.error_icon}
                  aria-hidden="true"
                />
                <span className={styles.error_text}>{error}</span>
              </div>
            )}

            <div className={styles.form_container}>
              <label htmlFor="username" className={styles.input_label}>
                <Asset.Icon
                  name="user"
                  className={styles.icon}
                  aria-hidden="true"
                  fill={"transparent"}
                  stroke={"2px solid var(--color-text-secondary)"}
                />
                <span className={styles.text}>Administrator nomi</span>
                <input
                  id="username"
                  name="username"
                  type="text"
                  className={styles.input}
                  placeholder=" "
                  autoComplete="username"
                  required
                  aria-required="true"
                />
              </label>

              <label htmlFor="password" className={styles.input_label}>
                <span className={styles.text}>Administrator paroli</span>
                <Asset.Icon
                  name="lock"
                  className={styles.icon}
                  aria-hidden="true"
                  fill={"transparent"}
                  stroke={"0.7px solid var(--color-text-secondary)"}
                />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  className={styles.input}
                  placeholder=" "
                  autoComplete="current-password"
                  required
                  aria-required="true"
                />
                <button
                  type="button"
                  className={styles.button}
                  // onMouseDown → preventDefault: usiz tugmani bosganda
                  // input fokusni yo'qotardi va suzuvchi yorliq
                  // (floating label) bir lahzaga sakrab tushardi.
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    e.preventDefault();
                    setShowPassword((prev) => !prev);
                  }}
                  aria-label={showPassword ? "Parolni yashirish" : "Parolni koʻrsatish"}
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
                <input
                  ref={rememberRef}
                  id="rememberMe"
                  name="rememberMe"
                  type="checkbox"
                  className={styles.checkbox_input}
                  aria-label="Meni eslab qolish"
                  defaultChecked
                />
                <span className={styles.text}>Eslab qolish</span>
              </label>
            </div>

            <button
              type="submit"
              title="Tizimga kirish"
              className={styles.button}
              aria-label="Administrator sifatida tizimga kirish"
              disabled={isLoading}
            >
              {isLoading ? "Kirilmoqda..." : "Kirish"}
            </button>
          </form>

          <div className={styles.other_line} aria-hidden="true">
            <span className={styles.line} />
            <span className={styles.text}>yoki</span>
            <span className={styles.line} />
          </div>

          <div className={styles.other_login}>
            <button
              type="button"
              className={styles.other_button}
              onClick={loginWithTelegram}
              disabled={tgState?.status === "starting"}
            >
              <Asset.Icon name="telegram" className={styles.icon} aria-hidden="true" />
              {tgState?.status === "awaiting"
                ? "Botda tasdiqlang — kutilmoqda…"
                : tgState?.status === "starting"
                  ? "Havola tayyorlanmoqda…"
                  : "Telegram orqali kirish"}
            </button>

            {/* Brauzer yangi varaqni to'sib qo'ygan bo'lishi mumkin —
                havola qo'lda ochish uchun ham ko'rinib turadi */}
            {tgState?.link && (
              <p className={styles.tg_hint}>
                Bot ochilmadimi?{" "}
                <a className="link" href={tgState.link} target="_blank" rel="noopener noreferrer">
                  Havolani oching
                </a>{" "}
                va “Kirish” tugmasini bosing.
              </p>
            )}
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
