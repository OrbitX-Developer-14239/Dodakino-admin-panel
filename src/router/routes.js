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

export const routes = [
  // Auth
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

  // Dashboard
  {
    title: "Doda Kino | Dashboard",
    description:
      "Doda Kino administrator boshqaruv paneli. Filmlar, seriallar, foydalanuvchilar, statistika va tizim sozlamalarini bitta joydan boshqaring.",
    path: "/dashboard",
    element: <HomePage />,
    private: false,
    hidden: false,
  },
  
  // Films
  {
    title: "Doda Kino | Filmlar",
    description: "Barcha filmlar ro'yxati va ularni boshqarish",
    path: "/films",
    element: <FilmsPage />,
    private: false,
    hidden: false,
  },

  // Statistics
  {
    title: "Doda Kino | Statistikalar",
    description:
      "Doda Kino barcha statistika ma'lumotlari va tahlillar ro'yxati.",
    path: "/statistics",
    element: <StatisticsPage />,
    private: false,
    hidden: false,
  },

  // Users
  {
    title: "Doda Kino | Foydalanuvchilar",
    description:
      "Platformadagi barcha foydalanuvchilar ro'yxati. Foydalanuvchilarni qidirish, filtrlash va ularning faoliyatini kuzatib borish.",
    path: "/users",
    element: <UsersPage />,
    private: false,
    hidden: false,
  },

  // Channels
  {
    title: "Doda Kino | Kanallar",
    description: "Majburiy obuna kanallarini boshqarish",
    path: "/channels",
    element: <ChannelsPage />,
    private: false,
    hidden: false,
  },

  // Logs
  {
    title: "Doda Kino | Tizim jurnali (Logs)",
    description:
      "Admin panelda amalga oshirilgan barcha amallar va tizim hodisalarining jurnali (loglar).",
    path: "/logs",
    element: <LogsPage />,
    private: false,
    hidden: false,
  },

  // Instagram
  {
    title: "Doda Kino | Instagram",
    description:
      "Doda Kino Instagram sahifasini boshqarish va statistika",
    path: "/instagram",
    element: <InstagramPage />,
    private: false,
    hidden: false,
  },


  // Test Page
  {
    title: "Doda Kino | Test Sahifasi",
    description:
      "Doda Kino test sahifasi. Yangi funksiyalarni sinovdan o'tkazish, komponentlarni tekshirish va ishlab chiqish jarayonlari uchun mo'ljallangan.",
    path: "/test",
    element: <TestPage />,
    private: false,
    hidden: false,
  },

  // Empty
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