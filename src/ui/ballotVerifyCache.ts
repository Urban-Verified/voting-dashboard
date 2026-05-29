export type CachedBallotVerify =
  | { status: "ok" }
  | { status: "bad"; reason: string };

type UiVerifyState =
  | { status: "idle" }
  | { status: "verifying"; token: number }
  | { status: "ok"; token: number }
  | { status: "bad"; reason: string; token: number };

const cache = new Map<string, CachedBallotVerify>();

export function ballotVerifyCacheKey(electionAddr: string, pseudonym: string): string {
  return `${electionAddr.toLowerCase()}:${pseudonym.toLowerCase()}`;
}

export function getCachedBallotVerify(
  electionAddr: string,
  pseudonym: string,
): CachedBallotVerify | undefined {
  return cache.get(ballotVerifyCacheKey(electionAddr, pseudonym));
}

export function setCachedBallotVerify(
  electionAddr: string,
  pseudonym: string,
  result: CachedBallotVerify,
): void {
  cache.set(ballotVerifyCacheKey(electionAddr, pseudonym), result);
}

export function cachedVerifyToUiState(cached: CachedBallotVerify, token = 0): UiVerifyState {
  if (cached.status === "ok") return { status: "ok", token };
  return { status: "bad", reason: cached.reason, token };
}

export function applyCachedVerifyForBallots(
  electionAddr: string,
  ballots: { pseudonym: string }[],
  token = 0,
): Record<string, UiVerifyState> {
  const out: Record<string, UiVerifyState> = {};
  for (const b of ballots) {
    const cached = getCachedBallotVerify(electionAddr, b.pseudonym);
    if (cached) out[b.pseudonym] = cachedVerifyToUiState(cached, token);
  }
  return out;
}
