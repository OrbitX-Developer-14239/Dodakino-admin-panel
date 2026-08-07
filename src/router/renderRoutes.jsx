import { useEffect } from "react";
import { Route, useLocation, Navigate } from "react-router-dom";
import NProgress from "nprogress";
import { routes } from "./routes";
import SEO from "../components/SEO";
import { useSession } from "../hooks/useSession";

if ("scrollRestoration" in window.history) {
  window.history.scrollRestoration = "manual";
}

NProgress.configure({ showSpinner: false, minimum: 0.3, speed: 400 });


const RouteWrapper = ({ title, description, element }) => {
  const { pathname } = useLocation();

  useEffect(() => {
    NProgress.start();
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });

    const timer = setTimeout(() => {
      NProgress.done();
    }, 400);

    return () => {
      clearTimeout(timer);
      NProgress.done();
    };
  }, [pathname]);

  const sessionStatus = useSession();

  // Refresh urinishi tugamaguncha hech qayerga yo'naltirmaymiz — aks holda
  // access token eskirgan (lekin refresh cookie amal qiladigan) foydalanuvchi
  // bekordan-bekor login sahifasiga otilardi.
  if (sessionStatus === "checking") {
    return null;
  }

  const isAuthenticated = sessionStatus === "authed";

  if (!isAuthenticated && pathname !== "/auth") {
    return <Navigate to="/auth" replace state={{ from: pathname }} />;
  }

  if (isAuthenticated && (pathname === "/auth" || pathname === "/")) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <>
      <SEO title={title} description={description} />
      {element}
    </>
  );
};

// isHidden argumenti orqali hidden: true yoki false ekanligini ajratamiz
export const renderRoutes = (isHidden = false) => {
  return routes
    .filter((route) => Boolean(route.hidden) === isHidden)
    .map(({ path, element, title, description }) => (
      <Route
        key={path}
        path={path.replace(/^\//, "")}
        element={<RouteWrapper title={title} description={description} element={element} />}
      />
    ));
};