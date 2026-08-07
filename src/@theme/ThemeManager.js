const STORAGE_KEY = "theme";
const EVENT_NAME = "themechange";
const VALID_MODES = ["light", "dark", "auto"];

class ThemeManager {
  constructor() {
    this._mode = this._readStoredMode();
    this._animation = true;
    this._pendingTransition = null;
    this._mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    this._reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    this._listeners = new Set();

    // Agar localStorage'da umuman qiymat bo'lmasa, "auto"ni yozib qo'yamiz
    if (!localStorage.getItem(STORAGE_KEY)) {
      localStorage.setItem(STORAGE_KEY, this._mode);
    }

    // Tizim mavzusi o'zgarsa (auto rejimda) qayta render qilish
    this._mediaQuery.addEventListener("change", () => {
      if (this._mode === "auto") this._applyTheme();
    });

    // Boshqa komponentlardan kelgan o'zgarishlarni tinglash
    window.addEventListener(EVENT_NAME, () => {
      this._mode = this._readStoredMode();
      this._applyTheme();
    });

    // Boshqa tablardan kelgan o'zgarishlarni tinglash
    window.addEventListener("storage", (e) => {
      if (e.key === STORAGE_KEY) {
        this._mode = this._readStoredMode();
        this._applyTheme();
      }
    });

    // Birinchi yuklanishda animatsiyasiz qo'llash
    this._applyTheme({ skipAnimation: true });
  }

  _readStoredMode() {
    const stored = localStorage.getItem(STORAGE_KEY);
    return VALID_MODES.includes(stored) ? stored : "auto";
  }

  _resolveEffectiveMode() {
    if (this._mode === "auto") {
      return this._mediaQuery.matches ? "dark" : "light";
    }
    return this._mode;
  }

  _applyTheme({ skipAnimation = false } = {}) {
    const root = document.documentElement;
    const effective = this._resolveEffectiveMode();

    const applyClasses = () => {
      root.classList.remove("light", "dark");
      root.classList.add(effective);
      root.style.colorScheme = effective;
    };

    const canAnimate =
      !skipAnimation &&
      this._animation &&
      !this._reducedMotionQuery.matches &&
      document.startViewTransition &&
      document.visibilityState === "visible";

    if (canAnimate) {
      // Oldingi tugallanmagan transition bo'lsa, darhol o'tkazib yuborish
      if (this._pendingTransition) {
        this._pendingTransition.skipTransition?.();
      }
      this._pendingTransition = document.startViewTransition(() => applyClasses());
      this._pendingTransition.finished
        .catch(() => {})
        .finally(() => {
          this._pendingTransition = null;
        });
    } else {
      applyClasses();
    }

    this._listeners.forEach((cb) => cb(effective, this._mode));
  }

  /**
   * @param {{mode?: "light"|"dark"|"auto", animation?: boolean}} options
   */
  set({ mode, animation } = {}) {
    if (mode !== undefined) {
      if (!VALID_MODES.includes(mode)) {
        console.warn(
          `[theme] Noto'g'ri mode: "${mode}". Ruxsat etilgan: ${VALID_MODES.join(", ")}`
        );
      } else {
        this._mode = mode;
        localStorage.setItem(STORAGE_KEY, mode);
      }
    }

    if (animation !== undefined) {
      this._animation = animation;
    }

    this._applyTheme();

    window.dispatchEvent(new Event(EVENT_NAME));
  }

  get() {
    return {
      mode: this._mode,
      effective: this._resolveEffectiveMode(),
      animation: this._animation,
    };
  }

  subscribe(callback) {
    this._listeners.add(callback);
    return () => this._listeners.delete(callback);
  }
}

const theme = new ThemeManager();
export default theme;