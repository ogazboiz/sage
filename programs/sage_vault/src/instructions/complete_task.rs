use anchor_lang::prelude::*;

use crate::{constants::USER_VAULT_SEED, error::SageError, state::UserVault};

#[derive(Accounts)]
pub struct CompleteTask<'info> {
    #[account(
        mut,
        seeds = [USER_VAULT_SEED, user_vault.owner.as_ref()],
        bump = user_vault.bump,
    )]
    pub user_vault: Account<'info, UserVault>,

    pub signer: Signer<'info>,
}

pub(crate) fn handler(ctx: Context<CompleteTask>, task_id: [u8; 32]) -> Result<()> {
    require!(
        ctx.accounts.signer.key() == ctx.accounts.user_vault.owner
            || ctx.accounts.signer.key() == ctx.accounts.user_vault.agent_keypair,
        SageError::Unauthorized
    );

    let vault = &mut ctx.accounts.user_vault;
    let task = vault.active_task.as_ref().ok_or(SageError::NoActiveTask)?;
    require!(task.task_id == task_id, SageError::TaskIdMismatch);

    let task_id_copy = task.task_id;
    let refunded = task.budget_remaining;
    let steps = task.steps_executed;

    vault.active_task = None;

    emit!(TaskCompleted {
        owner: vault.owner,
        task_id: task_id_copy,
        refunded,
        steps,
    });
    Ok(())
}

#[event]
pub struct TaskCompleted {
    pub owner: Pubkey,
    pub task_id: [u8; 32],
    pub refunded: u64,
    pub steps: u8,
}
