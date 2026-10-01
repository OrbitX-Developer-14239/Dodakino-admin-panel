import { lazy } from "react";
import { matchPath } from "react-router-dom";
import {
  TbLayoutDashboard,
  TbChartBar,
  TbFileAnalytics,
  TbMovie,
  TbSpeakerphone,
  TbUsers,
  TbBrandInstagram,
  TbSettings,
} from "react-icons/tb";

/**
 * lazyWithPreload — React.lazy'ning "Suspense throttle"siz varianti.
 *
 * MUAMMO: oddiy lazy bilan modul ALLAQACHON yuklangan bo'lsa ham React
 * birinchi renderda baribir Suspense'ga tushadi, fallback ko'rsatadi va
 * kontent tayyor bo'lsa-da uni ~300ms ushlab turadi (React'ning ichki
 * fallback-throttle mexanizmi). Aynan shu 300ms "layout chiqdi, kontent
 * kechikdi" bo'lib sezilardi.
 *
 * YECHIM: modul yuklanib bo'lgach uni oddiy komponent sifatida
 * TO'G'RIDAN-TO'G'RI render qilamiz — Suspense umuman ishga tushmaydi.
 * Modul hali kelmagan bo'lsagina (birinchi sovuq ochilish) lazy yo'liga
 * tushiladi.
 */
const lazyWithPreload = (importer) => {
  let LoadedComponent = null;
  const LazyComponent = lazy(importer);

  const Component = (props) =>
    LoadedComponent ? <LoadedComponent {...props} /> : <LazyComponent {...props} />;

  Component.preload = () =>
    importer()
      .then((m) => {
        LoadedComponent = m.default ?? m;
      })
      .catch(() => {}); // offline bo'lsa — lazy render paytida o'zi qayta urinadi

  return Component;
};

const DashboardPage = lazyWithPreload(() => import("../pages/dashboard/index"));
const StatisticsPage = lazyWithPreload(() => import("../pages/statistics/index"));
const LogsPage = lazyWithPreload(() => import("../pages/logs/index"));
const FilmsPage = lazyWithPreload(() => import("../pages/films/index"));
const ChannelsPage = lazyWithPreload(() => import("../pages/channels/index"));
const UsersPage = lazyWithPreload(() => import("../pages/users/index"));
const InstagramPage = lazyWithPreload(() => import("../pages/instagram/index"));
const SettingsPage = lazyWithPreload(() => import("../pages/settings/index"));
const AuthPage = lazyWithPreload(() => import("../pages/auth/index"));
const NotFoundPage = lazyWithPreload(() => import("../pages/notFound/index"));

/** URL'ga mos route konfiguratsiyasini topadi. Layout ham, preload ham
 *  shu yagona manbadan foydalanadi. */
export const findRouteByPath = (pathname) => {
  const effectivePath = pathname === "/" ? "/dashboard" : pathname;

  return (
    routes.find(
      (r) => r.path !== "*" && matchPath({ path: r.path, end: true }, effectivePath)
    ) || routes.find((r) => r.path === "*")
  );
};

/**
 * Berilgan URL'ga mos sahifanigina oldindan yuklaydi.
 *
 * "Hammasini oldindan yuklash" isrofga aylanadi — strategiya: birinchi
 * renderda FAQAT tashrif buyurilgan sahifa kutiladi (index.js),
 * qolganlari foydalanuvchi menyu bandi ustiga borganda (AppLink
 * hover/focus/touch) yuklanadi — bosish paytiga chunk tayyor bo'ladi.
 */
export const preloadRouteByPath = (pathname) => {
  const route = findRouteByPath(pathname);
  return route?.Component?.preload ? route.Component.preload() : Promise.resolve();
};

/**
 * Route maydonlari:
 *  - private:    faqat tizimga kirgan admin ko'ra oladi
 *  - standalone: MainLayout'siz (Sidebar/Navbar/Footer'siz) render
 *  - nav:        menyuda ko'rinadigan band ({ label, icon, group })
 *  - tabbar:     mobil pastki menyuda ham turadimi
 *
 * NEGA MENYU AYNAN SHU YERDA: sahifa, uning sarlavhasi va menyudagi
 * nomi bitta joyda tursa, yangi bo'lim qo'shganda ularning biri esdan
 * chiqib qolmaydi. Sidebar ham, tabbar ham shu ro'yxatdan o'qiydi —
 * ikkalasi hech qachon bir-biridan farq qila olmaydi.
 *
 * GURUHLAR NIYAT BO'YICHA:
 *   Kuzatuv    — "nima bo'lyapti?"
 *   Kontent    — "botda nima bor?"
 *   Auditoriya — "kim foydalanyapti?"
 */
