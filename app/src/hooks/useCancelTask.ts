import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useConnection,
  useWallet,
} from "@solana/wallet-adapter-react";
import { Transaction } from "@solana/web3.js";

import { useSageProgram } from "./useSageProgram";
import { buildCompleteTaskIx, fetchUserVault } from "@/lib/sage-sdk";

// Recovery hook: calls complete_task on whatever active task is currently
// open on the vault, signed by the owner wallet. Useful when an autonomous
// task was started but the tab closed before finalize fired.
export function useCancelTask() {
  const program = useSageProgram();
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!program || !publicKey) throw new Error("Connect a wallet first");
      const vault = await fetchUserVault(program, publicKey);
      if (!vault) throw new Error("No vault yet");
      if (!vault.activeTask) throw new Error("No active task to cancel");

      const taskId = new Uint8Array(vault.activeTask.taskId);
      const completeIx = await buildCompleteTaskIx({
        program,
        owner: publicKey,
        signer: publicKey,
        taskId,
      });
      const tx = new Transaction().add(completeIx);
      const signature = await sendTransaction(tx, connection);
      const blockhash = await connection.getLatestBlockhash();
      await connection.confirmTransaction(
        { signature, ...blockhash },
        "confirmed",
      );
      return signature;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sage-vault"] });
      queryClient.invalidateQueries({ queryKey: ["vault-balance"] });
    },
  });
}
