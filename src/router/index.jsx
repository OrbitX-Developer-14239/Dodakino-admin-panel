import { Routes, Route, Navigate } from "react-router-dom";

import AdminLayout from "../layouts/AdminLayout/index";
import { renderRoutes } from "./renderRoutes";

function AppRouter() {
  return (
    <Routes>
      {/* 1. AdminLayout ichidagi sahifalar (hidden: false) */}
      <Route path="/" element={<AdminLayout />}>
        <Route index element={<Navigate to="/auth" replace />} />
        {renderRoutes(false)}
      </Route>

      {/* 2. MainLayout'dan TASHQARIDAGI sahifalar (Faqat page o'zi bo'ladi, hidden: true) */}
      {renderRoutes(true)}
    </Routes>
  );
}

export default AppRouter;