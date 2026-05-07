use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::{constants::USER_VAULT_SEED, error::SageError, state::UserVault};

#[derive(Accounts)]
pub struct ReleaseStep<'info> {
    #[account(
        mut,
        seeds = [USER_VAULT_SEED, user_vault.owner.as_ref()],
        bump = user_vault.bump,
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
        constraint = recipient_usdc.mint == user_vault.usdc_mint,
    )]
    pub recipient_usdc: Account<'info, TokenAccount>,

    pub signer: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

pub(crate) fn handler(ctx: Context<ReleaseStep>, task_id: [u8; 32], amount: u64) -> Result<()> {
    require!(
        ctx.accounts.signer.key() == ctx.accounts.user_vault.owner
            || ctx.accounts.signer.key() == ctx.accounts.user_vault.agent_keypair,
        SageError::Unauthorized
    );

    let now = Clock::get()?.unix_timestamp;

    {
        let vault = &mut ctx.accounts.user_vault;
        let task = vault.active_task.as_mut().ok_or(SageError::NoActiveTask)?;
        require!(task.task_id == task_id, SageError::TaskIdMismatch);
        require!(now <= task.expires_at, SageError::TaskExpired);
        require!(amount <= task.budget_remaining, SageError::BudgetExceeded);
        task.budget_remaining -= amount;
        task.steps_executed = task.steps_executed.saturating_add(1);
    }

    let owner_key = ctx.accounts.user_vault.owner;
    let bump = ctx.accounts.user_vault.bump;
    let bump_arr = [bump];
    let signer_seeds: &[&[&[u8]]] = &[&[USER_VAULT_SEED, owner_key.as_ref(), &bump_arr]];

    let cpi_accounts = Transfer {
        from: ctx.accounts.vault_usdc.to_account_info(),
        to: ctx.accounts.recipient_usdc.to_account_info(),
        authority: ctx.accounts.user_vault.to_account_info(),
    };
    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.key(),
        cpi_accounts,
        signer_seeds,
    );
    token::transfer(cpi_ctx, amount)?;

    let vault = &mut ctx.accounts.user_vault;
    vault.total_spent = vault.total_spent.saturating_add(amount);
    let task = vault.active_task.as_ref().unwrap();

    emit!(StepReleased {
        owner: vault.owner,
        task_id: task.task_id,
        recipient: ctx.accounts.recipient_usdc.key(),
        amount,
        step: task.steps_executed,
    });
    Ok(())
}

#[event]
pub struct StepReleased {
    pub owner: Pubkey,
    pub task_id: [u8; 32],
    pub recipient: Pubkey,
    pub amount: u64,
    pub step: u8,
}
