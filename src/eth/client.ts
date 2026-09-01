import { Contract, JsonRpcProvider, id as keccak256id, keccak256, toBeHex, zeroPadValue } from "ethers";
import { ElectionAbi, ElectionRegistryAbi } from "./abis";
import type {
  Ballot,
  Ciphertext,
  DecryptionShare,
  DkgResultView,
  ElectionConfigView,
  ElectionResult,
  EncryptedTally,
  Hex,
} from "./types";

/** `Election.getBallots` row (ethers `Result` as plain fields). */
type BallotRowRaw = {
  pseudonym: string;
  vk: string;
  ciphertexts: { c1: string; c2: string }[];
  zkProofHash: string;
  voterSignature: string;
  wrAttestation: string;
};

type AggregateContractRow = { aggregates: { c1: string; c2: string }[] };

type DecryptionShareRowRaw = {
  keyperIndex: bigint | number;
  submittedAt: bigint | number;
  shares: string[];
  proofs: { e: bigint | number; z: bigint | number }[];
};

export function makeProvider(rpcUrl: string) {
  // staticNetwork: detect the chain id once, then stop re-querying it.
  return new JsonRpcProvider(rpcUrl, undefined, { staticNetwork: true });
}

export function makeRegistry(provider: JsonRpcProvider, address: string) {
  return new Contract(address, ElectionRegistryAbi, provider);
}

export function makeElection(provider: JsonRpcProvider, address: string) {
  return new Contract(address, ElectionAbi, provider);
}

export async function fetchElectionsFromRegistry(
  provider: JsonRpcProvider,
  registryAddress: string,
): Promise<string[]> {
  const reg = makeRegistry(provider, registryAddress);
  const count: bigint = await reg.electionCount();
  if (count === 0n) return [];
  // Registry election IDs are 1-indexed: elections[0] is the zero address.
  const res: string[] = await reg.getElections(1n, count);
  // Defensive: filter zero addresses in case a chain has gaps.
  return res.filter((a) => a && a !== "0x0000000000000000000000000000000000000000");
}

/** On-chain `electionId` from `Election.getElection()` config (one RPC). */
export async function fetchElectionElectionId(
  provider: JsonRpcProvider,
  electionAddress: string,
): Promise<bigint> {
  const election = makeElection(provider, electionAddress);
  const [cfgRaw] = await election.getElection();
  return cfgRaw.electionId as bigint;
}

export async function fetchElectionOverview(provider: JsonRpcProvider, electionAddress: string): Promise<{
  config: ElectionConfigView;
  dkg: DkgResultView;
  phase: number;
  isDKGFinalized: boolean;
  isResultFinalized: boolean;
}> {
  const election = makeElection(provider, electionAddress);
  const [electionRaw, phaseRaw, dkgFinalizedRaw, resultFinalizedRaw] = await Promise.all([
    election.getElection(),
    election.getPhase(),
    election.isDKGFinalized(),
    election.isResultFinalized(),
  ]);
  const [cfgRaw, dkgRaw] = electionRaw;
  const phase: bigint = phaseRaw;
  const isDKGFinalized: boolean = dkgFinalizedRaw;
  const isResultFinalized: boolean = resultFinalizedRaw;

  const config: ElectionConfigView = {
    electionId: cfgRaw.electionId,
    votingStart: cfgRaw.votingStart,
    votingEnd: cfgRaw.votingEnd,
    selfSubmitFee: cfgRaw.selfSubmitFee,
    numCandidates: Number(cfgRaw.numCandidates),
    budget: Number(cfgRaw.budget),
    thresholdN: cfgRaw.thresholdN,
    thresholdT: cfgRaw.thresholdT,
    keyperAddresses: [...cfgRaw.keyperAddresses],
    pkWR: cfgRaw.pkWR as Hex,
  };
  const dkg: DkgResultView = {
    pkElection: dkgRaw.pkElection as Hex,
    committeePKs: [...dkgRaw.committeePKs] as Hex[],
  };
  return { config, dkg, phase: Number(phase), isDKGFinalized, isResultFinalized };
}

export async function fetchBallotTotal(
  provider: JsonRpcProvider,
  electionAddress: string,
): Promise<bigint> {
  const election = makeElection(provider, electionAddress);
  return (await election.getNumBallots()) as bigint;
}

export async function fetchBallotsPage(
  provider: JsonRpcProvider,
  electionAddress: string,
  startIndex: number,
  count: number,
  { withProofs = true }: { withProofs?: boolean } = {},
): Promise<{ total: bigint; ballots: Ballot[] }> {
  const election = makeElection(provider, electionAddress);
  const total: bigint = await election.getNumBallots();
  const start = BigInt(Math.max(0, startIndex));
  if (start >= total) return { total, ballots: [] };

  // IMPORTANT: Election.getBallots does not bounds-check and will revert if
  // (startIndex + count) exceeds total. So we clamp count to the remaining items.
  const remaining = total - start;
  const clampedCount = BigInt(Math.max(0, Math.min(count, Number(remaining))));
  if (clampedCount === 0n) return { total, ballots: [] };

  const raw = (await election.getBallots(start, clampedCount)) as BallotRowRaw[];
  const ballots: Ballot[] = raw.map((b, i) => ({
    ballotIndex: Number(start) + i,
    pseudonym: b.pseudonym as Hex,
    vk: b.vk as Hex,
    ciphertexts: b.ciphertexts.map((ct): Ciphertext => ({ c1: ct.c1 as Hex, c2: ct.c2 as Hex })),
    zkProofHash: b.zkProofHash as Hex,
    zkProof: "0x" as Hex, // filled in below unless withProofs is false
    voterSignature: b.voterSignature as Hex,
    wrAttestation: b.wrAttestation as Hex,
  }));

  if (withProofs && ballots.length > 0) {
    const indexes = ballots.map((_, i) => Number(start) + i);
    const proofs = await fetchBallotProofs(provider, electionAddress, indexes);
    ballots.forEach((ballot, i) => {
      const proof = proofs.get(indexes[i]);
      if (proof === undefined) {
        throw new Error(
          `ballot ${indexes[i]}: no VoteSubmitted log carrying a proof ` +
            `(searched from block ${resolveFromBlock()}; is VITE_REGISTRY_DEPLOY_BLOCK too high?)`,
        );
      }
      if (keccak256(proof) !== ballot.zkProofHash) {
        throw new Error(
          `ballot ${indexes[i]}: logged proof does not match on-chain commitment ${ballot.zkProofHash}`,
        );
      }
      ballot.zkProof = proof;
    });
  }

  return { total, ballots };
}

