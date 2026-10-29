import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRoot } from "react-dom/client";
import App from "./App";
import { retireLegacyPwa } from "./lib/retireLegacyPwa";
import { startPublishedReleasePolling } from "./lib/autoUpdateRelease";
import "./index.css";

void retireLegacyPwa();
startPublishedReleasePolling();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: true },
  },
});

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>,
);
