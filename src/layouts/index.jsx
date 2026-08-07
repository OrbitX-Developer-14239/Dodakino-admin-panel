import { Outlet } from "react-router-dom";
import Navbar from "../components/navbar/index";
import Footer from "../components/footer/index";

function MainLayout() {
  return (
    <>
      {/* Global UI */}
      <Navbar />

      {/* POPUPS */}
      {/* <Menu /> */}
      {/* <Serch /> */}

      {/* PAGE CONTENT */}
      <main>
        <Outlet />
      </main>

      {/* FOOTER */}
      <Footer />
    </>
  );
}

export default MainLayout;
