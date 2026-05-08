import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useConnection,
  useWallet,
} from "@solana/wallet-adapter-react";
import {
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";

import { useSageProgram } from "./useSageProgram";
import {
  buildApproveTaskIx,
  buildCompleteTaskIx,
  buildReleaseStepIx,
  SAGE_USDC_MINT,
  toBaseUnits,
} from "@/lib/sage-sdk";
import { fetchChallenge, settleAndFetch } from "@/lib/x402";

const BRIEFING_URL =
  import.meta.env.VITE_BRIEFING_URL ?? "http://localhost:3001/brief";

const MEMO_PROGRAM = new PublicKey(
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
);

function memoIx(memo: string): TransactionInstruction {
  return new TransactionInstruction({
    keys: [],
    programId: MEMO_PROGRAM,
    data: Buffer.from(memo, "utf8"),
  });
}

function taskIdFromNonce(nonce: string): Uint8Array {
  const buf = new Uint8Array(32);
  const bytes = new TextEncoder().encode(nonce);
  buf.set(bytes.subarray(0, Math.min(bytes.length, 32)));
  return buf;
}

export type PayStage =
  | "idle"
  | "fetching-quote"
  | "awaiting-signature"
  | "confirming"
  | "verifying";

export function usePayBriefing() {
  const program = useSageProgram();
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const queryClient = useQueryClient();
  const [stage, setStage] = useState<PayStage>("idle");

  const mutation = useMutation({
    mutationFn: async (): Promise<{
      briefing: string;
      signature: string;
    }> => {
      if (!program || !publicKey) throw new Error("Connect a wallet first");

      setStage("fetching-quote");
      const challenge = await fetchChallenge(BRIEFING_URL);
      const recipient = new PublicKey(challenge.recipient);
      const recipientAta = getAssociatedTokenAddressSync(
        SAGE_USDC_MINT,
        recipient,
      );

      const amountUsdc = parseFloat(challenge.amount);
      const amountBaseUnits = toBaseUnits(amountUsdc);
      const taskId = taskIdFromNonce(challenge.nonce);
      const expiresAt = BigInt(Math.floor(Date.now() / 1000) + 300);

      const approveIx = await buildApproveTaskIx({
        program,
        owner: publicKey,
        usdcMint: SAGE_USDC_MINT,
        taskId,
        budget: amountBaseUnits,
        expiresAt,
      });
      const releaseIx = await buildReleaseStepIx({
        program,
        owner: publicKey,
        usdcMint: SAGE_USDC_MINT,
        signer: publicKey,
        recipientUsdc: recipientAta,
        taskId,
        amount: amountBaseUnits,
      });
      const completeIx = await buildCompleteTaskIx({
        program,
        owner: publicKey,
        signer: publicKey,
        taskId,
      });

      const tx = new Transaction();
      tx.add(
        createAssociatedTokenAccountIdempotentInstruction(
          publicKey,
          recipientAta,
          recipient,
          SAGE_USDC_MINT,
        ),
      );
      tx.add(approveIx);
      tx.add(releaseIx);
      tx.add(memoIx(challenge.nonce));
      tx.add(completeIx);

      setStage("awaiting-signature");
      const signature = await sendTransaction(tx, connection);

      setStage("confirming");
      const latest = await connection.getLatestBlockhash();
      await connection.confirmTransaction(
        { signature, ...latest },
        "confirmed",
      );

      setStage("verifying");
      const result = await settleAndFetch<{ briefing: string }>(
        BRIEFING_URL,
        signature,
        challenge.nonce,
      );
      setStage("idle");
      return {
        briefing: result.briefing ?? "(no briefing returned)",
        signature,
      };
    },
    onError: () => setStage("idle"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sage-vault"] });
      queryClient.invalidateQueries({ queryKey: ["vault-balance"] });
    },
  });

  return { ...mutation, stage };
}
