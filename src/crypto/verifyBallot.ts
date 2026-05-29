import type { Ballot } from "../eth/types";
import { G1Point, G2Point, schnorrVerify, verifyBallot } from "@shutter-network/urban-verified-crypto";
import { keccak256 } from "viem";
import { concatBytes, hexToBytes } from "./utils";
import { ensureCurvesReady } from "./curves";

let _verifyMutex: Promise<void> = Promise.resolve();

/** Drop queued in-flight ballot crypto when the user leaves the ballots tab. */
export function cancelBallotVerificationWork(): void {
  _verifyMutex = Promise.resolve();
}

function runVerifyExclusive<T>(fn: () => Promise<T>): Promise<T> {
  const next = _verifyMutex.then(fn, fn);
  _verifyMutex = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

function cloneBallot(ballot: Ballot): Ballot {
  return {
    pseudonym: ballot.pseudonym,
    vk: ballot.vk,
    ciphertexts: ballot.ciphertexts.map((ct) => ({ c1: ct.c1, c2: ct.c2 })),
    zkProof: ballot.zkProof,
    voterSignature: ballot.voterSignature,
    wrAttestation: ballot.wrAttestation,
  };
}

export type BallotVerifyResult =
  | { ok: true }
  | { ok: false; reason: string };

// WR attestation (Schnorr on G1, SDK DST).
//   msg = keccak256(electionId || pseudonym || vkBytes); sig = schnorrSign(wr_sk, wr_vk, msg)

function bytesToBigIntBE(b: Uint8Array): bigint {
  let x = 0n;
  for (const v of b) x = (x << 8n) + BigInt(v);
  return x;
}

function decodeSchnorr(sig: Uint8Array): { R: G1Point; s: bigint } {
  if (sig.length !== 80) throw new Error(`bad schnorr signature length ${sig.length}`);
  const Rb = sig.slice(0, 48);
  const sb = sig.slice(48);
  return { R: G1Point.fromBytes(Rb), s: bytesToBigIntBE(sb) };
}

function makeWrVerifier(pkWrG1Compressed: Uint8Array) {
  const wrVk = G1Point.fromBytes(pkWrG1Compressed);
  return (
    electionId32: Uint8Array,
    pseudonym32: Uint8Array,
    vkBytes: Uint8Array,
    att: Uint8Array,
  ): boolean => {
    if (electionId32.length !== 32 || pseudonym32.length !== 32 || vkBytes.length !== 48) return false;
    let decoded: { R: G1Point; s: bigint };
    try {
      decoded = decodeSchnorr(att);
    } catch {
      return false;
    }
    const msg32 = hexToBytes(keccak256(concatBytes(electionId32, pseudonym32, vkBytes)));
    return schnorrVerify(wrVk, msg32, decoded);
  };
}

// WR Schnorr + voter Schnorr + full SDK verifyBallot (ZK proofs and ciphertext checks).

export async function verifyBallotMvp(params: {
  mpkElectionG2: Uint8Array;
  pkWrG1: Uint8Array;
  electionId: bigint;
  numCandidates: number;
  budget: number;
  ballot: Ballot;
}): Promise<BallotVerifyResult> {
  const { mpkElectionG2, pkWrG1, electionId, numCandidates, budget, ballot } = params;

  if (numCandidates < 1 || numCandidates > 0xffff) return { ok: false, reason: `numCandidates out of range` };
  if (budget < 1 || budget > 0xffff) return { ok: false, reason: `budget out of range` };

  await ensureCurvesReady();

  const ballotSnap = cloneBallot(ballot);

  return runVerifyExclusive(async () => {
    const electionId32 = bigIntToBytes32(electionId);
    const pseudonym32 = hexToBytes(ballotSnap.pseudonym);
    if (pseudonym32.length !== 32) return { ok: false, reason: "pseudonym must be 32 bytes" };

    const vkBytes = hexToBytes(ballotSnap.vk);
    if (vkBytes.length !== 48) return { ok: false, reason: `vk length ${vkBytes.length} != 48` };

    if (ballotSnap.ciphertexts.length !== numCandidates) {
      return { ok: false, reason: `ciphertexts.length ${ballotSnap.ciphertexts.length} != numCandidates ${numCandidates}` };
    }
    const cts = ballotSnap.ciphertexts.map((ct, i) => {
      const c1 = new Uint8Array(hexToBytes(ct.c1));
      const c2 = new Uint8Array(hexToBytes(ct.c2));
      if (c1.length !== 96 || c2.length !== 96) {
        throw new Error(`ciphertext[${i}] bad length`);
      }
      // Ensure they are valid compressed points (throws if invalid)
      G2Point.fromBytes(c1);
      G2Point.fromBytes(c2);
      return { c1, c2 };
    });

    const zkProof = new Uint8Array(hexToBytes(ballotSnap.zkProof));
    const voterSig = new Uint8Array(hexToBytes(ballotSnap.voterSignature));
    const wrAtt = new Uint8Array(hexToBytes(ballotSnap.wrAttestation));
    if (zkProof.length === 0) return { ok: false, reason: "zkProof empty" };
    if (voterSig.length === 0) return { ok: false, reason: "voterSignature empty" };
    if (wrAtt.length === 0) return { ok: false, reason: "wrAttestation empty" };

    const mpkG2 = new Uint8Array(mpkElectionG2);
    const pkWr = new Uint8Array(pkWrG1);

    // Full SDK verification (proofs + Schnorr + WR attestation).
    const mpk = G2Point.fromBytes(mpkG2);
    const verifyWr = makeWrVerifier(pkWr);
    const vr = verifyBallot(
      {
        electionId: electionId32,
        pseudonym: pseudonym32,
        vk: vkBytes,
        ciphertexts: cts.map((ct) => [ct.c1, ct.c2] as const),
        zkProof,
        voterSignature: voterSig,
        wrAttestation: wrAtt,
      },
      {
        numCandidates,
        budget,
        mode: "exact",
        variant: "A",
      },
      mpk,
      verifyWr,
    );

    if (vr.ok === false) return { ok: false, reason: vr.reason };
    return { ok: true };
  });
}

function bigIntToBytes32(x: bigint): Uint8Array {
  const out = new Uint8Array(32);
  let v = x;
  for (let i = 31; i >= 0; i--) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return out;
}

