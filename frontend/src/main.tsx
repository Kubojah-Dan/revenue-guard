import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initSmoothScroll } from "./lib/smoothScroll";

// Boot MSW in dev mode ONLY if VITE_USE_MOCK is set to "true"
async function enableMocking() {
  if (import.meta.env.PROD || import.meta.env.VITE_USE_MOCK !== "true") return;
  const { worker } = await import("./mocks/browser");
  return worker.start({ onUnhandledRequest: "bypass" });
}

enableMocking().then(() => {
  // Init Lenis smooth scroll (no-op under prefers-reduced-motion)
  initSmoothScroll();

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
