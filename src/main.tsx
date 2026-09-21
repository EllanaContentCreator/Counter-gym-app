import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { loadActiveSession } from "./lib/store";

/**
 * Keep an installed app up to date.
 *
 * A service worker only looks for a new version when the page is loaded from
 * cold. An app on the home screen is rarely loaded from cold — it gets resumed
 * from the app switcher — so without this it can sit on an old build for days
 * and a new feature never shows up.
 *
 * So: ask again whenever the app comes back to the foreground, and once an hour
 * while it's open. Never mid-workout, because an update reloads the page and
 * nobody wants that between rounds.
 */
function keepFresh(registration: ServiceWorkerRegistration | undefined) {
  if (!registration) return;
  const check = () => {
    if (!navigator.onLine) return;
    if (loadActiveSession()) return;
    registration.update().catch(() => {});
  };
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") check();
  });
  window.addEventListener("focus", check);
  window.setInterval(check, 60 * 60 * 1000);
}

if (!import.meta.env.VITE_SINGLE_FILE) {
  import("virtual:pwa-register").then((m) =>
    m.registerSW({
      immediate: true,
      onRegisteredSW: (_url, registration) => keepFresh(registration),
    }),
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
