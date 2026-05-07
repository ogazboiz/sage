// This file MUST be the first import in main.tsx so its side effects run
// before any module that touches Buffer or process. Bare imports below load
// their packages first, then the assignments execute, all before the next
// top-level import in main.tsx.
import { Buffer as BufferPolyfill } from "buffer";
import processPolyfill from "process";

if (typeof globalThis !== "undefined") {
  // Cast through unknown to avoid the circular self-reference TS error.
  if (!(globalThis as unknown as { Buffer?: unknown }).Buffer) {
    (globalThis as unknown as { Buffer: typeof BufferPolyfill }).Buffer =
      BufferPolyfill;
  }
  if (!(globalThis as unknown as { process?: unknown }).process) {
    (globalThis as unknown as { process: typeof processPolyfill }).process =
      processPolyfill;
  }
}
