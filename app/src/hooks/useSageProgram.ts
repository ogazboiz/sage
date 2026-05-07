import { useMemo } from "react";
import {
  useAnchorWallet,
  useConnection,
} from "@solana/wallet-adapter-react";

import { createSageProgram, type SageProgram } from "@/lib/sage-sdk";

export function useSageProgram(): SageProgram | null {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  return useMemo(() => {
    if (!wallet) return null;
    return createSageProgram({ connection, wallet });
  }, [connection, wallet]);
}
