import {
  TbLayoutDashboard,
  TbMovie,
  TbBroadcast,
  TbUsers,
  TbChartBar,
  TbFileAnalytics,
  TbBrandInstagram,
} from "react-icons/tb";

import HomePage from "../pages/dashboard/index";
import AuthPage from "../pages/auth/index";
import TelegramAuthPage from "../pages/auth/TelegramAuth";
import NotFoundPage from "../pages/notFound/index";
import TestPage from "../pages/test/index";

import FilmsPage from "../pages/films/index";

import StatisticsPage from "../pages/statistics/index";
import UsersPage from "../pages/users/index";
import ChannelsPage from "../pages/channels/index";
import InstagramPage from "../pages/instagram/index";
import LogsPage from "../pages/logs/index";

/**
 * Route maydonlari:
 *  - hidden:  true bo'lsa AdminLayout'siz (sidebar/navbar'siz) render qilinadi
 *  - nav:     menyuda ko'rinadigan band ({ label, short, icon, group })
 *  - tabbar:  mobil pastki menyuda ham turadimi
 *
 * NEGA MENYU AYNAN SHU YERDA: sahifa, uning sarlavhasi va menyudagi nomi
 * bitta joyda tursa, yangi bo'lim qo'shganda ularning biri esdan chiqib
 * qolmaydi. Sidebar ham, tabbar ham shu ro'yxatdan o'qiydi — ikkalasi
 * hech qachon bir-biridan farq qila olmaydi. Ilgari menyu AdminLayout
 * ichida qo'lda yozilgan alohida massiv edi va sahifa qo'shilganda ikki
 * joyni yangilash kerak bo'lardi.
 *
 * GURUHLAR NIYAT BO'YICHA, ob'ekt turi bo'yicha emas:
 *   Kuzatuv    — "nima bo'lyapti?"
 *   Kontent    — "nimani boshqaraman"
 *   Auditoriya — "kim ko'ryapti"
 */
export const routes = [
  // ─── Kirish ──────────────────────────────────────────────────
  {
    title: "Doda Kino | Kirish (Admin Panel)",
    description:
      "Doda Kino administrator boshqaruv paneliga kirish sahifasi. Tizimga xavfsiz kiring va platformani boshqarishni boshlang.",
    path: "/auth",
    element: <AuthPage />,
    private: false,
    hidden: true,
  },
  {
    title: "Doda Kino | Telegram Tasdiqlash",
    description: "Telegram orqali xavfsiz ulanish",
    path: "/admin/telegram-auth",
    element: <TelegramAuthPage />,
    private: false,
    hidden: true,
  },

  // ─── Kuzatuv ─────────────────────────────────────────────────
  {
    title: "Doda Kino | Boshqaruv paneli",
    description: "Filmlar, foydalanuvchilar va kanallar bo'yicha umumiy holat.",
    path: "/dashboard",
    element: <HomePage />,
    private: false,
    hidden: false,
    nav: { label: "Boshqaruv paneli", short: "Panel", icon: TbLayoutDashboard, group: "Kuzatuv" },
    tabbar: true,
  },
  {
    title: "Doda Kino | Statistika",
    description: "Filmlar va qismlar bo'yicha ko'rishlar reytingi.",
    path: "/statistics",
    element: <StatisticsPage />,
    private: false,
    hidden: false,
    nav: { label: "Statistika", short: "Statistika", icon: TbChartBar, group: "Kuzatuv" },
    tabbar: true,
  },
  {
    title: "Doda Kino | Tizim jurnali",
    description: "Server hodisalari va xatolar jurnali, jonli yangilanadi.",
    path: "/logs",
    element: <LogsPage />,
    private: false,
    hidden: false,
    nav: { label: "Tizim jurnali", short: "Jurnal", icon: TbFileAnalytics, group: "Kuzatuv" },
  },

  // ─── Kontent ─────────────────────────────────────────────────
  {
    title: "Doda Kino | Filmlar",
    description: "Barcha filmlar va qismlar — qo'shish, tahrirlash, o'chirish.",
    path: "/films",
    element: <FilmsPage />,
    private: false,
    hidden: false,
    nav: { label: "Filmlar", short: "Filmlar", icon: TbMovie, group: "Kontent" },
    tabbar: true,
  },
  {
    title: "Doda Kino | Kanallar",
    description: "Majburiy obuna kanallari va bot a'zo bo'lgan chatlar.",
    path: "/channels",
    element: <ChannelsPage />,
    private: false,
    hidden: false,
    nav: { label: "Kanallar", short: "Kanallar", icon: TbBroadcast, group: "Kontent" },
    tabbar: true,
  },

  // ─── Auditoriya ──────────────────────────────────────────────
  {
    title: "Doda Kino | Foydalanuvchilar",
    description: "Botdan foydalanayotganlar ro'yxati va obuna holati.",
    path: "/users",
    element: <UsersPage />,
    private: false,
    hidden: false,
    nav: { label: "Foydalanuvchilar", short: "Userlar", icon: TbUsers, group: "Auditoriya" },
    tabbar: true,
  },
  {
    title: "Doda Kino | Instagram",
    description: "Instagram sahifasi statistikasi va postlar.",
    path: "/instagram",
    element: <InstagramPage />,
    private: false,
    hidden: false,
    nav: { label: "Instagram", short: "Instagram", icon: TbBrandInstagram, group: "Auditoriya" },
  },

  // ─── Sinov sahifasi ──────────────────────────────────────────
  // Menyuda bandi yo'q — faqat to'g'ridan-to'g'ri manzil orqali ochiladi.
  {
    title: "Doda Kino | Test Sahifasi",
    description:
      "Doda Kino test sahifasi. Yangi funksiyalarni sinovdan o'tkazish, komponentlarni tekshirish va ishlab chiqish jarayonlari uchun mo'ljallangan.",
    path: "/test",
    element: <TestPage />,
    private: false,
    hidden: false,
  },

  // ─── 404 ─────────────────────────────────────────────────────
  {
    title: "404 | Sahifa Topilmadi",
    description:
      "Kechirasiz, siz qidirayotgan sahifa mavjud emas yoki o'chirilgan. Bosh sahifaga qaytib davom etishingiz mumkin.",
    path: "*",
    element: <NotFoundPage />,
    private: false,
    hidden: true,
  },
];

/** URL'ga mos route konfiguratsiyasini topadi — navbar sarlavhani shundan oladi. */
export const findRouteByPath = (pathname) => {
  const effective = pathname === "/" ? "/dashboard" : pathname;
  return (
    routes.find((r) => r.path !== "*" && r.path === effective) ||
    routes.find((r) => r.path === "*")
  );
};

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
 * Mobil kapsuladagi bandlar — eng ko'p ochiladigan BESHTASI.
 *
 * Beshtadan ko'pi sig'maydi: oltinchi band bilan birga har birining
 * tegish maydoni 44px dan kichrayadi, ya'ni barmoq bilan aniq bosib
 * bo'lmay qoladi. Qolgan bo'limlar "Yana" varag'ida.
 */
export const tabbarItems = routes
  .filter((r) => r.nav && r.tabbar)
  .map((r) => ({ path: r.path, ...r.nav }));
