use anchor_lang::prelude::*;

use crate::{
    constants::{STALE_TASK_GRACE_SECONDS, USER_VAULT_SEED},
    error::SageError,
    state::UserVault,
};

#[derive(Accounts)]
pub struct ForceCompleteStaleTask<'info> {
    #[account(
        mut,
        seeds = [USER_VAULT_SEED, user_vault.owner.as_ref()],
        bump = user_vault.bump,
    )]
    pub user_vault: Account<'info, UserVault>,

    pub caller: Signer<'info>,
}

pub(crate) fn handler(ctx: Context<ForceCompleteStaleTask>, task_id: [u8; 32]) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let vault = &mut ctx.accounts.user_vault;
    let task = vault.active_task.as_ref().ok_or(SageError::NoActiveTask)?;
    require!(task.task_id == task_id, SageError::TaskIdMismatch);
    require!(
        now > task.expires_at + STALE_TASK_GRACE_SECONDS,
        SageError::GracePeriodNotReached
    );

    let task_id_copy = task.task_id;
    let refunded = task.budget_remaining;
    vault.active_task = None;

    emit!(StaleTaskForced {
        owner: vault.owner,
        task_id: task_id_copy,
        refunded,
        forced_by: ctx.accounts.caller.key(),
    });
    Ok(())
}

#[event]
pub struct StaleTaskForced {
    pub owner: Pubkey,
    pub task_id: [u8; 32],
    pub refunded: u64,
    pub forced_by: Pubkey,
}