export const routes = [
  // ─── Kirish ──────────────────────────────────────────────────
  {
    title: "Kirish | TROYA ADMIN",
    description: "Troya Admin boshqaruv paneliga kirish.",
    path: "/auth",
    Component: AuthPage,
    private: false,
    standalone: true,
  },

  // ─── Kuzatuv ─────────────────────────────────────────────────
  {
    title: "Boshqaruv paneli | TROYA ADMIN",
    description: "Filmlar, foydalanuvchilar va kanallar bo'yicha umumiy holat.",
    path: "/dashboard",
    Component: DashboardPage,
    private: true,
    standalone: false,
    nav: { label: "Boshqaruv paneli", short: "Panel", icon: TbLayoutDashboard, group: "Kuzatuv" },
    tabbar: true,
  },
  {
    title: "Statistika | TROYA ADMIN",
    description: "Foydalanuvchilar o'sishi, filmlar ko'rilishi va majburiy kanallar.",
    path: "/statistics",
    Component: StatisticsPage,
    private: true,
    standalone: false,
    nav: { label: "Statistika", short: "Statistika", icon: TbChartBar, group: "Kuzatuv" },
    tabbar: true,
  },
  {
    title: "Tizim jurnali | TROYA ADMIN",
    description: "Server hodisalari va xatolar jurnali, jonli yangilanadi.",
    path: "/logs",
    Component: LogsPage,
    private: true,
    standalone: false,
    nav: { label: "Tizim jurnali", icon: TbFileAnalytics, group: "Kuzatuv" },
  },

  // ─── Kontent ─────────────────────────────────────────────────
  {
    title: "Filmlar | TROYA ADMIN",
    description: "Barcha filmlar va qismlar — qo'shish, tahrirlash, o'chirish.",
    path: "/films",
    Component: FilmsPage,
    private: true,
    standalone: false,
    nav: { label: "Filmlar", short: "Filmlar", icon: TbMovie, group: "Kontent" },
    tabbar: true,
  },
  {
    title: "Kanallar | TROYA ADMIN",
    description: "Majburiy obuna kanallari va ularning holati.",
    path: "/channels",
    Component: ChannelsPage,
    private: true,
    standalone: false,
    nav: { label: "Kanallar", icon: TbSpeakerphone, group: "Kontent" },
  },

  // ─── Auditoriya ──────────────────────────────────────────────
  {
    title: "Foydalanuvchilar | TROYA ADMIN",
    description: "Botdan foydalanayotganlar ro'yxati va obuna holati.",
    path: "/users",
    Component: UsersPage,
    private: true,
    standalone: false,
    nav: { label: "Foydalanuvchilar", short: "Userlar", icon: TbUsers, group: "Auditoriya" },
    tabbar: true,
  },
  {
    title: "Instagram | TROYA ADMIN",
    description: "Instagram sahifasi: obunachilar, postlar va hikoyalar.",
    path: "/instagram",
    Component: InstagramPage,
    private: true,
    standalone: false,
    nav: { label: "Instagram", icon: TbBrandInstagram, group: "Auditoriya" },
  },

  // ─── Tizim ───────────────────────────────────────────────────
  {
    title: "Sozlamalar | TROYA ADMIN",
    description: "Profil, Telegram ulash, login va parol, adminlar boshqaruvi.",
    path: "/settings",
    Component: SettingsPage,
    private: true,
    standalone: false,
    nav: { label: "Sozlamalar", icon: TbSettings, group: "Tizim" },
  },

  // ─── Sinov sahifasi — FAQAT dev'da ───────────────────────────
  // Production build'da bu route umuman boʻlmaydi, shuning uchun
  // sahifa chunk'i ham chiqmaydi (webpack oʻlik shoxni tashlaydi).
  ...(process.env.NODE_ENV === "development"
    ? [
        {
          title: "Sinov sahifasi | TROYA ADMIN",
          description: "Komponentlarni tekshirish uchun sahifa.",
          path: "/test",
          Component: lazyWithPreload(() => import("../pages/test/index")),
          private: true,
          standalone: false,
        },
      ]
    : []),

  // ─── 404 ─────────────────────────────────────────────────────
  {
    title: "Sahifa topilmadi | TROYA ADMIN",
    description: "Bu manzilda hech narsa yo'q.",
    path: "*",
    Component: NotFoundPage,
    private: false,
    standalone: true,
  },
];

/** Menyu uchun: guruhlangan, tartibi routes bilan bir xil. */
export const navGroups = routes
  .filter((r) => r.nav)
  .reduce((groups, route) => {
    const found = groups.find((g) => g.title === route.nav.group);
    const item = { path: route.path, ...route.nav };
    if (found) found.items.push(item);
    else groups.push({ title: route.nav.group, items: [item] });
    return groups;
  }, []);

/**
 * Mobil kapsuladagi bandlar — eng ko'p ochiladiganlari.
 *
 * Beshtadan ko'pi sig'maydi: "Yana" tugmasi bilan birga har birining
 * tegish maydoni 44px dan kichrayadi, ya'ni barmoq bilan aniq bosib
 * bo'lmay qoladi. Qolgan bo'limlar "Yana" varag'ida.
 */
export const tabbarItems = routes
  .filter((r) => r.nav && r.tabbar)
  .map((r) => ({ path: r.path, ...r.nav }));
