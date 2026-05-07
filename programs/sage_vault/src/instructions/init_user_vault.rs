use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{Mint, Token, TokenAccount},
};

use crate::{constants::USER_VAULT_SEED, state::UserVault};

#[derive(Accounts)]
pub struct InitUserVault<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + UserVault::INIT_SPACE,
        seeds = [USER_VAULT_SEED, owner.key().as_ref()],
        bump,
    )]
    pub user_vault: Account<'info, UserVault>,

    pub usdc_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = owner,
        associated_token::mint = usdc_mint,
        associated_token::authority = user_vault,
    )]
    pub vault_usdc: Account<'info, TokenAccount>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub rent: Sysvar<'info, Rent>,
}

pub(crate) fn handler(ctx: Context<InitUserVault>, agent_keypair: Pubkey) -> Result<()> {
    let vault = &mut ctx.accounts.user_vault;
    vault.owner = ctx.accounts.owner.key();
    vault.agent_keypair = agent_keypair;
    vault.usdc_mint = ctx.accounts.usdc_mint.key();
    vault.active_task = None;
    vault.total_deposited = 0;
    vault.total_spent = 0;
    vault.bump = ctx.bumps.user_vault;

    emit!(VaultInitialized {
        owner: vault.owner,
        agent: vault.agent_keypair,
        mint: vault.usdc_mint,
    });
    Ok(())
}

#[event]
pub struct VaultInitialized {
    pub owner: Pubkey,
    pub agent: Pubkey,
    pub mint: Pubkey,
}
