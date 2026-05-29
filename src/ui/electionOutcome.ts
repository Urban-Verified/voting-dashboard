export type ElectionOutcome = {
  maxVotes: bigint;
  leaders: number[];
  totalVotes: bigint;
  isTie: boolean;
};

export function computeElectionOutcome(tally: readonly bigint[]): ElectionOutcome {
  const totalVotes = tally.reduce((s, c) => s + c, 0n);
  if (tally.length === 0) {
    return { maxVotes: 0n, leaders: [], totalVotes: 0n, isTie: false };
  }

  let maxVotes = 0n;
  for (const c of tally) {
    if (c > maxVotes) maxVotes = c;
  }

  const leaders =
    maxVotes > 0n
      ? tally.map((c, i) => (c === maxVotes ? i : -1)).filter((i) => i >= 0)
      : [];

  return {
    maxVotes,
    leaders,
    totalVotes,
    isTie: leaders.length > 1,
  };
}

function formatCandidateList(indices: number[], label: (i: number) => string): string {
  const parts = indices.map(label);
  if (parts.length <= 1) return parts[0] ?? "";
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
}

/** Overview header — lowercase “candidate”. */
export function formatOutcomeOverviewTitle(outcome: ElectionOutcome): string {
  const votes = outcome.maxVotes.toString();
  if (outcome.leaders.length === 0 || outcome.maxVotes === 0n) {
    return "No votes recorded";
  }
  if (!outcome.isTie) {
    return `Winner: candidate ${outcome.leaders[0]} · ${votes} votes`;
  }
  const names = formatCandidateList(outcome.leaders, (i) => `candidate ${i}`);
  return `Tied between ${names} · ${votes} votes each`;
}

/** Stage list RESULT row — capitalized “Candidate”. */
export function formatOutcomeStageTitle(outcome: ElectionOutcome): string {
  const votes = outcome.maxVotes.toString();
  if (outcome.leaders.length === 0 || outcome.maxVotes === 0n) {
    return "No votes recorded";
  }
  if (!outcome.isTie) {
    return `Winner: Candidate ${outcome.leaders[0]} · ${votes} votes`;
  }
  const names = formatCandidateList(outcome.leaders, (i) => `Candidate ${i}`);
  return `Tied: ${names} · ${votes} votes each`;
}
