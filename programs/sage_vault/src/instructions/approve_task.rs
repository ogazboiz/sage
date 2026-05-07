use anchor_lang::prelude::*;
use anchor_spl::token::TokenAccount;

use crate::{
    constants::{MAX_TASK_DURATION_SECONDS, USER_VAULT_SEED},
    error::SageError,
    state::{TaskState, UserVault},
};

#[derive(Accounts)]
pub struct ApproveTask<'info> {
    #[account(
        mut,
        seeds = [USER_VAULT_SEED, owner.key().as_ref()],
        bump = user_vault.bump,
        has_one = owner,
    )]
    pub user_vault: Account<'info, UserVault>,

    #[account(
        constraint = vault_usdc.mint == user_vault.usdc_mint,
        constraint = vault_usdc.owner == user_vault.key(),
    )]
    pub vault_usdc: Account<'info, TokenAccount>,

    pub owner: Signer<'info>,
}

pub(crate) fn handler(
    ctx: Context<ApproveTask>,
    task_id: [u8; 32],
    budget: u64,
    expires_at: i64,
) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    require!(budget > 0, SageError::InvalidBudget);
    require!(expires_at > now, SageError::InvalidExpiration);
    require!(
        expires_at - now <= MAX_TASK_DURATION_SECONDS,
        SageError::InvalidExpiration
    );
    require!(
        budget <= ctx.accounts.vault_usdc.amount,
        SageError::InsufficientBalance
    );

    let vault = &mut ctx.accounts.user_vault;
    require!(vault.active_task.is_none(), SageError::TaskActive);

    vault.active_task = Some(TaskState {
        task_id,
        budget_remaining: budget,
        expires_at,
        steps_executed: 0,
    });

    emit!(TaskApproved {
        owner: vault.owner,
        task_id,
        budget,
        expires_at,
    });
    Ok(())
}

#[event]
pub struct TaskApproved {
    pub owner: Pubkey,
    pub task_id: [u8; 32],
    pub budget: u64,
    pub expires_at: i64,
}
