// MUST stay first — sets globalThis.Buffer + globalThis.process before any
// SPL/anchor module loads. Side-effect import.
import "./polyfills";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConversationProvider } from "@elevenlabs/react";

import "./index.css";
import App from "./App.tsx";
import { WalletProvider } from "./providers/WalletProvider";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <WalletProvider>
        <ConversationProvider>
          <App />
        </ConversationProvider>
      </WalletProvider>
    </QueryClientProvider>
  </StrictMode>,
);
