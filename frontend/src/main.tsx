import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initSmoothScroll } from "./lib/smoothScroll";

// Completely unregister any cached MSW Service Workers to prevent browser request interception
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
    }
  });
}

// Boot MSW in dev mode ONLY if VITE_USE_MOCK is explicitly "true"
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
