import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setBaseUrl, setAuthTokenGetter } from "@workspace/api-client-react";

// Point all API calls to /api (proxied to Netlify Function in prod,
// or to the local Express server in dev via vite proxy)
setBaseUrl("");

// Attach JWT token from localStorage to every API request
setAuthTokenGetter(() => localStorage.getItem("snackveda_token"));

createRoot(document.getElementById("root")!).render(<App />);
