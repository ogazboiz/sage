use anchor_lang::prelude::*;

#[error_code]
pub enum SageError {
    #[msg("Vault has an active task")]
    TaskActive,
    #[msg("No active task on vault")]
    NoActiveTask,
    #[msg("Task ID mismatch")]
    TaskIdMismatch,
    #[msg("Step amount exceeds remaining budget")]
    BudgetExceeded,
    #[msg("Task has not yet expired")]
    TaskNotExpired,
    #[msg("Stale-task grace period not yet reached")]
    GracePeriodNotReached,
    #[msg("Signer is not authorized for this vault")]
    Unauthorized,
    #[msg("Budget must be greater than zero")]
    InvalidBudget,
    #[msg("Expiration is invalid or exceeds the maximum task duration")]
    InvalidExpiration,
    #[msg("Vault has insufficient balance for the requested action")]
    InsufficientBalance,
    #[msg("Task has expired")]
    TaskExpired,
}
