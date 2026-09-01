export type CachedBallotVerify =
  | { status: "ok" }
  | { status: "bad"; reason: string };

type UiVerifyState =
  | { status: "idle" }
  | { status: "verifying"; token: number }
  | { status: "ok"; token: number }
  | { status: "bad"; reason: string; token: number };

const cache = new Map<string, CachedBallotVerify>();

/**
 * Keyed by ballotIndex, NOT pseudonym.
 *
 * A voter may submit more than once -- the contract appends a record per
 * submission rather than replacing -- so a pseudonym can own several ballots
 * with different verification outcomes. Keying on pseudonym let the last
 * ballot verified overwrite the others' results, which is exactly wrong when
 * the interesting case is "the newest is spoiled but an older one is good".
 */
export function ballotVerifyCacheKey(electionAddr: string, ballotIndex: number): string {
  return `${electionAddr.toLowerCase()}:${ballotIndex}`;
}

export function getCachedBallotVerify(
  electionAddr: string,
  ballotIndex: number,
): CachedBallotVerify | undefined {
  return cache.get(ballotVerifyCacheKey(electionAddr, ballotIndex));
}

export function setCachedBallotVerify(
  electionAddr: string,
  ballotIndex: number,
  result: CachedBallotVerify,
): void {
  cache.set(ballotVerifyCacheKey(electionAddr, ballotIndex), result);
}

export function cachedVerifyToUiState(cached: CachedBallotVerify, token = 0): UiVerifyState {
  if (cached.status === "ok") return { status: "ok", token };
  return { status: "bad", reason: cached.reason, token };
}

export function applyCachedVerifyForBallots(
  electionAddr: string,
  ballots: { ballotIndex: number }[],
  token = 0,
): Record<number, UiVerifyState> {
  const out: Record<number, UiVerifyState> = {};
  for (const b of ballots) {
    const cached = getCachedBallotVerify(electionAddr, b.ballotIndex);
    if (cached) out[b.ballotIndex] = cachedVerifyToUiState(cached, token);
  }
  return out;
}
