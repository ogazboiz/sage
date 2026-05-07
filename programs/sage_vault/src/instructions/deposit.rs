use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::{constants::USER_VAULT_SEED, state::UserVault};

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(
        mut,
        seeds = [USER_VAULT_SEED, owner.key().as_ref()],
        bump = user_vault.bump,
        has_one = owner,
    )]
    pub user_vault: Account<'info, UserVault>,

    #[account(
        mut,
        constraint = vault_usdc.mint == user_vault.usdc_mint,
        constraint = vault_usdc.owner == user_vault.key(),
    )]
    pub vault_usdc: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = owner_usdc.mint == user_vault.usdc_mint,
        constraint = owner_usdc.owner == owner.key(),
    )]
    pub owner_usdc: Account<'info, TokenAccount>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

pub(crate) fn handler(ctx: Context<Deposit>, amount: u64) -> Result<()> {
    let cpi_accounts = Transfer {
        from: ctx.accounts.owner_usdc.to_account_info(),
        to: ctx.accounts.vault_usdc.to_account_info(),
        authority: ctx.accounts.owner.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(ctx.accounts.token_program.key(), cpi_accounts);
    token::transfer(cpi_ctx, amount)?;

    let vault = &mut ctx.accounts.user_vault;
    vault.total_deposited = vault.total_deposited.saturating_add(amount);

    emit!(Deposited {
        owner: vault.owner,
        amount,
    });
    Ok(())
}

#[event]
pub struct Deposited {
    pub owner: Pubkey,
    pub amount: u64,
}
