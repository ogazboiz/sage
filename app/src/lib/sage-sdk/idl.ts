import idlJson from "./idl.json";
import type { SageVault } from "./types";

export const IDL = idlJson as unknown as SageVault;
export const PROGRAM_ID_STRING = idlJson.address;

export type { SageVault } from "./types";
