import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useConnection,
  useWallet,
} from "@solana/wallet-adapter-react";
import { Transaction } from "@solana/web3.js";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";

import { useSageProgram } from "./useSageProgram";
import {
  buildDepositIx,
  SAGE_USDC_MINT,
  toBaseUnits,
} from "@/lib/sage-sdk";

export function useDeposit() {
  const program = useSageProgram();
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (amountUsdc: number) => {
      if (!program || !publicKey) throw new Error("Connect a wallet first");
      if (!Number.isFinite(amountUsdc) || amountUsdc <= 0) {
        throw new Error("Amount must be positive");
      }

      const amount = toBaseUnits(amountUsdc);
      const ownerUsdc = getAssociatedTokenAddressSync(SAGE_USDC_MINT, publicKey);

      const tx = new Transaction();

      // Idempotently create the owner's USDC ATA in case the demo wallet
      // hasn't been topped up before. Costs ~0.002 SOL when the account
      // doesn't exist yet, no-op otherwise.
      tx.add(
        createAssociatedTokenAccountIdempotentInstruction(
          publicKey,
          ownerUsdc,
          publicKey,
          SAGE_USDC_MINT,
        ),
      );

      const depositIx = await buildDepositIx({
        program,
        owner: publicKey,
        usdcMint: SAGE_USDC_MINT,
        amount,
      });
      tx.add(depositIx);

      const signature = await sendTransaction(tx, connection);
      const latest = await connection.getLatestBlockhash();
      await connection.confirmTransaction(
        { signature, ...latest },
        "confirmed",
      );
      return signature;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sage-vault"] });
      queryClient.invalidateQueries({ queryKey: ["vault-balance"] });
      queryClient.invalidateQueries({ queryKey: ["owner-balance"] });
    },
  });
}
