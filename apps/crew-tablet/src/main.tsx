import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../../../packages/ui-kit/tokens.css";
import "./styles.css";
import "./apple.css";
import { App } from "./App";

const container = document.getElementById("root");
if (!container) throw new Error("Missing #root element");

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
