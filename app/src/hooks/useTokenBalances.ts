import { useQuery } from "@tanstack/react-query";
import {
  useConnection,
  useWallet,
} from "@solana/wallet-adapter-react";
import {
  PublicKey,
  type Commitment,
} from "@solana/web3.js";
import {
  getAccount,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";

import {
  deriveUserVaultPda,
  fromBaseUnits,
  SAGE_USDC_MINT,
} from "@/lib/sage-sdk";

const COMMIT: Commitment = "confirmed";

async function readSpl(
  connection: ReturnType<typeof useConnection>["connection"],
  ata: PublicKey,
): Promise<number | null> {
  try {
    const account = await getAccount(connection, ata, COMMIT);
    return fromBaseUnits(account.amount);
  } catch {
    return null;
  }
}

export function useOwnerUsdcBalance() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();

  return useQuery({
    queryKey: ["owner-balance", publicKey?.toBase58()],
    enabled: Boolean(publicKey),
    refetchInterval: 8_000,
    queryFn: async () => {
      if (!publicKey) return null;
      const ata = getAssociatedTokenAddressSync(SAGE_USDC_MINT, publicKey);
      return readSpl(connection, ata);
    },
  });
}

export function useVaultUsdcBalance() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();

  return useQuery({
    queryKey: ["vault-balance", publicKey?.toBase58()],
    enabled: Boolean(publicKey),
    refetchInterval: 8_000,
    queryFn: async () => {
      if (!publicKey) return null;
      const [vaultPda] = deriveUserVaultPda(publicKey);
      const ata = getAssociatedTokenAddressSync(
        SAGE_USDC_MINT,
        vaultPda,
        true,
      );
      return readSpl(connection, ata);
    },
  });
}
