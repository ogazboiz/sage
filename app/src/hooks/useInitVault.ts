import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useConnection,
  useWallet,
} from "@solana/wallet-adapter-react";
import { Transaction } from "@solana/web3.js";

import { useSageProgram } from "./useSageProgram";
import { loadOrCreateAgentKeypair } from "@/lib/agent-identity";
import { buildInitVaultIx, SAGE_USDC_MINT } from "@/lib/sage-sdk";

export function useInitVault() {
  const program = useSageProgram();
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!program || !publicKey) throw new Error("Connect a wallet first");

      const agent = loadOrCreateAgentKeypair();
      const ix = await buildInitVaultIx({
        program,
        owner: publicKey,
        agentKeypair: agent.publicKey,
        usdcMint: SAGE_USDC_MINT,
      });

      const tx = new Transaction().add(ix);
      const signature = await sendTransaction(tx, connection);
      const latest = await connection.getLatestBlockhash();
      await connection.confirmTransaction(
        { signature, ...latest },
        "confirmed",
      );
      return { signature, agent: agent.publicKey.toBase58() };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sage-vault"] });
    },
  });
}
