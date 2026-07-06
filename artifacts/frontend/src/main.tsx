import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setBaseUrl } from "@workspace/api-client-react";
import App from "./App";
import { initTheme } from "./theme";
import { I18nProvider } from "./i18n/I18nProvider";
import { getApiOrigin } from "./lib/apiOrigin";
import "./index.css";

initTheme();

const apiOrigin = getApiOrigin();
setBaseUrl(apiOrigin || null);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <I18nProvider>
      <App />
    </I18nProvider>
  </QueryClientProvider>
);
