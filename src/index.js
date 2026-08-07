import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import "./styles/index.css";
import App from "./router";
import theme from "@theme";
import { useEffect } from "react";

function Root() {
  useEffect(() => {
    theme.set({
      mode: localStorage.getItem("theme") || "auto",
      animation: true,
    });
  }, []);

  return (
    <HelmetProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} >
        <App />
      </BrowserRouter>
    </HelmetProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<Root />);
