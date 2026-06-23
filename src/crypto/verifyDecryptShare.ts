import {
  G2Point,
  Transcript,
  verifyDecryptionShare,
  type Ciphertext,
  type PartialDecryption,
} from "@shutter-network/urban-verified-crypto";
import { ensureCurvesReady } from "./curves";
import { hexToBytes, u16be } from "./utils";

const ONCHAIN_DECRYPT_LABEL = "SHUTTER-VOTE-DECRYPT-v1";
const G2_BYTES = 96;
const Q =
  0x73eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000001n;

function modQ(n: bigint): bigint {
  const r = n % Q;
  return r < 0n ? r + Q : r;
}

function electionIdToBytes32(id: bigint): Uint8Array {
  if (id < 0n || id >= 1n << 256n) {
    throw new Error(`electionId out of uint256 range: ${id}`);
  }
  const out = new Uint8Array(32);
  let x = id;
  for (let i = 31; i >= 0; i--) {
    out[i] = Number(x & 0xffn);
    x >>= 8n;
  }
  return out;
}

/** Same seeding as `sdk_compat.make_onchain_decrypt_transcript` / keyper `publish_on_chain`. */
export function makeOnchainDecryptTranscript(electionId: bigint, candidateIndex: number): Transcript {
  if (!Number.isInteger(candidateIndex) || candidateIndex < 0 || candidateIndex > 0xffff) {
    throw new Error(`candidateIndex out of u16 range: ${candidateIndex}`);
  }
  const t = new Transcript(ONCHAIN_DECRYPT_LABEL);
  t.append("electionId", electionIdToBytes32(electionId));
  t.append("candidate", u16be(candidateIndex));
  return t;
}

export type DecryptShareVerifyResult = { ok: true } | { ok: false; reason: string };

/**
 * DLEQ check for one keyper share: same transcript as on-chain (`appendPoint` tags;
 * must match `sdk_compat.verify_decryption_share`). `memberIndex` is 0-based committee index.
 */
export async function verifyDecryptShareDleq(args: {
  electionId: bigint;
  candidateIndex: number;
  aggregateC1: string;
  aggregateC2: string;
  shareHex: string;
  proof: { e: bigint; z: bigint };
  committeePkHex: string;
  /** `DecryptionShare.keyperIndex` on-chain (0-based committee member). */
  memberIndex: number;
}): Promise<DecryptShareVerifyResult> {
  await ensureCurvesReady();

  if (!args.committeePkHex || args.committeePkHex === "0x") {
    return { ok: false as const, reason: "Missing committee public key for this keyperIndex" };
  }
  if (args.memberIndex < 0 || args.memberIndex > 0xffff) {
    return { ok: false as const, reason: `Invalid memberIndex ${args.memberIndex}` };
  }

  try {
    const c1b = hexToBytes(args.aggregateC1 as `0x${string}`);
    const c2b = hexToBytes(args.aggregateC2 as `0x${string}`);
    const mpkb = hexToBytes(args.committeePkHex as `0x${string}`);
    const sigb = hexToBytes(args.shareHex as `0x${string}`);
    if (c1b.length !== G2_BYTES || c2b.length !== G2_BYTES || mpkb.length !== G2_BYTES || sigb.length !== G2_BYTES) {
      return { ok: false as const, reason: "Expected 96-byte compressed G₂ for c1/c2/mpk/sigma" };
    }

    const dkgKeyperIndex = args.memberIndex + 1;
    const t = makeOnchainDecryptTranscript(args.electionId, args.candidateIndex);
    let c1Pt: G2Point | null = null;
    let c2Pt: G2Point | null = null;
    let sigmaPt: G2Point | null = null;
    let committeePK: G2Point | null = null;
    try {
      c1Pt = G2Point.fromBytes(c1b);
      c2Pt = G2Point.fromBytes(c2b);
      sigmaPt = G2Point.fromBytes(sigb);
      committeePK = G2Point.fromBytes(mpkb);
      const ct: Ciphertext = { c1: c1Pt, c2: c2Pt };
      const share: PartialDecryption = {
        keyperIndex: dkgKeyperIndex,
        sigma: sigmaPt,
        proof: { e: modQ(args.proof.e), z: modQ(args.proof.z) },
      };
      const ok = verifyDecryptionShare(ct, share, committeePK, t);
      if (ok) return { ok: true as const };
      return { ok: false as const, reason: "DLEQ verification failed (challenge mismatch or invalid proof)" };
    } finally {
      c1Pt?.destroyWasm();
      c2Pt?.destroyWasm();
      sigmaPt?.destroyWasm();
      committeePK?.destroyWasm();
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false as const, reason: msg };
  }
}
