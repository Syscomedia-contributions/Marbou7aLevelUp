import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n";
import { initScrollSensitivity } from "./lib/scrollSensitivity";

initScrollSensitivity();
createRoot(document.getElementById("root")!).render(<App />);
