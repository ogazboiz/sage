use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::{constants::USER_VAULT_SEED, error::SageError, state::UserVault};

#[derive(Accounts)]
pub struct Withdraw<'info> {
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

    pub owner: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

pub(crate) fn handler(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
    require!(
        ctx.accounts.user_vault.active_task.is_none(),
        SageError::TaskActive
    );

    let owner_key = ctx.accounts.user_vault.owner;
    let bump = ctx.accounts.user_vault.bump;
    let bump_arr = [bump];
    let signer_seeds: &[&[&[u8]]] = &[&[USER_VAULT_SEED, owner_key.as_ref(), &bump_arr]];

    let cpi_accounts = Transfer {
        from: ctx.accounts.vault_usdc.to_account_info(),
        to: ctx.accounts.owner_usdc.to_account_info(),
        authority: ctx.accounts.user_vault.to_account_info(),
    };
    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.key(),
        cpi_accounts,
        signer_seeds,
    );
    token::transfer(cpi_ctx, amount)?;

    emit!(Withdrawn {
        owner: ctx.accounts.user_vault.owner,
        amount,
    });
    Ok(())
}

#[event]
pub struct Withdrawn {
    pub owner: Pubkey,
    pub amount: u64,
}
