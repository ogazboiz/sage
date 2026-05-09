import { createContext, useContext, type ReactNode } from "react";

import { useAutonomousTask } from "./useAutonomousTask";

type Ctx = ReturnType<typeof useAutonomousTask>;

const AutonomousTaskCtx = createContext<Ctx | null>(null);

// Lifts the useAutonomousTask hook above the tab boundary so the loop's
// state (timer, iterations, budget remaining) survives tab navigation. If
// the panel were left to mount/unmount with each tab switch, the loop's
// setTimeout would be cleared and the on-chain task would be orphaned.
export function AutonomousTaskProvider({ children }: { children: ReactNode }) {
  const value = useAutonomousTask();
  return (
    <AutonomousTaskCtx.Provider value={value}>
      {children}
    </AutonomousTaskCtx.Provider>
  );
}

export function useAutonomousTaskState(): Ctx {
  const ctx = useContext(AutonomousTaskCtx);
  if (!ctx) {
    throw new Error(
      "useAutonomousTaskState must be used inside <AutonomousTaskProvider>",
    );
  }
  return ctx;
}
