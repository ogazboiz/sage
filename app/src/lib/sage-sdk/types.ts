/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/sage_vault.json`.
 */
export type SageVault = {
  "address": "64VYGx9kPeizgiqVRWGMBxbbsLV1n7YZTk8MezvpjqtZ",
  "metadata": {
    "name": "sageVault",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "On-chain agent budget vault for Sage"
  },
  "instructions": [
    {
      "name": "approveTask",
      "discriminator": [
        81,
        171,
        95,
        228,
        10,
        231,
        167,
        225
      ],
      "accounts": [
        {
          "name": "userVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "vaultUsdc"
        },
        {
          "name": "owner",
          "signer": true,
          "relations": [
            "userVault"
          ]
        }
      ],
      "args": [
        {
          "name": "taskId",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "budget",
          "type": "u64"
        },
        {
          "name": "expiresAt",
          "type": "i64"
        }
      ]
    },
    {
      "name": "completeTask",
      "discriminator": [
        109,
        167,
        192,
        41,
        129,
        108,
        220,
        196
      ],
      "accounts": [
        {
          "name": "userVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "user_vault.owner",
                "account": "userVault"
              }
            ]
          }
        },
        {
          "name": "signer",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "taskId",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "deposit",
      "discriminator": [
        242,
        35,
        198,
        137,
        82,
        225,
        242,
        182
      ],
      "accounts": [
        {
          "name": "userVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "vaultUsdc",
          "writable": true
        },
        {
          "name": "ownerUsdc",
          "writable": true
        },
        {
          "name": "owner",
          "writable": true,
          "signer": true,
          "relations": [
            "userVault"
          ]
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "forceCompleteStaleTask",
      "discriminator": [
        114,
        217,
        149,
        106,
        167,
        136,
        227,
        39
      ],
      "accounts": [
        {
          "name": "userVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "user_vault.owner",
                "account": "userVault"
              }
            ]
          }
        },
        {
          "name": "caller",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "taskId",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "initUserVault",
      "discriminator": [
        144,
        193,
        26,
        93,
        68,
        219,
        32,
        180
      ],
      "accounts": [
        {
          "name": "userVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "usdcMint"
        },
        {
          "name": "vaultUsdc",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "userVault"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "usdcMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "agentKeypair",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "releaseStep",
      "discriminator": [
        7,
        90,
        221,
        0,
        170,
        52,
        211,
        53
      ],
      "accounts": [
        {
          "name": "userVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "user_vault.owner",
                "account": "userVault"
              }
            ]
          }
        },
        {
          "name": "vaultUsdc",
          "writable": true
        },
        {
          "name": "recipientUsdc",
          "writable": true
        },
        {
          "name": "signer",
          "signer": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "taskId",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "withdraw",
      "discriminator": [
        183,
        18,
        70,
        156,
        148,
        109,
        161,
        34
      ],
      "accounts": [
        {
          "name": "userVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "vaultUsdc",
          "writable": true
        },
        {
          "name": "ownerUsdc",
          "writable": true
        },
        {
          "name": "owner",
          "signer": true,
          "relations": [
            "userVault"
          ]
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "userVault",
      "discriminator": [
        23,
        76,
        96,
        159,
        210,
        10,
        5,
        22
      ]
    }
  ],
  "events": [
    {
      "name": "deposited",
      "discriminator": [
        111,
        141,
        26,
        45,
        161,
        35,
        100,
        57
      ]
    },
    {
      "name": "staleTaskForced",
      "discriminator": [
        77,
        126,
        240,
        101,
        122,
        125,
        209,
        37
      ]
    },
    {
      "name": "stepReleased",
      "discriminator": [
        170,
        228,
        167,
        202,
        226,
        152,
        228,
        39
      ]
    },
    {
      "name": "taskApproved",
      "discriminator": [
        141,
        97,
        247,
        152,
        147,
        59,
        68,
        164
      ]
    },
    {
      "name": "taskCompleted",
      "discriminator": [
        132,
        223,
        98,
        152,
        2,
        9,
        57,
        128
      ]
    },
    {
      "name": "vaultInitialized",
      "discriminator": [
        180,
        43,
        207,
        2,
        18,
        71,
        3,
        75
      ]
    },
    {
      "name": "withdrawn",
      "discriminator": [
        20,
        89,
        223,
        198,
        194,
        124,
        219,
        13
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "taskActive",
      "msg": "Vault has an active task"
    },
    {
      "code": 6001,
      "name": "noActiveTask",
      "msg": "No active task on vault"
    },
    {
      "code": 6002,
      "name": "taskIdMismatch",
      "msg": "Task ID mismatch"
    },
    {
      "code": 6003,
      "name": "budgetExceeded",
      "msg": "Step amount exceeds remaining budget"
    },
    {
      "code": 6004,
      "name": "taskNotExpired",
      "msg": "Task has not yet expired"
    },
    {
      "code": 6005,
      "name": "gracePeriodNotReached",
      "msg": "Stale-task grace period not yet reached"
    },
    {
      "code": 6006,
      "name": "unauthorized",
      "msg": "Signer is not authorized for this vault"
    },
    {
      "code": 6007,
      "name": "invalidBudget",
      "msg": "Budget must be greater than zero"
    },
    {
      "code": 6008,
      "name": "invalidExpiration",
      "msg": "Expiration is invalid or exceeds the maximum task duration"
    },
    {
      "code": 6009,
      "name": "insufficientBalance",
      "msg": "Vault has insufficient balance for the requested action"
    },
    {
      "code": 6010,
      "name": "taskExpired",
      "msg": "Task has expired"
    }
  ],
  "types": [
    {
      "name": "deposited",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "staleTaskForced",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "taskId",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "refunded",
            "type": "u64"
          },
          {
            "name": "forcedBy",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "stepReleased",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "taskId",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "recipient",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "step",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "taskApproved",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "taskId",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "budget",
            "type": "u64"
          },
          {
            "name": "expiresAt",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "taskCompleted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "taskId",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "refunded",
            "type": "u64"
          },
          {
            "name": "steps",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "taskState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "taskId",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "budgetRemaining",
            "type": "u64"
          },
          {
            "name": "expiresAt",
            "type": "i64"
          },
          {
            "name": "stepsExecuted",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "userVault",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "agentKeypair",
            "type": "pubkey"
          },
          {
            "name": "usdcMint",
            "type": "pubkey"
          },
          {
            "name": "activeTask",
            "type": {
              "option": {
                "defined": {
                  "name": "taskState"
                }
              }
            }
          },
          {
            "name": "totalDeposited",
            "type": "u64"
          },
          {
            "name": "totalSpent",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "vaultInitialized",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "agent",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "withdrawn",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    }
  ],
  "constants": [
    {
      "name": "userVaultSeed",
      "type": "bytes",
      "value": "[117, 115, 101, 114, 95, 118, 97, 117, 108, 116]"
    }
  ]
};
