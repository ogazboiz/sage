import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Buffer } from "buffer";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import "./index.css";
import App from "./App.tsx";
import { WalletProvider } from "./providers/WalletProvider";

// Wallet adapter expects Buffer in the global scope.
if (typeof globalThis !== "undefined" && !globalThis.Buffer) {
  globalThis.Buffer = Buffer;
}

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
        <App />
      </WalletProvider>
    </QueryClientProvider>
  </StrictMode>,
);
