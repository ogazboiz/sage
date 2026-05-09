/**
 * Airdrops devnet SOL + mints SAGE-USDC to a recipient wallet.
 * Creates a fresh mint-authority keypair funded by airdrop.
 *
 * Usage:
 *   cd sage
 *   npx tsx scripts/airdrop-usdc.ts <recipient-address> [amount=10]
 */
import {
  Connection,
  Keypair,
  PublicKey,
  clusterApiUrl,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js'
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from '@solana/spl-token'

const RPC        = process.env.SOLANA_RPC ?? clusterApiUrl('devnet')
const RECIPIENT  = process.argv[2]
const AMOUNT     = parseFloat(process.argv[3] ?? '10')
const MINT_ADDR  = process.env.MINT  // optional: reuse existing mint

if (!RECIPIENT) {
  console.error('Usage: npx tsx scripts/airdrop-usdc.ts <address> [amount=10]')
  process.exit(1)
}

async function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

async function main() {
  const connection  = new Connection(RPC, 'confirmed')
  const authority   = Keypair.generate()

  console.log('Authority:', authority.publicKey.toBase58())
  console.log('Requesting SOL airdrop for authority…')

  // Airdrop SOL to the authority so it can pay for mint creation + minting
  const sig = await connection.requestAirdrop(authority.publicKey, 2 * LAMPORTS_PER_SOL)
  await connection.confirmTransaction(sig, 'confirmed')
  console.log('✓ Airdropped 2 SOL to authority')
  await sleep(2000)

  let mint: PublicKey
  if (MINT_ADDR) {
    mint = new PublicKey(MINT_ADDR)
    console.log('Reusing existing mint:', mint.toBase58())
  } else {
    console.log('Creating new SAGE-USDC mint…')
    mint = await createMint(connection, authority, authority.publicKey, null, 6)
    console.log('✓ Mint created:', mint.toBase58())
    console.log('\n⚠️  Update mobile/lib/sage/constants.ts USDC_MINT to:', mint.toBase58())
  }

  console.log(`\nCreating ATA for ${RECIPIENT}…`)
  const ata = await getOrCreateAssociatedTokenAccount(
    connection,
    authority,
    mint,
    new PublicKey(RECIPIENT),
  )
  console.log('✓ ATA:', ata.address.toBase58())

  console.log(`Minting ${AMOUNT} USDC…`)
  const mintSig = await mintTo(
    connection,
    authority,
    mint,
    ata.address,
    authority,
    BigInt(Math.round(AMOUNT * 1_000_000)),
  )
  console.log('✓ Minted', AMOUNT, 'SAGE-USDC')
  console.log('  Tx:', `https://solscan.io/tx/${mintSig}?cluster=devnet`)
  console.log('\nDone! Your wallet now has', AMOUNT, 'SAGE-USDC on devnet.')
}

main().catch(e => { console.error(e); process.exit(1) })
