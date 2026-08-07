import { useState, useEffect, useMemo, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * Qurilma turini aniqlash uchun yordamchi funksiya
 */
const getDeviceType = (pathname) => {
  // ✅ NEW: /webapp bo'lsa, device tekshirmasdan shu qiymat qaytadi
  if (pathname === "/webapp" || pathname.startsWith("/webapp/")) {
    return "web-app";
  }

  const ua = navigator.userAgent.toLowerCase();
  const width = window.innerWidth;

  // 1. OS aniqlash (Mantiqiy soddalashtirildi)
  const isIOS =
    /iphone|ipod/.test(ua) ||
    (ua.includes("mac") && navigator.maxTouchPoints > 1) ||
    /ipad/.test(ua);

  const isAndroid = /android/.test(ua);

  // 2. Sensor va O'lcham (Mukammal aniqlik uchun)
  const isTouch =
    navigator.maxTouchPoints > 0 ||
    window.matchMedia("(any-pointer: coarse)").matches;

  // Senior approach: Faqat UA ga ishonmaymiz, ekran o'lchamini ham tekshiramiz (Tablets & Phones)
  const isMobileSize = width <= 2024;

  const isMobileDevice = isIOS || isAndroid || (isTouch && isMobileSize);

  if (isMobileDevice) {
    const os = isIOS ? "ios" : "android";
    const isAppPath = pathname.startsWith("/mobile");
    return isAppPath ? `mobile-app-${os}` : `mobile-web-${os}`;
  }

  return "desktop-web";
};

export const useDevice = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  // Lazy initialization
  const [deviceType, setDeviceType] = useState(() => getDeviceType(pathname));

  // Redirect va State yangilash funksiyasi
  const handleDeviceCheck = useCallback(() => {
    const currentType = getDeviceType(pathname);

    // Desktop Redirect logikasi
    if (currentType === "desktop-web" && pathname.startsWith("/mobile")) {
      const cleanPath = pathname.replace(/^\/mobile/, "") || "/";
      navigate(cleanPath, { replace: true });
      return;
    }

    // Faqat qiymat haqiqatda o'zgarganda render qilish
    setDeviceType((prev) => (prev !== currentType ? currentType : prev));
  }, [pathname, navigate]);

  useEffect(() => {
    // 1. Dastlabki tekshiruv
    handleDeviceCheck();

    // 2. Debounce mexanizmi (Performance uchun juda muhim)
    let timeoutId = null;

    const debouncedCheck = () => {
      clearTimeout(timeoutId);

      timeoutId = setTimeout(() => {
        handleDeviceCheck();
      }, 150);
    };

    window.addEventListener("resize", debouncedCheck);
    window.addEventListener("orientationchange", debouncedCheck);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("resize", debouncedCheck);
      window.removeEventListener("orientationchange", debouncedCheck);
    };
  }, [handleDeviceCheck]);

  // Objectni memoizatsiya qilish (Renderlar sonini kamaytiradi)
  return useMemo(() => ({ type: deviceType }), [deviceType]);
};
