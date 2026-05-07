use anchor_lang::prelude::*;

#[constant]
pub const USER_VAULT_SEED: &[u8] = b"user_vault";

pub const STALE_TASK_GRACE_SECONDS: i64 = 30 * 60;

pub const MAX_TASK_DURATION_SECONDS: i64 = 60 * 60;
