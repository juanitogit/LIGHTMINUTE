import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../../../packages/ui-kit/tokens.css";
import "./styles.css";
import "./apple.css";
import { App } from "./App";

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      // The online interface remains usable if offline installation fails.
    });
  });
}

const container = document.getElementById("root");
if (!container) throw new Error("Missing #root element");

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
