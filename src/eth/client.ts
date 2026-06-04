import { Contract, JsonRpcProvider, id as keccak256id, zeroPadValue } from "ethers";
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
  zkProof: string;
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
  return new JsonRpcProvider(rpcUrl);
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
  const [cfgRaw, dkgRaw] = await election.getElection();
  const phase: bigint = await election.getPhase();
  const isDKGFinalized: boolean = await election.isDKGFinalized();
  const isResultFinalized: boolean = await election.isResultFinalized();

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

export async function fetchBallotsPage(
  provider: JsonRpcProvider,
  electionAddress: string,
  startIndex: number,
  count: number,
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
  const ballots: Ballot[] = raw.map((b) => ({
    pseudonym: b.pseudonym as Hex,
    vk: b.vk as Hex,
    ciphertexts: b.ciphertexts.map((ct): Ciphertext => ({ c1: ct.c1 as Hex, c2: ct.c2 as Hex })),
    zkProof: b.zkProof as Hex,
    voterSignature: b.voterSignature as Hex,
    wrAttestation: b.wrAttestation as Hex,
  }));
  return { total, ballots };
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
  const topic0 = keccak256id("VoteSubmitted(bytes32,uint256)");
  const topic1 = zeroPadValue(pseudonym, 32);
  // fromBlock as hex string, no toBlock — required by 0xrpc.io which rejects
  // "latest" as toBlock and rejects numeric fromBlock values.
  // Set VITE_REGISTRY_DEPLOY_BLOCK in .env to narrow the search range.
  const deployBlock = import.meta.env.VITE_REGISTRY_DEPLOY_BLOCK;
  const fromBlock = 0
    ? "0x" + parseInt(deployBlock, 10).toString(16)
    : "0x0";
  const logs = await provider.getLogs({
    address: electionAddress,
    topics: [topic0, topic1],
    fromBlock,
  });
  if (logs.length === 0) return null;
  return logs[0].transactionHash as Hex;
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

