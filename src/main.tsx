import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

if (!import.meta.env.VITE_SINGLE_FILE) import("virtual:pwa-register").then((m) => m.registerSW({ immediate: true }));

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
