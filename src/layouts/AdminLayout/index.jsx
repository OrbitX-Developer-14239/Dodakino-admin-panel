import React, { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import styles from "./AdminLayout.module.scss";
import Asset from "@asset";
import { TokenManager } from "../../api/tokenManager";
import AdminService from "../../api/services/authService";
import { initSocket, disconnectSocket } from "../../api/socket";

const AdminLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(
    localStorage.getItem("theme") === "dark"
  );
  const navigate = useNavigate();

  useEffect(() => {
    initSocket();

    // Refresh token eskirganda (client.js dan dispatch qilinadi) → login sahifasiga
    const handleAuthLogout = () => {
      TokenManager.clearTokens();
      navigate("/auth", { replace: true });
    };

    window.addEventListener("auth:logout", handleAuthLogout);

    return () => {
      disconnectSocket();
      window.removeEventListener("auth:logout", handleAuthLogout);
    };
  }, [navigate]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      localStorage.setItem("theme", "light");
    }
  }, [isDarkMode]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const handleLogout = async () => {
    try {
      await AdminService.logout();
    } catch (e) {
      // Ignore
    } finally {
      TokenManager.clearTokens();
      navigate("/auth", { replace: true });
    }
  };

  const menuItems = [
    { path: "/dashboard", label: "Dashboard", icon: "dashboard" },
    { path: "/statistics", label: "Statistika", icon: "chart" },
    { path: "/films", label: "Filmlar", icon: "film" },
    { path: "/channels", label: "Kanallar", icon: "link" },
    { path: "/users", label: "Foydalanuvchilar", icon: "users" },
    { path: "/logs", label: "Tizim Jurnali", icon: "document" },
    { path: "/instagram", label: "Instagram", icon: "instagram" },
  ];

  return (
    <div className={styles.layout}>
      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div className={styles.overlay} onClick={toggleSidebar}></div>
      )}

      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${isSidebarOpen ? styles.open : ""}`}>
        <div className={styles.sidebar_header}>
          <div className={styles.logo}>
            <span className={styles.brand}>Doda Kino</span>
            <span className={styles.badge}>Admin</span>
          </div>
          <button className={styles.close_btn} onClick={toggleSidebar}>
            &times;
          </button>
        </div>

        <nav className={styles.nav}>
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `${styles.nav_item} ${isActive ? styles.active : ""}`
              }
              onClick={() => setIsSidebarOpen(false)}
            >
              {/* Note: In a real app we would use actual SVG icons based on the icon property */}
              <span className={styles.icon_placeholder}></span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className={styles.sidebar_footer}>
          <button className={styles.logout_btn} onClick={handleLogout}>
            Chiqish
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className={styles.main_wrapper}>
        <header className={styles.header}>
          <div className={styles.header_left}>
            <button className={styles.burger_btn} onClick={toggleSidebar}>
              &#9776;
            </button>
            <h2 className={styles.page_title}>Boshqaruv paneli</h2>
          </div>
          <div className={styles.header_right}>
            <button className={styles.theme_btn} onClick={toggleTheme}>
              {isDarkMode ? "☀️ Yoritish" : "🌙 Qorong'ulashtirish"}
            </button>
          </div>
        </header>

        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