/**
 * Recover ballot zkProofs from `VoteSubmitted` logs.
 *
 * Contract storage holds only `keccak256(zkProof)` -- storing the proof
 * itself costs 625 gas/byte and pushed `submitVote` past the block gas limit
 * at production election sizes. The bytes travel in the event instead, which
 * is equally permanent (committed by the block header's receiptsRoot).
 *
 * Keyed by `ballotIndex`, never by `pseudonym`: re-votes append a new ballot
 * record, so one pseudonym can own several ballots. `ballotIndex` is an
 * indexed topic, so this filters server-side rather than scanning.
 */
export async function fetchBallotProofs(
  provider: JsonRpcProvider,
  electionAddress: string,
  ballotIndexes: number[],
): Promise<Map<number, Hex>> {
  const out = new Map<number, Hex>();
  if (ballotIndexes.length === 0) return out;

  const election = makeElection(provider, electionAddress);
  const topic0 = keccak256id("VoteSubmitted(bytes32,uint256,bytes)");
  // toBeHex(value, 32) emits a full 32-byte topic. Do NOT hand-roll this as
  // "0x" + i.toString(16): odd-length hex ("0x0", "0xa", "0x100") is not a
  // valid BytesLike and ethers rejects it.
  const indexTopics = ballotIndexes.map((i) => toBeHex(i, 32));

  const logs = await provider.getLogs({
    address: electionAddress,
    // [signature, any pseudonym, one of these ballot indexes]
    topics: [topic0, null, indexTopics],
    fromBlock: resolveFromBlock(),
  });

  for (const log of logs) {
    const parsed = election.interface.parseLog({ topics: [...log.topics], data: log.data });
    if (!parsed) continue;
    out.set(Number(parsed.args.ballotIndex), parsed.args.zkProof as Hex);
  }
  return out;
}

/**
 * Start block for log queries, as a hex string.
 *
 * `fromBlock` must be hex and `toBlock` must be omitted -- 0xrpc.io rejects
 * numeric fromBlock and rejects "latest" as toBlock. Set
 * VITE_REGISTRY_DEPLOY_BLOCK to narrow the range; scanning from 0 is fine on
 * a devnet but slow or refused on a public chain.
 */
function resolveFromBlock(): string {
  const deployBlock = import.meta.env.VITE_REGISTRY_DEPLOY_BLOCK;
  const parsed = deployBlock ? parseInt(deployBlock, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? "0x" + parsed.toString(16) : "0x0";
}

export async function fetchAggregate(
  provider: JsonRpcProvider,
  electionAddress: string,
): Promise<EncryptedTally | null> {
  const election = makeElection(provider, electionAddress);
  try {
    const raw = (await election.getAggregate()) as AggregateContractRow;
    return {
      aggregates: raw.aggregates.map((ct) => ({ c1: ct.c1 as Hex, c2: ct.c2 as Hex })),
    };
  } catch {
    return null;
  }
}

export async function fetchDecryptionShares(
  provider: JsonRpcProvider,
  electionAddress: string,
): Promise<DecryptionShare[]> {
  const election = makeElection(provider, electionAddress);
  const raw = (await election.getDecryptionShares()) as DecryptionShareRowRaw[];
  return raw.map((s) => ({
    keyperIndex: Number(s.keyperIndex),
    submittedAt: BigInt(s.submittedAt),
    shares: [...s.shares] as Hex[],
    proofs: s.proofs.map((p) => ({ e: BigInt(p.e), z: BigInt(p.z) })),
  }));
}

export async function fetchBallotTxHash(
  provider: JsonRpcProvider,
  electionAddress: string,
  pseudonym: Hex,
): Promise<Hex | null> {
  const topic0 = keccak256id("VoteSubmitted(bytes32,uint256,bytes)");
  const topic1 = zeroPadValue(pseudonym, 32);
  const logs = await provider.getLogs({
    address: electionAddress,
    topics: [topic0, topic1],
    fromBlock: resolveFromBlock(),
  });
  if (logs.length === 0) return null;
  // A re-voted pseudonym owns several ballots -- the contract appends a record
  // per submission. Return the newest, which is the one `getBallot(pseudonym)`
  // resolves to and the one the voter is asking about. topics[2] is the
  // indexed ballotIndex.
  const newest = logs.reduce((a, b) =>
    BigInt(b.topics[2]) > BigInt(a.topics[2]) ? b : a,
  );
  return newest.transactionHash as Hex;
}

export async function fetchResult(
  provider: JsonRpcProvider,
  electionAddress: string,
): Promise<ElectionResult | null> {
  const election = makeElection(provider, electionAddress);
  const raw = await election.getResult();
  const tally: bigint[] = [...raw.tally];
  const keyperIndices: number[] = [...raw.keyperIndices].map((x) => Number(x));
  // If result not finalized, contracts may still return empty arrays.
  if (tally.length === 0) return null;
  return { tally, keyperIndices };
}

