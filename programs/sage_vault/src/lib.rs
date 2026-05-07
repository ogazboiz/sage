pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use error::*;
pub use instructions::*;
pub use state::*;

declare_id!("64VYGx9kPeizgiqVRWGMBxbbsLV1n7YZTk8MezvpjqtZ");

#[program]
pub mod sage_vault {
    use super::*;

    pub fn init_user_vault(ctx: Context<InitUserVault>, agent_keypair: Pubkey) -> Result<()> {
        instructions::init_user_vault::handler(ctx, agent_keypair)
    }

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        instructions::deposit::handler(ctx, amount)
    }

    pub fn approve_task(
        ctx: Context<ApproveTask>,
        task_id: [u8; 32],
        budget: u64,
        expires_at: i64,
    ) -> Result<()> {
        instructions::approve_task::handler(ctx, task_id, budget, expires_at)
    }

    pub fn release_step(
        ctx: Context<ReleaseStep>,
        task_id: [u8; 32],
        amount: u64,
    ) -> Result<()> {
        instructions::release_step::handler(ctx, task_id, amount)
    }

    pub fn complete_task(ctx: Context<CompleteTask>, task_id: [u8; 32]) -> Result<()> {
        instructions::complete_task::handler(ctx, task_id)
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        instructions::withdraw::handler(ctx, amount)
    }

    pub fn force_complete_stale_task(
        ctx: Context<ForceCompleteStaleTask>,
        task_id: [u8; 32],
    ) -> Result<()> {
        instructions::force_complete_stale_task::handler(ctx, task_id)
    }
}
