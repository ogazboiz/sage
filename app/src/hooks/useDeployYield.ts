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
import { useYieldPositions, type YieldPosition } from "./useYieldPositions";
import {
  buildApproveTaskIx,
  buildCompleteTaskIx,
  buildReleaseStepIx,
  SAGE_USDC_MINT,
  toBaseUnits,
} from "@/lib/sage-sdk";

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

function taskIdFromSlug(slug: string): Uint8Array {
  // Pack "yield:<slug>:<ts>" into the 32-byte task id so the on-chain task
  // is uniquely tied to this deployment.
  const buf = new Uint8Array(32);
  const tag = `y:${slug}:${Date.now().toString(36)}`;
  const bytes = new TextEncoder().encode(tag);
  buf.set(bytes.subarray(0, Math.min(bytes.length, 32)));
  return buf;
}

export interface DeployArgs {
  slug: string;
  protocol: string;
  network: string;
  amount: number;
  apy: number;
}

export function useDeployYield() {
  const program = useSageProgram();
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const yieldPositions = useYieldPositions();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: DeployArgs): Promise<YieldPosition> => {
      if (!program || !publicKey) throw new Error("Connect a wallet first");
      if (!Number.isFinite(args.amount) || args.amount <= 0) {
        throw new Error("Amount must be positive");
      }

      const recipientAta = getAssociatedTokenAddressSync(
        SAGE_USDC_MINT,
        publicKey,
      );
      const amountBaseUnits = toBaseUnits(args.amount);
      const taskId = taskIdFromSlug(args.slug);
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
          publicKey,
          SAGE_USDC_MINT,
        ),
      );
      tx.add(approveIx);
      tx.add(releaseIx);
      tx.add(memoIx(`sage-yield:${args.slug}:${args.amount}`));
      tx.add(completeIx);

      const signature = await sendTransaction(tx, connection);
      const latest = await connection.getLatestBlockhash();
      await connection.confirmTransaction(
        { signature, ...latest },
        "confirmed",
      );

      const position: YieldPosition = {
        slug: args.slug,
        protocol: args.protocol,
        network: args.network,
        amount: args.amount,
        apy: args.apy,
        signature,
        timestamp: Date.now(),
      };
      yieldPositions.add(position);
      return position;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sage-vault"] });
      queryClient.invalidateQueries({ queryKey: ["vault-balance"] });
      queryClient.invalidateQueries({ queryKey: ["owner-balance"] });
    },
  });
}
