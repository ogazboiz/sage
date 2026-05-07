use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct UserVault {
    pub owner: Pubkey,
    pub agent_keypair: Pubkey,
    pub usdc_mint: Pubkey,
    pub active_task: Option<TaskState>,
    pub total_deposited: u64,
    pub total_spent: u64,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace)]
pub struct TaskState {
    pub task_id: [u8; 32],
    pub budget_remaining: u64,
    pub expires_at: i64,
    pub steps_executed: u8,
}
