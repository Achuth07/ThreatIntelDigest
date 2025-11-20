import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { HelmetProvider } from "react-helmet-async";

createRoot(document.getElementById("root")!).render(
  <>
    <HelmetProvider>
      <App />
      <Analytics />
      <SpeedInsights />
    </HelmetProvider>
  </>
);