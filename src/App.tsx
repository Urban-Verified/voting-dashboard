import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  fetchAggregate,
  fetchBallotsPage,
  fetchBallotTxHash,
  fetchDecryptionShares,
  fetchElectionElectionId,
  fetchElectionOverview,
  fetchElectionsFromRegistry,
  fetchResult,
  makeProvider,
} from "./eth/client";
import type {
  Ballot,
  DecryptionShare,
  DkgResultView,
  ElectionConfigView,
  ElectionResult,
  EncryptedTally,
} from "./eth/types";
import { cancelBallotVerificationWork, verifyBallotMvp, type BallotVerifyResult } from "./crypto/verifyBallot";
import { verifyDecryptShareDleq } from "./crypto/verifyDecryptShare";
import { hexToBytes } from "./crypto/utils";
import { CopyTextButton, Hex, trimMiddle } from "./ui/Hex";
import onlineWahlenLogo from "./assets/logo.svg";
import { formatUnixUtc } from "./ui/formatUnixUtc";
import { ResultPie2D } from "./ui/ResultPie2D";
import {
  computeElectionOutcome,
  formatOutcomeOverviewTitle,
  formatOutcomeStageTitle,
} from "./ui/electionOutcome";
import { BallotDetail } from "./ui/BallotDetail";
import { VerifyBallotPanel } from "./ui/VerifyBallotPanel";
import { VerifyAggregatePanel } from "./ui/VerifyAggregatePanel";
import { VerifySharesPanel } from "./ui/VerifySharesPanel";
import { VerifyResultPanel } from "./ui/VerifyResultPanel";
import { Term } from "./ui/Term";
import { StageLifecycleBadge } from "./ui/StageLifecycleBadge";
import { StageLockedPanel, type WaitingOnStage } from "./ui/StageLockedPanel";
import { LanguageToggle } from "./ui/LanguageToggle";
import { AddToClaudeView } from "./ui/AddToClaudeView";
import { ComplexityToggle } from "./ui/ComplexityToggle";
import { useComplexity } from "./ui/ComplexityContext";
import { Trans, useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import {
  applyCachedVerifyForBallots,
  ballotVerifyCacheKey,
  getCachedBallotVerify,
  setCachedBallotVerify,
  cachedVerifyToUiState,
} from "./ui/ballotVerifyCache";
import {
  getStageDone,
  getStageLifecycle,
  getWaitingOnStageNums,
  isStageVerificationAvailable,
  type StageStatusContext,
} from "./ui/stageLifecycle";
import { ensureCurvesReady } from "./crypto/curves";

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

type VerifyState =
  | { status: "idle" }
  | { status: "verifying"; token: number }
  | { status: "ok"; token: number }
  | { status: "bad"; reason: string; token: number };

type Tab = "overview" | "dkg" | "ballots" | "aggregate" | "shares" | "result";

const STAGE_ITEMS = [
  {
    num: 1 as const,
    tab: "dkg" as const,
    title: "Encryption Keys Set Up",
    subLabel: "Distributed Key Generation (DKG)",
    desc: "An independent committee of guardians (keypers) jointly generates the election's encryption key. No single party ever holds the key. Only a threshold of them, acting together, can decrypt anything.",
    easyDesc: "A group of independent guardians set up a special lock for this election. No single guardian holds the full key — they only work together.",
  },
  {
    num: 2 as const,
    tab: "ballots" as const,
    title: "Voters Cast Encrypted Ballots",
    subLabel: "Encrypted Ballot Submission",
    desc: "Each voter encrypts their choices on their own device. The ciphertext goes to the registry together with proofs that the voter is eligible and stayed within budget. Their actual choices are never revealed.",
    easyDesc: "Each voter sends their choice in a sealed envelope that nobody can open. Only the final totals are ever shown — not individual votes.",
  },
  {
    num: 3 as const,
    tab: "aggregate" as const,
    title: "Encrypted Vote Counting",
    subLabel: "Homomorphic Aggregation",
    desc: "All encrypted ballots are added together without ever decrypting any of them. The combined ciphertext per candidate is still fully encrypted, so nothing about individual votes is revealed.",
    easyDesc: "All the sealed votes are added up together without anyone opening a single one. The totals appear while every vote stays sealed.",
  },
  {
    num: 4 as const,
    tab: "shares" as const,
    title: "Threshold Decryption",
    subLabel: "Keyper Decryption Shares (DLEQ-proven)",
    desc: "A threshold of keypers each contribute one piece of the decryption, with a cryptographic proof that their piece is correct. Only together do these pieces reveal the count. No keyper ever sees the votes alone.",
    easyDesc: "Each guardian contributes a small piece to unlock the final count. No single guardian can see the votes alone.",
  },
  {
    num: 5 as const,
    tab: "result" as const,
    title: "Final Tally Published",
    subLabel: "Decrypted Result",
    desc: "Once enough keyper shares are combined, the encrypted aggregate decrypts to plain vote counts per candidate, and the winner is determined.",
    easyDesc: "When enough guardians work together, the final vote counts are revealed and the winner is announced.",
  },
] as const;

type OverviewDisplay = {
  leftLabel: "CURRENTLY" | "ELECTION FINALIZED";
  showCurrentlyDot: boolean;
  mainTitle: string;
  mainSub?: string;
  stageHeading?: string;
  stageDesc?: string;
  footerDesc?: string;
  rightLabel: "WHAT COMES NEXT" | "WHAT YOU CAN DO NOW";
  rightDesc: string;
};

function daysUntilUnix(unixSec: bigint): number {
  const diff = Number(unixSec) - Date.now() / 1000;
  return Math.max(0, Math.ceil(diff / 86_400));
}

function daysLabel(t: TFunction, n: number): string {
  return n === 1 ? t("1 day") : t("{{n}} days", { n });
}

function stageProgressLabel(t: TFunction, stageNum: number, inProgress: boolean): string {
  return inProgress
    ? t("Stage {{n}} of 5 in progress", { n: stageNum })
    : t("Stage {{n}} of 5 up next", { n: stageNum });
}

function computeOverviewDisplay(params: {
  overview: {
    config: ElectionConfigView;
    phase: number;
    isDKGFinalized: boolean;
    isResultFinalized: boolean;
  };
  result: ElectionResult | null;
  aggregate: EncryptedTally | null;
  shares: DecryptionShare[] | null;
  ballotTotal: bigint;
  t: TFunction;
  isEasy: boolean;
}): OverviewDisplay {
  const { overview, result, aggregate, shares, ballotTotal, t, isEasy } = params;
  const thresholdT = Number(overview.config.thresholdT);
  const thresholdN = Number(overview.config.thresholdN);
  const sharesCount = shares?.length ?? 0;

  if (overview.isResultFinalized && result) {
    const outcome = computeElectionOutcome(result.tally);
    return {
      leftLabel: "ELECTION FINALIZED",
      showCurrentlyDot: false,
      mainTitle: formatOutcomeOverviewTitle(outcome, t),
      mainSub: t("{{n}} total votes counted", { n: outcome.totalVotes.toString() }),
      footerDesc: t("Every stage has completed. The result is published and fully verifiable."),
      rightLabel: "WHAT YOU CAN DO NOW",
      rightDesc: t(
        "Open any stage on the left to inspect what happened, then use the right column to re-run that step yourself.",
      ),
    };
  }

  const stageDesc = (idx: number) => {
    const item = STAGE_ITEMS[Math.min(idx, STAGE_ITEMS.length) - 1]!;
    return t(isEasy ? item.easyDesc : item.desc);
  };

  if (!overview.isDKGFinalized) {
    return {
      leftLabel: "CURRENTLY",
      showCurrentlyDot: true,
      mainTitle: stageProgressLabel(t, 1, false),
      stageDesc: stageDesc(1),
      rightLabel: "WHAT COMES NEXT",
      rightDesc: stageDesc(2),
    };
  }

  if (overview.phase < 3) {
    const days = daysUntilUnix(overview.config.votingStart);
    return {
      leftLabel: "CURRENTLY",
      showCurrentlyDot: true,
      mainTitle: t("Voting hasn't opened yet"),
      mainSub: days === 0
        ? t("Opens today")
        : t("Opens in {{label}}", { label: daysLabel(t, days) }),
      stageHeading: stageProgressLabel(t, 2, false),
      stageDesc: stageDesc(2),
      rightLabel: "WHAT COMES NEXT",
      rightDesc: stageDesc(3),
    };
  }

  if (overview.phase === 3) {
    const daysLeft = daysUntilUnix(overview.config.votingEnd);
    const closingSub = daysLeft === 0
      ? t("Voting closing now")
      : t("Closes in {{label}}", { label: daysLabel(t, daysLeft) });
    return {
      leftLabel: "CURRENTLY",
      showCurrentlyDot: true,
      mainTitle: t("{{n}} ballots cast so far", { n: ballotTotal.toString() }),
      mainSub: closingSub,
      stageHeading: stageProgressLabel(t, 2, true),
      stageDesc: stageDesc(2),
      rightLabel: "WHAT COMES NEXT",
      rightDesc: stageDesc(3),
    };
  }

  // Post-voting (phase 4): tally / decryption / result publication
  if (!aggregate) {
    return {
      leftLabel: "CURRENTLY",
      showCurrentlyDot: true,
      mainTitle: t("Voting has closed"),
      mainSub: t("{{n}} ballots accepted", { n: ballotTotal.toString() }),
      stageHeading: stageProgressLabel(t, 3, true),
      stageDesc: stageDesc(3),
      rightLabel: "WHAT COMES NEXT",
      rightDesc: stageDesc(4),
    };
  }

  if (sharesCount < thresholdT) {
    return {
      leftLabel: "CURRENTLY",
      showCurrentlyDot: true,
      mainTitle: t("{{count}} of {{total}} keyper shares received", {
        count: sharesCount,
        total: thresholdN,
      }),
      mainSub: t("Need {{n}} valid shares to decrypt", { n: thresholdT }),
      stageHeading: stageProgressLabel(t, 4, true),
      stageDesc: stageDesc(4),
      rightLabel: "WHAT COMES NEXT",
      rightDesc: stageDesc(5),
    };
  }

  return {
    leftLabel: "CURRENTLY",
    showCurrentlyDot: true,
    mainTitle: t("Final tally being published"),
    mainSub: t("Threshold met · decrypting vote counts"),
    stageHeading: stageProgressLabel(t, 5, true),
    stageDesc: stageDesc(5),
    rightLabel: "WHAT COMES NEXT",
    rightDesc: stageDesc(5),
  };
}

export default function App() {
  const { t } = useTranslation();
  const { isEasy } = useComplexity();
  const rpcUrl = import.meta.env.VITE_RPC_URL;
  const registryAddress = import.meta.env.VITE_ELECTION_REGISTRY;
  const [electionOptions, setElectionOptions] = useState<{ address: string; electionId: bigint | null }[]>([]);
  const [selectedElection, setSelectedElection] = useState<string>("");
  const [loadingElections, setLoadingElections] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const provider = useMemo(() => (rpcUrl ? makeProvider(rpcUrl) : null), [rpcUrl]);

  const [overview, setOverview] = useState<{
    config: ElectionConfigView;
    dkg: DkgResultView;
    phase: number;
    isDKGFinalized: boolean;
    isResultFinalized: boolean;
  } | null>(null);
  const [aggregate, setAggregate] = useState<EncryptedTally | null>(null);
  const [shares, setShares] = useState<DecryptionShare[] | null>(null);
  const [result, setResult] = useState<ElectionResult | null>(null);

  const [tab, setTab] = useState<Tab>("overview");
  const [showAiSkill, setShowAiSkill] = useState(false);
  const [showTech, setShowTech] = useState(false);

  const [page, setPage] = useState(0);
  const pageSize = 10;
  const [ballotsTotal, setBallotsTotal] = useState<bigint>(0n);
  const [ballots, setBallots] = useState<Ballot[]>([]);
  const [ballotsLoading, setBallotsLoading] = useState(false);
  const [gotoPageInput, setGotoPageInput] = useState<string>("");
  const [ballotSearch, setBallotSearch] = useState("");
  const [allBallots, setAllBallots] = useState<Ballot[] | null>(null);
  const [allBallotsLoading, setAllBallotsLoading] = useState(false);
  const [exportingFixture, setExportingFixture] = useState(false);

  const [verifyByPseudonym, setVerifyByPseudonym] = useState<Record<string, VerifyState>>({});

  const [detailView, setDetailView] = useState<{ pseudonym: string; globalIndex: number } | null>(null);
  const [showVerifyPanel, setShowVerifyPanel] = useState(false);
  const [ballotTxHash, setBallotTxHash] = useState<string | null | undefined>(undefined);

  const [decVerifyByKey, setDecVerifyByKey] = useState<Record<string, VerifyState>>({});
  const [overviewBallotTotal, setOverviewBallotTotal] = useState<bigint>(0n);
  const [showVerifyGuide, setShowVerifyGuide] = useState(false);
  const [downloadingAggFixture, setDownloadingAggFixture] = useState(false);

  const verifyQueueRef = useRef<Promise<void>>(Promise.resolve());
  const verifySeqRef = useRef(0);
  const electionLoadGenRef = useRef(0);
  const ballotsLoadGenRef = useRef(0);
  const overviewAddrRef = useRef<string>("");
  const ballotsAddrRef = useRef<string>("");
  const autoVerifyStartedRef = useRef<Set<string>>(new Set());
  const tabRef = useRef<Tab>("overview");
  const ballotVerifySessionRef = useRef(0);
  const ballotAutoVerifyTimerRef = useRef<number | null>(null);

  const overviewRef = useRef<{
    config: ElectionConfigView;
    dkg: DkgResultView;
    phase: number;
    isDKGFinalized: boolean;
    isResultFinalized: boolean;
  } | null>(null);
  const aggregateRef = useRef<EncryptedTally | null>(null);
  const sharesRef = useRef<DecryptionShare[] | null>(null);

  useLayoutEffect(() => { overviewRef.current = overview; }, [overview]);
  useLayoutEffect(() => { aggregateRef.current = aggregate; }, [aggregate]);
  useLayoutEffect(() => { sharesRef.current = shares; }, [shares]);
  useLayoutEffect(() => { tabRef.current = tab; }, [tab]);

  function cancelBallotAutoVerify() {
    ballotVerifySessionRef.current += 1;
    if (ballotAutoVerifyTimerRef.current !== null) {
      window.clearTimeout(ballotAutoVerifyTimerRef.current);
      ballotAutoVerifyTimerRef.current = null;
    }
    verifyQueueRef.current = Promise.resolve();
    cancelBallotVerificationWork();
    autoVerifyStartedRef.current.clear();
    // Drop stale "verifying" entries so they don't stay stuck as "Checking…"
    // after the session is cancelled (e.g. page change, election change).
    setVerifyByPseudonym((m) => {
      const next: Record<string, VerifyState> = {};
      for (const [k, v] of Object.entries(m)) {
        if (v.status !== "verifying") next[k] = v;
      }
      return next;
    });
  }

  function hydrateVerifyFromCache(electionAddr: string, pageBallots: Ballot[]) {
    const fromCache = applyCachedVerifyForBallots(electionAddr, pageBallots);
    if (Object.keys(fromCache).length === 0) return;
    setVerifyByPseudonym((m) => {
      const next = { ...m };
      for (const [k, v] of Object.entries(fromCache)) {
        const cur = next[k];
        if (!cur || cur.status === "idle") next[k] = v;
      }
      return next;
    });
  }

  function shouldShowBallotChecking(electionAddr: string | undefined, pseudonym: string): boolean {
    if (!electionAddr || tab !== "ballots" || ballotsLoading) return false;
    if (overviewAddrRef.current !== electionAddr || ballotsAddrRef.current !== electionAddr) return false;
    if (getCachedBallotVerify(electionAddr, pseudonym)) return false;
    return true;
  }

  function resolveBallotVerifyState(electionAddr: string | undefined, pseudonym: string): VerifyState {
    const live = verifyByPseudonym[pseudonym];
    if (live?.status === "verifying" || live?.status === "ok" || live?.status === "bad") return live;
    if (electionAddr) {
      const cached = getCachedBallotVerify(electionAddr, pseudonym);
      if (cached) return cachedVerifyToUiState(cached);
    }
    if (shouldShowBallotChecking(electionAddr, pseudonym)) {
      return { status: "verifying", token: 0 };
    }
    return { status: "idle" };
  }

  function enqueueVerify<T>(fn: () => Promise<T>): Promise<T> {
    const run = verifyQueueRef.current.then(fn, fn);
    verifyQueueRef.current = run.then(() => undefined, () => undefined);
    return run;
  }

  function closeVerifyPanel() {
    setShowVerifyPanel(false);
    setShowVerifyGuide(false);
  }

  // ── Election loading ──────────────────────────────────────────────────────

  async function loadElectionsAndMaybeRefreshCurrent() {
    setLoadError(null);
    setLoadingElections(true);
    try {
      if (!provider) throw new Error("Missing VITE_RPC_URL");
      if (!registryAddress) throw new Error("Missing VITE_ELECTION_REGISTRY");
      const addrList = await fetchElectionsFromRegistry(provider, registryAddress);
      const enriched = await Promise.all(
        addrList.map(async (address) => {
          try {
            const electionId = await fetchElectionElectionId(provider, address);
            return { address, electionId };
          } catch {
            return { address, electionId: null };
          }
        }),
      );
      setElectionOptions(enriched);
      const nextElection =
        selectedElection && enriched.some((e) => e.address === selectedElection)
          ? selectedElection
          : enriched.length
            ? enriched[enriched.length - 1]!.address
            : "";

      const electionChanged = nextElection !== selectedElection;
      setSelectedElection(nextElection);

      cancelBallotAutoVerify();
      setVerifyByPseudonym({});
      setDecVerifyByKey({});
      setDetailView(null);
      setShowVerifyPanel(false);

      if (!nextElection) {
        setOverview(null);
        setAggregate(null);
        setShares(null);
        setResult(null);
        setBallots([]);
        setBallotsTotal(0n);
        setPage(0);
        setAllBallots(null);
        setBallotSearch("");
        return;
      }

      await loadElectionDetails(nextElection);

      if (tab === "ballots") {
        const nextPage = electionChanged ? 0 : page;
        if (electionChanged) {
          setPage(0);
          setBallots([]);
          setBallotsTotal(0n);
          setAllBallots(null);
          setBallotSearch("");
        }
        await loadBallotsPageFor(nextElection, nextPage);
      } else if (electionChanged) {
        setTab("overview");
        setPage(0);
        setBallots([]);
        setBallotsTotal(0n);
        setAllBallots(null);
        setBallotSearch("");
      }
    } catch (e: unknown) {
      setLoadError(errMsg(e));
    } finally {
      setLoadingElections(false);
    }
  }

  async function loadElectionDetails(electionAddr: string) {
    const gen = ++electionLoadGenRef.current;
    setLoadError(null);
    try {
      if (!provider) throw new Error("Missing VITE_RPC_URL");
      const [ov, agg, decShares, res, ballotInfo] = await Promise.all([
        fetchElectionOverview(provider, electionAddr),
        fetchAggregate(provider, electionAddr),
        fetchDecryptionShares(provider, electionAddr),
        fetchResult(provider, electionAddr),
        fetchBallotsPage(provider, electionAddr, 0, 1).catch(() => ({ total: 0n, ballots: [] })),
      ]);
      if (gen !== electionLoadGenRef.current) return;
      setOverview(ov);
      overviewAddrRef.current = electionAddr;
      setAggregate(agg);
      setShares(decShares);
      setResult(res);
      setOverviewBallotTotal(ballotInfo.total);
    } catch (e: unknown) {
      if (gen === electionLoadGenRef.current) setLoadError(errMsg(e));
    }
  }

  async function loadBallotsPageFor(addr: string, pageIndex: number) {
    const gen = ++ballotsLoadGenRef.current;
    setBallotsLoading(true);
    setLoadError(null);
    try {
      if (!provider) throw new Error("Missing VITE_RPC_URL");
      const start = pageIndex * pageSize;
      const { total, ballots: pageBallots } = await fetchBallotsPage(provider, addr, start, pageSize);
      if (gen !== ballotsLoadGenRef.current) return;
      setBallotsTotal(total);
      setBallots(pageBallots);
      ballotsAddrRef.current = addr;
      setDetailView(null);
      setShowVerifyPanel(false);
      hydrateVerifyFromCache(addr, pageBallots);
    } catch (e: unknown) {
      if (gen === ballotsLoadGenRef.current) setLoadError(errMsg(e));
    } finally {
      if (gen === ballotsLoadGenRef.current) setBallotsLoading(false);
    }
  }

  async function loadAllBallots(addr: string, total: bigint) {
    if (!provider || allBallotsLoading) return;
    setAllBallotsLoading(true);
    try {
      const BATCH = 100;
      const count = Number(total);
      if (count === 0) { setAllBallots([]); return; }
      const batches = Math.ceil(count / BATCH);
      const results = await Promise.all(
        Array.from({ length: batches }, (_, i) =>
          fetchBallotsPage(provider, addr, i * BATCH, BATCH)
        )
      );
      setAllBallots(results.flatMap(r => r.ballots));
    } catch {
      setAllBallots([]);
    } finally {
      setAllBallotsLoading(false);
    }
  }

  async function exportElectionBallotsFixture(): Promise<void> {
    const ov = overviewRef.current;
    if (!provider) throw new Error("Missing VITE_RPC_URL");
    if (!selectedElection) throw new Error("No election selected");
    if (!ov) throw new Error("Election overview not loaded yet");
    setExportingFixture(true);
    setLoadError(null);
    try {
      const all: Ballot[] = [];
      const chunkSize = 200;
      let total: bigint | null = null;
      for (let start = 0; ; start += chunkSize) {
        const { total: t, ballots: pageBallots } = await fetchBallotsPage(provider, selectedElection, start, chunkSize);
        if (total === null) total = t;
        all.push(...pageBallots);
        if (total !== null && BigInt(all.length) >= total) break;
        if (pageBallots.length === 0) break;
      }
      const fixture = {
        mpkElectionG2: ov.dkg.pkElection,
        pkWrG1: ov.config.pkWR,
        electionId: ov.config.electionId.toString(),
        numCandidates: ov.config.numCandidates,
        budget: ov.config.budget,
        ballots: all,
        electionAddress: selectedElection,
        exportedAt: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(fixture, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ballots.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      setLoadError(errMsg(e));
    } finally {
      setExportingFixture(false);
    }
  }

  // ── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!selectedElection) return;
    cancelBallotAutoVerify();
    setVerifyByPseudonym({});
    setDecVerifyByKey({});
    verifySeqRef.current += 1;
    setBallots([]);
    setBallotsTotal(0n);
    setDetailView(null);
    setShowVerifyPanel(false);
  }, [selectedElection]);

  useEffect(() => {
    if (!selectedElection) return;
    void loadElectionDetails(selectedElection);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedElection]);

  useEffect(() => {
    if (!selectedElection) return;
    if (tab !== "ballots") return;
    void loadBallotsPageFor(selectedElection, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedElection, tab, page]);

  useEffect(() => {
    if (tab !== "ballots" || !selectedElection || ballots.length === 0) return;
    if (ballotsAddrRef.current !== selectedElection) return;
    hydrateVerifyFromCache(selectedElection, ballots);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, selectedElection, ballots]);

  const filteredBallots = useMemo(() => {
    if (!ballotSearch) return ballots;
    if (!allBallots) return [];
    return allBallots.filter(b => b.pseudonym.startsWith(ballotSearch));
  }, [ballots, ballotSearch, allBallots]);

  const pageVerifyStats = useMemo(() => {
    let valid = 0, invalid = 0, checking = 0;
    for (const b of filteredBallots) {
      const v = resolveBallotVerifyState(selectedElection || undefined, b.pseudonym);
      if (v.status === "idle") continue;
      if (v.status === "ok") valid++;
      else if (v.status === "bad") invalid++;
      else if (v.status === "verifying") checking++;
    }
    return { valid, invalid, checking };
  }, [filteredBallots, verifyByPseudonym, selectedElection, tab, ballotsLoading]);

  useEffect(() => {
    void ensureCurvesReady();
  }, []);

  useEffect(() => {
    if (!rpcUrl || !registryAddress) return;
    void loadElectionsAndMaybeRefreshCurrent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rpcUrl, registryAddress]);

  useEffect(() => {
    if (tab !== "ballots") return;
    if (ballotsLoading || !overview || ballots.length === 0) return;
    if (overviewAddrRef.current !== selectedElection || ballotsAddrRef.current !== selectedElection) {
      return;
    }

    const session = ballotVerifySessionRef.current;
    const electionAddr = selectedElection;

    if (ballotAutoVerifyTimerRef.current !== null) {
      window.clearTimeout(ballotAutoVerifyTimerRef.current);
    }
    ballotAutoVerifyTimerRef.current = window.setTimeout(() => {
      ballotAutoVerifyTimerRef.current = null;
      void runBallotAutoVerifyPage(session, electionAddr);
    }, 250);

    return () => {
      if (ballotAutoVerifyTimerRef.current !== null) {
        window.clearTimeout(ballotAutoVerifyTimerRef.current);
        ballotAutoVerifyTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ballots, tab, ballotsLoading, overview, selectedElection]);

  useEffect(() => {
    if (tab === "ballots") return;
    cancelBallotAutoVerify();
  }, [tab]);

  // When search is active, verify the filtered results (may come from other pages).
  useEffect(() => {
    if (!ballotSearch || filteredBallots.length === 0 || !overview || !selectedElection) return;
    if (ballotsAddrRef.current !== selectedElection) return;

    // Restore cached states first so already-verified ballots show immediately.
    hydrateVerifyFromCache(selectedElection, filteredBallots);

    const session = ballotVerifySessionRef.current;
    const electionAddr = selectedElection;
    const snapshot = filteredBallots.slice(); // stable ref for async closure

    if (ballotAutoVerifyTimerRef.current !== null) {
      window.clearTimeout(ballotAutoVerifyTimerRef.current);
    }
    ballotAutoVerifyTimerRef.current = window.setTimeout(() => {
      ballotAutoVerifyTimerRef.current = null;
      void runBallotAutoVerifyPage(session, electionAddr, snapshot);
    }, 250);

    return () => {
      if (ballotAutoVerifyTimerRef.current !== null) {
        window.clearTimeout(ballotAutoVerifyTimerRef.current);
        ballotAutoVerifyTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredBallots, ballotSearch, selectedElection, overview]);

  // ── Ballot verification ───────────────────────────────────────────────────

  function isBallotVerifyActive(session: number, electionAddr: string): boolean {
    return (
      tabRef.current === "ballots" &&
      session === ballotVerifySessionRef.current &&
      overviewAddrRef.current === electionAddr &&
      ballotsAddrRef.current === electionAddr
    );
  }

  async function runBallotAutoVerifyPage(session: number, electionAddr: string, ballotsToVerify: Ballot[] = ballots) {
    if (!isBallotVerifyActive(session, electionAddr) || !overviewRef.current) return;

    const pending = ballotsToVerify.filter((b) => {
      if (getCachedBallotVerify(electionAddr, b.pseudonym)) return false;
      const startedKey = ballotVerifyCacheKey(electionAddr, b.pseudonym);
      if (autoVerifyStartedRef.current.has(startedKey)) return false;
      return true;
    });
    if (pending.length === 0) return;

    for (const b of pending) {
      autoVerifyStartedRef.current.add(ballotVerifyCacheKey(electionAddr, b.pseudonym));
    }

    const batchToken = ++verifySeqRef.current;
    setVerifyByPseudonym((m) => {
      const next = { ...m };
      for (const b of pending) {
        next[b.pseudonym] = { status: "verifying", token: batchToken };
      }
      return next;
    });

    for (const ballot of pending) {
      if (!isBallotVerifyActive(session, electionAddr)) break;
      await verifyBallotAt(ballot, electionAddr, session, batchToken);
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, 0);
      });
    }
  }

  async function verifyBallotAt(
    ballot: Ballot,
    electionAddr: string,
    session: number,
    presetToken?: number,
  ) {
    if (!isBallotVerifyActive(session, electionAddr) || !overviewRef.current) return;
    const token = presetToken ?? ++verifySeqRef.current;
    const k = ballot.pseudonym;
    const startedKey = ballotVerifyCacheKey(electionAddr, k);
    if (presetToken === undefined) {
      setVerifyByPseudonym((m) => ({ ...m, [k]: { status: "verifying", token } }));
    }
    try {
      const res = await enqueueVerify<BallotVerifyResult>(() => {
        if (!isBallotVerifyActive(session, electionAddr)) {
          return Promise.resolve({ ok: false as const, reason: "__cancelled__" });
        }
        const ovSnap = overviewRef.current;
        if (!ovSnap) return Promise.resolve({ ok: false as const, reason: "Election overview not loaded yet" });
        if (overviewAddrRef.current !== electionAddr || ballotsAddrRef.current !== electionAddr) {
          return Promise.resolve({ ok: false as const, reason: "Election state still loading. Try again in a moment." });
        }
        return verifyBallotMvp({
          mpkElectionG2: hexToBytes(ovSnap.dkg.pkElection),
          pkWrG1: hexToBytes(ovSnap.config.pkWR),
          electionId: ovSnap.config.electionId,
          numCandidates: ovSnap.config.numCandidates,
          budget: ovSnap.config.budget,
          ballot,
        });
      });
      if (!isBallotVerifyActive(session, electionAddr)) {
        autoVerifyStartedRef.current.delete(startedKey);
        setVerifyByPseudonym((m) => {
          const cur = m[k];
          if (!cur || cur.status !== "verifying" || cur.token !== token) return m;
          const next = { ...m };
          delete next[k];
          return next;
        });
        return;
      }
      if (!res.ok && "reason" in res && res.reason === "__cancelled__") {
        autoVerifyStartedRef.current.delete(startedKey);
        setVerifyByPseudonym((m) => {
          const cur = m[k];
          if (!cur || cur.status !== "verifying" || cur.token !== token) return m;
          const next = { ...m };
          delete next[k];
          return next;
        });
        return;
      }
      if (res.ok) {
        setCachedBallotVerify(electionAddr, k, { status: "ok" });
        setVerifyByPseudonym((m) => {
          const cur = m[k];
          if (!cur || cur.status !== "verifying" || cur.token !== token) return m;
          return { ...m, [k]: { status: "ok", token } };
        });
      } else {
        const reason = (res as Extract<BallotVerifyResult, { ok: false }>).reason;
        if (reason === "Election state still loading. Try again in a moment.") {
          autoVerifyStartedRef.current.delete(startedKey);
          setVerifyByPseudonym((m) => {
            const cur = m[k];
            if (!cur || cur.status !== "verifying" || cur.token !== token) return m;
            const next = { ...m };
            delete next[k];
            return next;
          });
          return;
        }
        setCachedBallotVerify(electionAddr, k, { status: "bad", reason });
        setVerifyByPseudonym((m) => {
          const cur = m[k];
          if (!cur || cur.status !== "verifying" || cur.token !== token) return m;
          return { ...m, [k]: { status: "bad", reason, token } };
        });
      }
    } catch (e: unknown) {
      if (!isBallotVerifyActive(session, electionAddr)) {
        autoVerifyStartedRef.current.delete(startedKey);
        return;
      }
      const reason = errMsg(e);
      setCachedBallotVerify(electionAddr, k, { status: "bad", reason });
      setVerifyByPseudonym((m) => {
        const cur = m[k];
        if (!cur || cur.status !== "verifying" || cur.token !== token) return m;
        return { ...m, [k]: { status: "bad", reason, token } };
      });
    }
  }

  // ── Decryption share verification ─────────────────────────────────────────

  async function verifyDecryptShareAt(rowIdx: number, j: number) {
    const ov0 = overviewRef.current;
    const agg0 = aggregateRef.current;
    const sh0 = sharesRef.current;
    if (!ov0 || !agg0 || !sh0 || !sh0[rowIdx]) return;
    const key = `${rowIdx}-${j}`;
    const token = ++verifySeqRef.current;
    setDecVerifyByKey((m) => ({ ...m, [key]: { status: "verifying", token } }));
    try {
      const res = await enqueueVerify(() => {
        const ovSnap = overviewRef.current;
        const aggSnap = aggregateRef.current;
        const sharesSnap = sharesRef.current;
        if (!ovSnap || !aggSnap || !sharesSnap) {
          return Promise.resolve({ ok: false as const, reason: "Election / aggregate / shares not loaded yet" });
        }
        const shareSnap = sharesSnap[rowIdx];
        if (!shareSnap) return Promise.resolve({ ok: false as const, reason: "Decryption share row not found" });
        const p = shareSnap.proofs[j];
        const committeePk = ovSnap.dkg.committeePKs[shareSnap.keyperIndex];
        const aggJ = aggSnap.aggregates[j];
        const shareHex = shareSnap.shares[j];
        if (!p || !aggJ || !shareHex) {
          return Promise.resolve({ ok: false as const, reason: "Missing aggregate ciphertext, share, or DLEQ proof for this candidate" });
        }
        return verifyDecryptShareDleq({
          electionId: ovSnap.config.electionId,
          candidateIndex: j,
          aggregateC1: aggJ.c1,
          aggregateC2: aggJ.c2,
          shareHex,
          proof: { e: p.e, z: p.z },
          committeePkHex: committeePk ?? "",
          memberIndex: shareSnap.keyperIndex,
        });
      });
      if (res.ok === false) {
        const { reason } = res;
        setDecVerifyByKey((m) => {
          const cur = m[key];
          if (!cur || cur.status !== "verifying" || cur.token !== token) return m;
          return { ...m, [key]: { status: "bad", reason, token } };
        });
      } else {
        setDecVerifyByKey((m) => {
          const cur = m[key];
          if (!cur || cur.status !== "verifying" || cur.token !== token) return m;
          return { ...m, [key]: { status: "ok", token } };
        });
      }
    } catch (e: unknown) {
      setDecVerifyByKey((m) => {
        const cur = m[key];
        if (!cur || cur.status !== "verifying" || cur.token !== token) return m;
        return { ...m, [key]: { status: "bad", reason: errMsg(e), token } };
      });
    }
  }

  // ── Pagination ─────────────────────────────────────────────────────────────

  const totalPages = Number((ballotsTotal + BigInt(pageSize) - 1n) / BigInt(pageSize));
  const safeTotalPages = Math.max(totalPages, 1);

  function clampPageIndex(pageNumber1Based: number): number {
    if (!Number.isFinite(pageNumber1Based)) return page;
    if (pageNumber1Based <= 0) return 0;
    if (pageNumber1Based > safeTotalPages) return safeTotalPages - 1;
    return pageNumber1Based - 1;
  }

  function applyGotoPage(): void {
    const n = Number.parseInt(gotoPageInput, 10);
    if (Number.isNaN(n)) return;
    setPage(clampPageIndex(n));
  }

  const detailBallot = detailView ? ballots.find((b) => b.pseudonym === detailView.pseudonym) ?? null : null;
  const detailVerifyState: VerifyState = detailView
    ? resolveBallotVerifyState(selectedElection || undefined, detailView.pseudonym)
    : { status: "idle" };

  useEffect(() => {
    if (!detailView || !provider || !selectedElection) { setBallotTxHash(undefined); return; }
    let cancelled = false;
    setBallotTxHash(undefined); // undefined = in-flight
    void fetchBallotTxHash(provider, selectedElection, detailView.pseudonym as `0x${string}`)
      .then(hash => { if (!cancelled) setBallotTxHash(hash); })
      .catch(() => { if (!cancelled) setBallotTxHash(null); });
    return () => { cancelled = true; };
  }, [detailView?.pseudonym, selectedElection, provider]);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const currentStageNum = tab === "dkg" ? 1 : tab === "ballots" ? 2 : tab === "aggregate" ? 3 : tab === "shares" ? 4 : tab === "result" ? 5 : null;
  const isStageView = tab !== "overview";
  const isTriple =
    (showVerifyPanel && tab === "ballots" && !!detailBallot) ||
    (showVerifyGuide && (tab === "aggregate" || tab === "shares" || tab === "result"));

  const stageCtx = useMemo((): StageStatusContext | null => {
    if (!overview) return null;
    return {
      isDKGFinalized: overview.isDKGFinalized,
      phase: overview.phase,
      isResultFinalized: overview.isResultFinalized,
      thresholdT: Number(overview.config.thresholdT),
      aggregate,
      shares,
    };
  }, [overview, aggregate, shares]);

  function getStageStatus(stageNum: number): "done" | "pending" {
    if (!stageCtx) return "pending";
    return getStageDone(stageNum, stageCtx) ? "done" : "pending";
  }

  function stageLifecycle(stageNum: number) {
    if (!stageCtx) return "pending" as const;
    return getStageLifecycle(stageNum, stageCtx);
  }

  function buildWaitingOn(viewingStageNum: number): WaitingOnStage[] {
    if (!stageCtx) return [];
    return getWaitingOnStageNums(viewingStageNum, stageCtx).map((num) => {
      const item = STAGE_ITEMS[num - 1]!;
      return {
        num,
        title: item.title,
        subLabel: item.subLabel,
        lifecycle: getStageLifecycle(num, stageCtx),
      };
    });
  }

  const overviewDisplay = useMemo(() => {
    if (!overview) return null;
    return computeOverviewDisplay({
      overview,
      result,
      aggregate,
      shares,
      ballotTotal: overviewBallotTotal,
      t,
      isEasy,
    });
  }, [overview, result, aggregate, shares, overviewBallotTotal, t, isEasy]);

  useEffect(() => {
    if (!provider || !selectedElection || !overview || overview.phase !== 3) return;
    let cancelled = false;
    const refreshBallotTotal = async () => {
      try {
        const { total } = await fetchBallotsPage(provider, selectedElection, 0, 1);
        if (!cancelled) setOverviewBallotTotal(total);
      } catch {
        /* ignore background refresh errors */
      }
    };
    void refreshBallotTotal();
    const id = window.setInterval(() => void refreshBallotTotal(), 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [provider, selectedElection, overview?.phase]);

  const STAGE_TECH: Record<Tab, ReactNode> = {
    overview: "",
    dkg: (
      <Trans
        i18nKey="STAGE_TECH_DKG"
        components={[
          <Term id="t-of-n threshold" />,
          <Term id="DKG" />,
          <Term id="keyper" />,
          <Term id="BLS12-381" />,
        ]}
      >
        A <Term id="t-of-n threshold">t-of-n threshold</Term> <Term id="DKG">DKG</Term> produces a shared public key in G₂ whose private counterpart is split into n secret shares, one per <Term id="keyper">keyper</Term>. Any t of them together can decrypt; fewer cannot. Committee keys and ballots use <Term id="BLS12-381">BLS12-381</Term>.
      </Trans>
    ),
    ballots: (
      <Trans
        i18nKey="STAGE_TECH_BALLOTS"
        components={[
          <Term id="ElGamal" />,
          <Term id="ciphertext" />,
          <Term id="Schnorr signature" />,
          <Term id="Whitelist Registrar" />,
          <Term id="zero-knowledge proof" />,
          <Term id="budget" />,
          <Term id="BLS12-381" />,
        ]}
      >
        Ballots carry <Term id="ElGamal">ElGamal</Term> <Term id="ciphertext">ciphertexts</Term> per candidate, a G₁ <Term id="Schnorr signature">Schnorr signature</Term> over the ballot bytes, a G₁ <Term id="Whitelist Registrar">Whitelist Registrar</Term> attestation that the voter is on the registered list, and <Term id="zero-knowledge proof">ZK range proofs</Term> that each vote is within the election <Term id="budget">budget</Term>. All on <Term id="BLS12-381">BLS12-381</Term>.
      </Trans>
    ),
    aggregate: (
      <Trans
        i18nKey="STAGE_TECH_AGGREGATE"
        components={[
          <Term id="ciphertext" />,
          <Term id="BLS12-381" />,
        ]}
      >
        Component-wise addition of every accepted ballot <Term id="ciphertext">ciphertext</Term> on <Term id="BLS12-381">BLS12-381</Term> G₂ (each c1 and c2 is point-added separately). The aggregate is one (c1, c2) pair per candidate. No private key material is touched.
      </Trans>
    ),
    shares: (
      <Trans
        i18nKey="STAGE_TECH_SHARES"
        components={[
          <Term id="keyper" />,
          <Term id="DLEQ" />,
          <Term id="Lagrange interpolation" />,
        ]}
      >
        Each <Term id="keyper">keyper</Term> publishes a partial decryption σ_i = s_i · C₁ on the aggregate ciphertext per candidate, where s_i is their secret share. A non-interactive <Term id="DLEQ">DLEQ proof</Term> binds σ_i to their committee public key (G₂). Any t valid shares are <Term id="Lagrange interpolation">Lagrange-combined</Term> into the decryption factor without ever assembling a private key.
      </Trans>
    ),
    result: (
      <Trans
        i18nKey="STAGE_TECH_RESULT"
        components={[
          <Term id="Lagrange interpolation" />,
          <Term id="ciphertext" />,
          <Term id="baby-step / giant-step" />,
        ]}
      >
        The <Term id="Lagrange interpolation">Lagrange-combined</Term> decryption factor removes the encryption mask from each candidate&apos;s aggregate <Term id="ciphertext">ciphertext</Term> (G₂). A bounded <Term id="baby-step / giant-step">baby-step / giant-step</Term> in G₂ recovers the integer vote count per candidate.
      </Trans>
    ),
  };

  function navigateTo(t: Tab) {
    if (t !== "ballots" && tabRef.current === "ballots") {
      cancelBallotAutoVerify();
      setVerifyByPseudonym({});
    }
    if (t === "ballots") {
      setDetailView(null);
      setShowVerifyPanel(false);
    }
    setShowTech(false);
    setShowVerifyGuide(false);
    setTab(t);
  }

  async function downloadAggregateFixture() {
    if (!provider || !selectedElection || !overview || !aggregate) return;
    setDownloadingAggFixture(true);
    try {
      const total = Number(overviewBallotTotal);
      const PAGE = 50;
      const allBallots: Ballot[] = [];
      for (let offset = 0; offset < total; offset += PAGE) {
        const { ballots: page } = await fetchBallotsPage(provider, selectedElection, offset, PAGE);
        for (const b of page) allBallots.push(b);
      }
      const fixture = {
        electionId: overview.config.electionId.toString(),
        numCandidates: overview.config.numCandidates,
        budget: overview.config.budget,
        mpkElectionG2: overview.dkg.pkElection,
        pkWrG1: overview.config.pkWR,
        mode: "exact",
        variant: "A",
        aggregate: aggregate.aggregates.map((ct) => ({ c1: ct.c1, c2: ct.c2 })),
        ballots: allBallots,
        electionAddress: selectedElection,
        exportedAt: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(fixture, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "aggregate-fixture.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setDownloadingAggFixture(false);
    }
  }

  function renderVerifySection(stageNum: number) {
    if (isTriple || isEasy) return null;
    const available =
      stageCtx !== null &&
      isStageVerificationAvailable(stageNum, stageCtx, {
        hasAggregate: aggregate !== null,
        hasShares: shares !== null && shares.length > 0,
        hasResult: result !== null,
      });
    return (
      <div className="verifyYourselfSection">
        <div className="verifyYourselfLabel">{t("VERIFY YOURSELF")}</div>
        <p className="verifyYourselfDesc">
          {available
            ? t("Don't trust this panel · re-run the same cryptographic check yourself, against this stage's on-chain data, on your own machine.")
            : t("Once this stage completes, you'll be able to re-run its cryptographic check on your own machine · same code, same fixtures, no trust in the dashboard required.")}
        </p>
        <button
          type="button"
          className="verifyYourselfBtn"
          disabled={!available}
          onClick={() => available && setShowVerifyGuide((v) => !v)}
        >
          {available
            ? showVerifyGuide
              ? t("Hide verification guide ↑")
              : t("Open manual verification guide →")
            : t("Manual verification not available yet")}
        </button>
      </div>
    );
  }

  function renderStageLocked(stageNum: number) {
    if (!overview) return null;
    return (
      <StageLockedPanel
        stageNum={stageNum}
        waitingOn={buildWaitingOn(stageNum)}
        votingStart={overview.config.votingStart}
        votingEnd={overview.config.votingEnd}
        isEasy={isEasy}
      />
    );
  }

  function renderStageHeader(stageNum: number, title: string, subLabel: ReactNode, desc: string, easyDesc: string) {
    const lifecycle = stageLifecycle(stageNum);
    const statusText =
      lifecycle === "done"
        ? t("This stage is completed.")
        : lifecycle === "in_progress"
          ? t("This stage is currently active.")
          : t("This stage hasn't started yet.");
    return (
      <div className="stageDetailHdr">
        <h2 className="stageDetailTitle">{t(title)}</h2>
        {!isEasy && <div className="stageDetailSubTag">{subLabel}</div>}
        <div className="stageDetailStatusRow">
          <StageLifecycleBadge lifecycle={lifecycle} />
          <span className="dim stageDetailStatusText">{statusText}</span>
        </div>
        <p className="stageDetailDesc">{t(isEasy ? easyDesc : desc)}</p>
        {!isTriple && !isEasy && (
          <div className="techSection">
            <button
              type="button"
              className="stageDetailTechLink"
              onClick={() => setShowTech((v) => !v)}
            >
              {t("What this means technically")}
            </button>
            {showTech && (
              <p className="techSectionText">{STAGE_TECH[tab]}</p>
            )}
          </div>
        )}
      </div>
    );
  }

  function getStageResult(num: number): { title: string; sub: string } | null {
    if (!overview) return null;
    const status = getStageStatus(num);
    if (status !== "done") return null;
    switch (num) {
      case 1:
        return {
          title: t("{{n}} of {{n}} keypers ready", { n: overview.config.thresholdN.toString() }),
          sub: t("Encryption committee finalized"),
        };
      case 2:
        return {
          title: t("{{n}} ballots accepted", { n: overviewBallotTotal.toString() }),
          sub: t("Voting closed"),
        };
      case 3:
        return aggregate ? {
          title: t("{{n}} ballots summed", { n: overviewBallotTotal.toString() }),
          sub: t("Into {{n}} encrypted candidate totals", { n: aggregate.aggregates.length }),
        } : null;
      case 4:
        return shares ? {
          title: t("{{count}} of {{total}} keyper shares received", {
            count: shares.length,
            total: overview.config.thresholdN.toString(),
          }),
          sub: t("Threshold met · tally decrypted"),
        } : null;
      case 5: {
        if (!result) return null;
        const outcome = computeElectionOutcome(result.tally);
        return {
          title: formatOutcomeStageTitle(outcome, t),
          sub: t("{{n}} total votes counted", { n: outcome.totalVotes.toString() }),
        };
      }
      default:
        return null;
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="appShell">

      {/* ═══ TOP BAR ═══ */}
      <header className="topBar">
        <div className="topBarLogo">
          <img
            src={onlineWahlenLogo}
            alt="Online Wahlen logo"
            className="topBarLogoImg"
            width={32}
            height={32}
          />
          <div>
            <div className="topBarLogoTitle">Online Wahlen</div>
            <div className="topBarLogoSub">Personalrat München</div>
          </div>
        </div>
        <div className="topBarSpacer" />
        <div className="topBarRight">
          {!isEasy && <span className="topBarRegistry">Registry:&nbsp;<Hex value={registryAddress ?? ""} trim={8} /></span>}
          <LanguageToggle />
          <ComplexityToggle />
          <button
            type="button"
            className="topBarRefreshBtn"
            onClick={loadElectionsAndMaybeRefreshCurrent}
            disabled={!registryAddress || !provider || loadingElections}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ flexShrink: 0 }}>
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5" />
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
              <path d="M8 16H3v5" />
            </svg>
            {loadingElections ? t("Refreshing…") : t("Refresh")}
          </button>
        </div>
      </header>

      {/* ═══ MAIN CONTENT (centered max-width) ═══ */}
      <div className="pageMain">

      {showAiSkill && overview ? (
        <AddToClaudeView
          overview={overview}
          selectedElection={selectedElection}
          onClose={() => setShowAiSkill(false)}
        />
      ) : null}

      {!showAiSkill && loadError && <div className="errorBanner">{t("Error:")} {loadError}</div>}

      {!showAiSkill && !selectedElection && !loadingElections && (
        <div className="emptyState dim">
          Load elections from a registry to begin.
        </div>
      )}

      {/* ═══ MAIN CONTENT ═══ */}
      {!showAiSkill && overview && (
        <>
          {/* Election header - always visible */}
          <div className="elecHeader">
            <div className="elecHeaderTop">
              <div className="elecHeaderMain">
                <div className="elecHeaderLabel">{t("Election #{{n}}", { n: overview.config.electionId.toString() })}</div>
                <div className="elecHeaderTitle">Personalrat München</div>
                <div className="elecHeaderSubtitle">{t("A secret-ballot vote for the workers' council.")}</div>
              </div>
              <div className="elecHeaderSwitch">
                <div className="switchElecLabel">{t("SWITCH ELECTION")}</div>
                {electionOptions.length > 0 ? (
                  <select
                    className="switchElecSelect"
                    value={selectedElection}
                    onChange={(e) => setSelectedElection(e.target.value)}
                  >
                    {electionOptions.map((o) => (
                      <option key={o.address} value={o.address}>
                        {o.electionId != null
                          ? `#${o.electionId.toString()} · ${o.address.slice(0, 6)}…${o.address.slice(-4)}`
                          : o.address}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="dim" style={{ fontSize: 12 }}>{t("No elections loaded")}</span>
                )}
              </div>
            </div>
            <div className="elecHeaderStats">
              <div className="elecHeaderStat">
                <div className="elecHeaderStatLabel">{t("Voting Opens")}</div>
                <div className="elecHeaderStatValue">{formatUnixUtc(overview.config.votingStart)} <span className="elecHeaderStatDesc">UTC</span></div>
              </div>
              <div className="elecHeaderStat">
                <div className="elecHeaderStatLabel">{t("Voting Closes")}</div>
                <div className="elecHeaderStatValue">{formatUnixUtc(overview.config.votingEnd)} <span className="elecHeaderStatDesc">UTC</span></div>
              </div>
              <div className="elecHeaderStat">
                <div className="elecHeaderStatLabel">{t("Candidates on the Ballot")}</div>
                <div className="elecHeaderStatValue">{overview.config.numCandidates} <span className="elecHeaderStatDesc">{t("people running")}</span> </div>
              </div>
              <div className="elecHeaderStat">
                <div className="elecHeaderStatLabel">{t("Vote Points per Voter")}</div>
                <div className="elecHeaderStatValue">{overview.config.budget} <span className="elecHeaderStatDesc">{t("point(s) each")}</span> </div>
                <div className="elecHeaderStatDesc">
                  {t("Each voter gets {{budget}} points to distribute across the {{candidates}} candidates.", {
                    budget: overview.config.budget,
                    candidates: overview.config.numCandidates,
                  })}
                </div>
              </div>
              <div className="elecHeaderStat">
                <div className="elecHeaderStatLabel">{t("Key Guardians")}</div>
                <div className="elecHeaderStatValue">
                  {t("{{t}} of {{n}}", {
                    t: overview.config.thresholdT.toString(),
                    n: overview.config.thresholdN.toString(),
                  })} <span className="elecHeaderStatDesc">{t("must agree")}</span>
                </div>
                <div className="elecHeaderStatDesc">
                  {t("An independent committee. Only when {{t}} of them combine their keys can the result be decrypted · no single guardian can ever see the votes alone.", {
                    t: overview.config.thresholdT.toString(),
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Persistent content: HOW + CURRENTLY · always visible above tab bar */}
          <div className="persistentOverviewContent">

            {/* HOW THIS ELECTION IS KEPT HONEST + status row (line grid, no card boxes) */}
            <div className="trustSection">
              <div className="trustSectionLabel">{t("HOW THIS ELECTION IS KEPT HONEST")}</div>
              <div
                className={`overviewHonestGrid${overviewDisplay ? "" : " overviewHonestGrid--trustOnly"}`}
              >
                <div className="overviewHonestCell trustCard">
                  {isEasy ? (
                    <>
                      <div className="trustCardTitle">{t("Everything is recorded and anyone can check it.")}</div>
                      <div className="trustCardDesc">
                        {t("Every action in this election — setting up the lock, casting votes, counting, and unlocking — is written down. Anyone, including you, can check that every step was done correctly.")}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="trustCardTitle">{t("Every step is public, signed, and cryptographically proven.")}</div>
                      <div className="trustCardDesc">
                        {t("Every action on this election · key setup, ballot submission, counting, decryption · is recorded on-chain with a signature and a")}
                        {" "}
                        <Term id="zero-knowledge proof">{t("zero-knowledge proof")}</Term>{" "}
                        {t("of correctness. Anyone, including you, can re-run any proof to confirm.")}
                      </div>
                    </>
                  )}
                </div>
                <div className="overviewHonestCell trustCard">
                  {isEasy ? (
                    <>
                      <div className="trustCardTitle">{t("Nobody sees your vote. Only the final totals are revealed.")}</div>
                      <div className="trustCardDesc">
                        {t("All votes are counted without anyone opening a single one. You can check the final results yourself — no need to trust this dashboard.")}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="trustCardTitle">{t("Votes are counted while still encrypted.")}</div>
                      <div className="trustCardDesc">
                        {t("Using")} <Term id="homomorphic tallying">{t("homomorphic tallying")}</Term>
                        {t(", encrypted ballots are added together so the totals appear without ever decrypting any individual ballot. You can inspect every ciphertext on-chain and re-verify the tallying authority's proofs that the count is correct.")}
                      </div>
                    </>
                  )}
                </div>
                {overviewDisplay && (
                <>
                <div className="overviewHonestCell overviewStatusBlock">
                  <div className="overviewStatusLabel">
                    {overviewDisplay.leftLabel === "CURRENTLY" ? (
                      <>{t("CURRENTLY")} {overviewDisplay.showCurrentlyDot && <span className="overviewCurrentlyDot" />}</>
                    ) : (
                      t(overviewDisplay.leftLabel)
                    )}
                  </div>
                  {overviewDisplay.leftLabel === "ELECTION FINALIZED" ? (
                    <>
                      <h2 className="overviewStatusWinner">{overviewDisplay.mainTitle}</h2>
                      {overviewDisplay.mainSub && (
                        <p className="overviewStatusWinnerSub">{overviewDisplay.mainSub}</p>
                      )}
                      {overviewDisplay.footerDesc && (
                        <>
                          <hr className="overviewStatusDivider" />
                          <p className="overviewStatusDesc">{overviewDisplay.footerDesc}</p>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      <h2 className="overviewStatusTitle">{overviewDisplay.mainTitle}</h2>
                      {overviewDisplay.mainSub && (
                        <p className="overviewStatusSub">{overviewDisplay.mainSub}</p>
                      )}
                      {overviewDisplay.stageHeading ? (
                        <>
                          <hr className="overviewStatusDivider" />
                          <p className="overviewStageHeading">{overviewDisplay.stageHeading}</p>
                          {overviewDisplay.stageDesc && (
                            <p className="overviewStatusDesc">{overviewDisplay.stageDesc}</p>
                          )}
                        </>
                      ) : (
                        overviewDisplay.stageDesc && (
                          <p className="overviewStatusDesc">{overviewDisplay.stageDesc}</p>
                        )
                      )}
                    </>
                  )}
                </div>
                <div className="overviewHonestCell overviewStatusBlock">
                  <div className="overviewStatusLabel">{t(overviewDisplay.rightLabel)}</div>
                  <p className="overviewStatusDesc">{overviewDisplay.rightDesc}</p>
                </div>
                </>
                )}
              </div>
            </div>

          </div>

          {/* Column headers + content frame */}
          <div className={`contentFrame${!isStageView ? " contentFrame--overview" : ""}`}>
          <div className={`colHeaders ${!isStageView ? "colHeaders--single" : isTriple ? "colHeaders--triple" : "colHeaders--split"}`}>
            <div
              className="colHeader colHeaderLeft"
              role="button"
              tabIndex={0}
              onClick={() => navigateTo("overview")}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigateTo("overview"); } }}
            >
              <span><span style={{ color: "#6b7280" }}>01</span> <span style={{ color: "#0b1220" }}>{t("OVERVIEW")}</span></span>
            </div>
            {isStageView && (
              <div
                className={`colHeader colHeaderRight${isTriple ? " colHeaderRightNav" : ""}`}
                role={isTriple ? "button" : undefined}
                tabIndex={isTriple ? 0 : undefined}
                onClick={isTriple ? closeVerifyPanel : undefined}
                onKeyDown={isTriple ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); closeVerifyPanel(); } } : undefined}
              >
                <span><span style={{ color: "#6b7280" }}>02</span> <span style={{ color: "#0b1220" }}>{t("STAGE")}</span></span>
              </div>
            )}
            {isTriple && (
              <div className="colHeader colHeaderVerify">
                <span><span style={{ color: "#6b7280" }}>03</span> <span style={{ color: "#0b1220" }}>{t("VERIFY")}</span></span>
                <button type="button" className="colHeaderCloseBtn" onClick={closeVerifyPanel}>{t("CLOSE")}</button>
              </div>
            )}
          </div>

          {/* ─── OVERVIEW MODE ─── */}
          {!isStageView && (
            <div className="overviewBody">

              <p className="overviewQuote">
                {isEasy
                  ? t("Every vote is sealed and can only be opened when enough guardians work together.")
                  : t("\"Every ballot encrypted, counted while still encrypted, opened only by a committee acting together.\"")}
              </p>

              {/* Stage list */}
              <div className="stageListFull">
                {STAGE_ITEMS.map((s) => {
                  const lifecycle = stageLifecycle(s.num);
                  const stageResult = getStageResult(s.num);
                  return (
                    <div
                      key={s.num}
                      className={`stageRowFull${lifecycle === "done" ? " stageRowFull--done" : ""}${lifecycle === "in_progress" ? " stageRowFull--inProgress" : ""}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => navigateTo(s.tab)}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigateTo(s.tab); } }}
                    >
                      <div className="stageRowFullContent">
                        <div className="stageRowFullNum">0{s.num}</div>
                        <div className="stageRowFullBody">
                          <h3 className="stageRowFullTitle">{t(s.title)}</h3>
                          {!isEasy && <div className="stageRowFullSub">{t(s.subLabel)}</div>}
                          <p className="stageRowFullDesc">{t(isEasy ? s.easyDesc : s.desc)}</p>
                          {stageResult && (
                            <div className="stageRowResult">
                              <div className="stageRowResultLabel">{t("RESULT")}</div>
                              <div className="stageRowResultTitle">{stageResult.title}</div>
                              <div className="stageRowResultSub">{stageResult.sub}</div>
                            </div>
                          )}
                          <span className="stageRowFullBadge">
                            <StageLifecycleBadge lifecycle={lifecycle} />
                          </span>
                        </div>
                      </div>
                      <div className="stageRowFullArrow">›</div>
                    </div>
                  );
                })}
              </div>

            </div>
          )}

          {/* ─── STAGE MODE (two/three-column) ─── */}
          {isStageView && (
            <div className={`stageLayout${isTriple ? " stageLayout--triple" : ""}`}>

              {/* Left column: mini stage list + election info */}
              <div className="stageLeftCol">
                <div className="stageMiniList">
                  {STAGE_ITEMS.map((s) => {
                    const lifecycle = stageLifecycle(s.num);
                    const isActive = currentStageNum === s.num;
                    return (
                      <div
                        key={s.num}
                        className={`stageRowMini${lifecycle === "done" ? " stageRowMini--done" : ""}${lifecycle === "in_progress" ? " stageRowMini--inProgress" : ""}${isActive ? " stageRowMini--active" : ""}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => navigateTo(s.tab)}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigateTo(s.tab); } }}
                      >
                        <div className="stageRowMiniNum">0{s.num}</div>
                        <div className="stageRowMiniBody">
                          <div className="stageRowMiniTitle">{t(s.title)}</div>
                          <StageLifecycleBadge lifecycle={lifecycle} small />
                        </div>
                        <div className="stageRowMiniArrow">›</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right column: stage detail */}
              <div className="stageRightCol">

                {/* ── STAGE 1: Encryption keys set up ── */}
                {tab === "dkg" && (
                  <div className="stageDetail slideInRight">
                    {renderStageHeader(1, STAGE_ITEMS[0].title, <Term id={STAGE_ITEMS[0].subLabel}>{STAGE_ITEMS[0].subLabel}</Term>, STAGE_ITEMS[0].desc, STAGE_ITEMS[0].easyDesc)}
                    {isEasy ? (
                      <>
                        <div className="stageDataGrid">
                          <span className="dim"><Term id="Threshold">{t("Threshold")}</Term></span>
                          <span>{t("{{t}} of {{n}} — no single guardian can act alone", {
                            t: overview.config.thresholdT.toString(),
                            n: overview.config.thresholdN.toString(),
                          })}</span>
                          <span className="dim">{t("DKG finalized")}</span>
                          <span>{overview.isDKGFinalized ? t("Yes") : t("No")}</span>
                          <span className="dim"><Term id="Election Public Key">{t("Election Public Key")}</Term></span>
                          <span>{t("A shared lock that seals every ballot. Anyone can use it to seal a vote — only the guardians together can ever open it.")}</span>
                          <span className="dim"><Term id="Whitelist Registrar">{t("Whitelist Registrar Key")}</Term></span>
                          <span>{t("Confirms each voter is on the official eligibility list.")}</span>
                        {overview.config.keyperAddresses.length > 0 && (
                            <>
                              <span className="dim"><Term id="Keyper committee">{t("Keyper Committee")}</Term></span>
                              <span>{t("A total of {{n}} guardians have performed the Distributed Key Generation (DKG).", { n: overview.config.keyperAddresses.length })}</span>
                            </>
                        )}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="stageDataGrid">
                          <span className="dim"><Term id="Threshold">{t("Threshold")}</Term></span>
                          <span className="mono">
                            {t("{{t}} of {{n}} keypers", {
                              t: overview.config.thresholdT.toString(),
                              n: overview.config.thresholdN.toString(),
                            })}
                          </span>
                          <span className="dim">{t("DKG finalized")}</span>
                          <span className="mono">{overview.isDKGFinalized ? t("Yes") : t("No")}</span>
                          <span className="dim"><Term id="Election Public Key">{t("Election Public Key")}</Term></span>
                          <span><Hex value={overview.dkg.pkElection} trim={24} /></span>
                          <span className="dim"><Term id="Whitelist Registrar">{t("Whitelist Registrar Key")}</Term></span>
                          <span><Hex value={overview.config.pkWR} trim={24} /></span>
                        </div>

                        {overview.config.keyperAddresses.length > 0 && (
                          <div className="keyperCommittee">
                            <div className="keyperCommitteeTitle"><Term id="Keyper committee">{t("KEYPER COMMITTEE")}</Term></div>
                            {overview.config.keyperAddresses.map((addr, i) => (
                              <div key={addr} className="keyperRow mono">
                                <span className="keyperRowIdx">#{i}</span>
                                <span className="flex1"><Hex value={addr} trim={22} /></span>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* ── STAGE 2: Voters cast encrypted ballots ── */}
                {tab === "ballots" && (
                  <div className="stageDetail slideInRight">
                    {renderStageHeader(2, STAGE_ITEMS[1].title, <Term id={STAGE_ITEMS[1].subLabel}>{STAGE_ITEMS[1].subLabel}</Term>, STAGE_ITEMS[1].desc, STAGE_ITEMS[1].easyDesc)}

                    {stageLifecycle(2) === "pending" ? (
                      renderStageLocked(2)
                    ) : !isTriple && (!detailView || !detailBallot) ? (
                      <>

                        {/* Pseudonym search — technical mode only */}
                        {!isEasy && (
                          <div className="blSearch">
                            <svg className="blSearchIcon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                            </svg>
                            <input
                              type="text"
                              className="blSearchInput"
                              placeholder={t("Search by pseudonym")}
                              value={ballotSearch}
                              onChange={(e) => {
                                const term = e.target.value;
                                setBallotSearch(term);
                                if (term && allBallots === null && !allBallotsLoading && selectedElection) {
                                  void loadAllBallots(selectedElection, ballotsTotal);
                                }
                              }}
                              spellCheck={false}
                            />
                            {ballotSearch && (
                              <button type="button" className="blSearchClear" onClick={() => setBallotSearch("")} aria-label="Clear search">×</button>
                            )}
                          </div>
                        )}

                        {/* Controls */}
                        <div className="blControls">
                          <div className="blSummary">
                            {pageVerifyStats.valid > 0 && (
                              <span className="blSummaryItem">
                                <span className="blSummaryDot blSummaryDot--ok" />
                                {t("{{n}} valid", { n: pageVerifyStats.valid })}
                              </span>
                            )}
                            {pageVerifyStats.invalid > 0 && (
                              <span className="blSummaryItem">
                                <span className="blSummaryDot blSummaryDot--bad" />
                                {t("{{n}} invalid", { n: pageVerifyStats.invalid })}
                              </span>
                            )}
                            {pageVerifyStats.checking > 0 && (
                              <span className="blSummaryItem">
                                <span className="blSummaryDot blSummaryDot--warn" />
                                {t("{{n}} checking", { n: pageVerifyStats.checking })}
                              </span>
                            )}
                            {filteredBallots.length > 0 && (
                              <span className="blSummaryMeta">
                                {ballotSearch ? t("across all ballots") : t("on this page")}
                              </span>
                            )}
                            {allBallotsLoading && (
                              <span className="blSummaryMeta">{t("Searching all {{n}} ballots…", { n: ballotsTotal.toString() })}</span>
                            )}
                            {!ballotSearch && ballotsLoading && pageVerifyStats.valid === 0 && pageVerifyStats.invalid === 0 && (
                              <span className="blSummaryMeta">{t("Loading…")}</span>
                            )}
                          </div>
                          {!ballotSearch ? (
                            <div className="blPagination">
                              {!isEasy && (
                                <button
                                  type="button"
                                  onClick={() => void exportElectionBallotsFixture()}
                                  disabled={loadingElections || ballotsLoading || exportingFixture}
                                  style={{ fontSize: 12 }}
                                >
                                  {exportingFixture ? t("Exporting…") : t("Export Ballots")}
                                </button>
                              )}
                              <span className="badge statPill">{t("total {{n}}", { n: ballotsTotal.toString() })}</span>
                              <span className="badge statPill">{t("page size {{n}}", { n: pageSize })}</span>
                              <span className="badge statPill">{t("page {{n}}/{{total}}", { n: page + 1, total: safeTotalPages })}</span>
                              <div className="gotoPill">
                                <div className="gotoPillLabel">{t("go to")}</div>
                                <input
                                  inputMode="numeric"
                                  type="number"
                                  value={gotoPageInput}
                                  onChange={(e) => setGotoPageInput(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") { applyGotoPage(); (e.currentTarget as HTMLInputElement).blur(); }
                                  }}
                                  placeholder={`${page + 1}`}
                                  style={{ width: 70, padding: "8px 10px" }}
                                  min={1}
                                />
                              </div>
                              <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>{t("Prev")}</button>
                              <button onClick={() => setPage((p) => Math.min(safeTotalPages - 1, p + 1))} disabled={page + 1 >= safeTotalPages}>{t("Next")}</button>
                            </div>
                          ) : (
                            allBallots && (
                              <span className="dim" style={{ fontSize: 12 }}>
                                {t("{{n}} of {{total}} match", { n: filteredBallots.length, total: allBallots.length })}
                              </span>
                            )
                          )}
                        </div>

                        {/* Ballot rows */}
                        {ballotSearch && allBallotsLoading && (
                          <p className="dim" style={{ padding: "16px 0", fontSize: 13 }}>
                            {t("Loading…")}
                          </p>
                        )}
                        {filteredBallots.length === 0 && ballotSearch && !allBallotsLoading && allBallots !== null && (
                          <p className="dim" style={{ padding: "16px 0", fontSize: 13 }}>
                            {t("No ballots match that prefix.")}
                          </p>
                        )}
                        <div className="blList">
                          {filteredBallots.map((b, index) => {
                            const k = b.pseudonym;
                            const v: VerifyState = resolveBallotVerifyState(selectedElection || undefined, k);
                            const globalIndex = ballotSearch && allBallots
                              ? allBallots.indexOf(b)
                              : page * pageSize + index;
                            return isEasy ? (
                              <div key={`ballot-${k}`} className="blRow blRow--static">
                                <div className="blRowIndex">
                                  <div className="blRowIndexLabel">index {globalIndex}</div>
                                </div>
                                <div className="blRowStatus" style={{ marginLeft: "auto" }}>
                                  {v.status === "ok" && <span className="badge ok">{t("VALID")}</span>}
                                  {v.status === "bad" && <span className="badge bad" title={v.reason}>{t("INVALID")}</span>}
                                  {v.status === "verifying" && <span className="badge warn">Checking…</span>}
                                </div>
                              </div>
                            ) : (
                              <div
                                key={`ballot-${k}`}
                                className="blRow"
                                role="button"
                                tabIndex={0}
                                aria-label={`Ballot index ${globalIndex}`}
                                onClick={() => { setDetailView({ pseudonym: k, globalIndex }); setShowVerifyPanel(false); }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    setDetailView({ pseudonym: k, globalIndex });
                                    setShowVerifyPanel(false);
                                  }
                                }}
                              >
                                <div className="blRowIndex">
                                  <div className="blRowIndexLabel">index {globalIndex}</div>
                                </div>
                                <div className="blRowPseudonym">
                                  <span className="blRowPseudonymLabel dim">pseudonym</span>
                                  <span className="blRowPseudonymGroup">
                                    <span className="mono"><Hex value={b.pseudonym} trim={14} copyable={false} /></span>
                                    <span onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                                      <CopyTextButton text={b.pseudonym} ariaLabel={t("Copy pseudonym")} />
                                    </span>
                                  </span>
                                </div>
                                <div className="blRowStatus">
                                  {v.status === "ok" && <span className="badge ok">{t("VALID")}</span>}
                                  {v.status === "bad" && <span className="badge bad" title={v.reason}>{t("INVALID")}</span>}
                                  {v.status === "verifying" && <span className="badge warn">Checking…</span>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {!isEasy && (
                          <p className="blHelpText">
                            Verification checks the WR attestation, ZK proofs, voter Schnorr signature, and basic field decoding.
                            Runs automatically when the page loads. Click any ballot to see its cryptographic details.
                          </p>
                        )}
                      </>
                    ) : !isTriple ? (
                      <BallotDetail
                        ballot={detailBallot}
                        globalIndex={detailView.globalIndex}
                        verifyState={detailVerifyState}
                        onBack={() => { setDetailView(null); setShowVerifyPanel(false); }}
                        onVerifyLocally={() => setShowVerifyPanel(true)}
                        txHash={ballotTxHash}
                        explorerUrl={import.meta.env.VITE_EXPLORER_URL as string | undefined}
                      />
                    ) : null}
                  </div>
                )}

                {/* ── STAGE 3: Encrypted vote counting ── */}
                {tab === "aggregate" && (
                  <div className="stageDetail slideInRight">
                    {renderStageHeader(3, STAGE_ITEMS[2].title, <Term id={STAGE_ITEMS[2].subLabel}>{STAGE_ITEMS[2].subLabel}</Term>, STAGE_ITEMS[2].desc, STAGE_ITEMS[2].easyDesc)}
                    {stageLifecycle(3) === "pending" ? (
                      <>
                        {renderStageLocked(3)}
                        {renderVerifySection(3)}
                      </>
                    ) : !aggregate ? (
                      <>
                        <p className="stageAwaitingData dim">
                          {isEasy
                            ? t("The sealed vote totals haven't been published yet. They will appear here once voting ends.")
                            : t("No aggregate published yet. The tally aggregator will homomorphically sum accepted ballots after voting closes.")}
                        </p>
                        {renderVerifySection(3)}
                      </>
                    ) : (
                      <>
                        {!isTriple && (
                          isEasy ? (
                            <>
                              <div className="stageCountBadge">
                                {t("candidates: {{n}}", { n: aggregate.aggregates.length })}
                              </div>
                              <div className="dataCardList">
                                {aggregate.aggregates.map((_, j) => (
                                  <div key={j} className="dataCard candidateBlock">
                                    <div className="candidateBlockLabel mono">{t("Candidate {{n}}", { n: j })}</div>
                                    <div style={{ fontSize: 12, marginTop: 6 }}>
                                      {t("Sealed total — hidden until guardians unlock")}
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <p className="dim helpFootnote" style={{ marginTop: 16 }}>
                                {t("All votes were added together while still sealed — like counting closed envelopes without opening any. The totals stay hidden until the guardians work together to open them.")}
                              </p>
                            </>
                          ) : (
                            <>
                              <div className="stageCountBadge">
                                {t("candidates: {{n}}", { n: aggregate.aggregates.length })}
                              </div>
                              <div className="dataCardList">
                                {aggregate.aggregates.map((ct, j) => (
                                  <div key={j} className="dataCard candidateBlock mono">
                                    <div className="candidateBlockLabel">{t("candidate {{n}}", { n: j })}</div>
                                    <div className="candidateBlockData">
                                      <div className="candidateCipherRow">
                                        <span className="dim">c1</span>
                                        <Hex value={ct.c1} trim={24} />
                                      </div>
                                      <div className="candidateCipherRow">
                                        <span className="dim">c2</span>
                                        <Hex value={ct.c2} trim={24} />
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <p className="dim helpFootnote" style={{ marginTop: 20 }}>
                                {t("The aggregate is the encrypted combined vote per candidate: every accepted ballot ciphertext is added together (homomorphic encrypted sum). You still only see ciphertexts here · the actual vote counts stay hidden until keypers submit decryption shares.")}
                              </p>
                            </>
                          )
                        )}
                        {renderVerifySection(3)}
                      </>
                    )}
                  </div>
                )}

                {/* ── STAGE 4: Threshold decryption ── */}
                {tab === "shares" && (
                  <div className="stageDetail slideInRight">
                    {renderStageHeader(4, STAGE_ITEMS[3].title, <Term id={STAGE_ITEMS[3].subLabel}>{STAGE_ITEMS[3].subLabel}</Term>, STAGE_ITEMS[3].desc, STAGE_ITEMS[3].easyDesc)}
                    {stageLifecycle(4) === "pending" ? (
                      <>
                        {renderStageLocked(4)}
                        {renderVerifySection(4)}
                      </>
                    ) : !shares ? (
                      <div className="dim">{t("Loading shares…")}</div>
                    ) : shares.length === 0 ? (
                      <>
                        <p className="stageAwaitingData dim">
                          {isEasy
                            ? t("No guardian has submitted their piece yet.")
                            : t("No decryption shares submitted yet. Keypers publish one share per candidate once the aggregate is on-chain.")}
                        </p>
                        {renderVerifySection(4)}
                      </>
                    ) : (
                      <>
                        {!isTriple && (<>
                        {isEasy ? (
                          <>
                            <div className="stageCountBadge">
                              {t("{{n}} of {{total}} guardians contributed", {
                                n: shares.length,
                                total: overview.config.thresholdN.toString(),
                              })}
                            </div>
                            <div className="dataCardList">
                              {shares.map((sh, rowIdx) => (
                                <div key={rowIdx} className="dataCard shareBlock">
                                  <div className="shareBlockHeader">
                                    <span className="shareBlockKeyper">
                                      <span className="shareBlockKeyperIndex">#{sh.keyperIndex}</span>
                                      <span className="shareBlockKeyperLabel"> {t("Guardian")}</span>
                                    </span>
                                    <span className="shareBlockSubmitted">
                                      <span className="shareBlockSubmittedLabel">{t("Submitted")}</span>
                                      <span className="shareBlockSubmittedTime">{formatUnixUtc(sh.submittedAt)} UTC</span>
                                    </span>
                                  </div>
                                  <p style={{ fontSize: 12, marginTop: 6, marginLeft: 16 }}>
                                    {t("Contributed their piece of the key — checked and verified.")}
                                  </p>
                                </div>
                              ))}
                            </div>
                            <p className="dim helpFootnote" style={{ marginTop: 16 }}>
                              {t("Each guardian holds one piece. Once {{t}} pieces are combined, the sealed totals are opened and the real vote counts appear.", {
                                t: overview.config.thresholdT.toString(),
                              })}
                            </p>
                          </>
                        ) : (<>
                        <div className="stageCountBadge">
                          {t("shares submitted: {{n}}", { n: shares.length })}
                        </div>
                        <div className="dataCardList">
                        {shares.map((sh, rowIdx) => (
                          <div
                            key={`sh-${rowIdx}-${sh.keyperIndex}-${sh.submittedAt.toString()}`}
                            className="dataCard shareBlock"
                          >
                            <div className="shareBlockHeader">
                              <span className="shareBlockKeyper">
                                <span className="shareBlockKeyperIndex">#{sh.keyperIndex}</span>
                                <span className="shareBlockKeyperLabel"> {t("KEYPER")}</span>
                              </span>
                              <span className="shareBlockSubmitted">
                                <span className="shareBlockSubmittedLabel">{t("SUBMITTED")}</span>
                                <span className="shareBlockSubmittedTime">
                                  {formatUnixUtc(sh.submittedAt)} UTC
                                </span>
                              </span>
                            </div>
                            <div className="shareBlockBody">
                              {sh.shares.map((shareHex, j) => {
                                const p = sh.proofs[j];
                                const decKey = `${rowIdx}-${j}`;
                                const dv = decVerifyByKey[decKey] ?? ({ status: "idle" } as VerifyState);
                                const committeePk = overview.dkg.committeePKs[sh.keyperIndex];
                                const canVerifyDleq =
                                  aggregate !== null &&
                                  !!aggregate.aggregates[j] &&
                                  !!p && !!shareHex && !!committeePk;
                                return (
                                  <div key={j} className="shareCandidate">
                                    <div className="shareCandidateHdr">
                                      <span className="shareCandidateTitle">{t("CANDIDATE {{n}}", { n: j })}</span>
                                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        {dv.status === "ok" && <span className="badge ok">{t("DLEQ OK")}</span>}
                                        {dv.status === "bad" && <span className="badge bad" title={dv.reason}>{t("DLEQ FAIL")}</span>}
                                        {dv.status === "verifying" && <span className="badge warn">{t("Checking…")}</span>}
                                        <button
                                          type="button"
                                          onClick={() => void verifyDecryptShareAt(rowIdx, j)}
                                          disabled={loadingElections || !canVerifyDleq || dv.status === "verifying"}
                                          title={t("Verify DLEQ proof for this share")}
                                        >
                                          {t("Verify DLEQ")}
                                        </button>
                                      </div>
                                    </div>
                                    <div className="shareCandidateData">
                                      <span className="shareFieldLabel">{t("share")}</span>
                                      <div style={{ minWidth: 0 }}>
                                        <Hex value={shareHex} trim={30} nowrap />
                                      </div>
                                      <span className="shareFieldLabel">{t("proof (DLEQ)")}</span>
                                      <div style={{ minWidth: 0 }}>
                                        {p ? (() => {
                                          const eStr = p.e.toString();
                                          const zStr = p.z.toString();
                                          const proofCopy = `e=${eStr}\nz=${zStr}`;
                                          return (
                                            <span className="hexWrap hexWrapNowrap">
                                              <span
                                                className="mono hexPreview"
                                                title={proofCopy}
                                              >
                                                e={trimMiddle(eStr, 13)}{" "}
                                                <span className="dim">|</span>{" "}
                                                z={trimMiddle(zStr, 13)}
                                              </span>
                                              <CopyTextButton text={proofCopy} ariaLabel={t("Copy DLEQ proof")} />
                                            </span>
                                          );
                                        })() : (
                                          <span className="dim">(missing)</span>
                                        )}
                                      </div>
                                    </div>
                                    {dv.status === "bad" && (
                                      <div className="dim mono" style={{ marginTop: 6, fontSize: 11 }}>
                                        reason: {dv.reason}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                        </div>
                        <p className="dim helpFootnote" style={{ marginTop: 16 }}>
                          {t("Verify DLEQ checks that a keyper's decryption share matches the published aggregate ciphertext and that keyper's committee public key · their piece of the decryption was computed correctly, without exposing private key material.")}
                        </p>
                        </>)}
                        </>)}
                        {renderVerifySection(4)}
                      </>
                    )}
                  </div>
                )}

                {/* ── STAGE 5: Final tally published ── */}
                {tab === "result" && (
                  <div className="stageDetail slideInRight">
                    {renderStageHeader(5, STAGE_ITEMS[4].title, <Term id={STAGE_ITEMS[4].subLabel}>{STAGE_ITEMS[4].subLabel}</Term>, STAGE_ITEMS[4].desc, STAGE_ITEMS[4].easyDesc)}
                    {stageLifecycle(5) === "pending" ? (
                      <>
                        {renderStageLocked(5)}
                        {renderVerifySection(5)}
                      </>
                    ) : !result ? (
                      <>
                        <p className="stageAwaitingData dim">
                          {t("No result published yet. Once enough keyper shares are combined, the decrypted tally will appear here.")}
                        </p>
                        {renderVerifySection(5)}
                      </>
                    ) : (
                      <>
                        {!isTriple && (
                          <div className="dataCardList">
                            <div className="dataCard tallySection">
                              <div className="tallySectionHdr">
                                <span className="tallySectionTitle">{t("TALLY")}</span>
                                <span className="dim">
                                  {t("{{n}} candidates · {{votes}} votes", {
                                    n: result.tally.length,
                                    votes: result.tally.reduce((sum, c) => sum + c, 0n).toString(),
                                  })}
                                </span>
                              </div>
                              <ResultPie2D tally={result.tally} />
                            </div>
                            {result.keyperIndices.length > 0 && (
                              <div className="dataCard keypersCard">
                                <div className="tallySectionTitle">{t("KEYPERS USED")}</div>
                                <div className="keypersIndicesList">
                                  <span className="keypersIndicesPill">
                                    {t("Indices: {{list}}", { list: result.keyperIndices.join(", ") })}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        {renderVerifySection(5)}
                      </>
                    )}
                  </div>
                )}

              </div>

              {/* ── LEVEL 3: Verify panel (3rd column) ── */}
              {showVerifyPanel && tab === "ballots" && detailBallot && detailView && (
                <div className="stageVerifyCol slideInRight">
                  <VerifyBallotPanel
                    ballot={detailBallot}
                    globalIndex={detailView.globalIndex}
                    overview={overview}
                    selectedElection={selectedElection}
                    onAddToClaude={() => setShowAiSkill(true)}
                  />
                </div>
              )}
              {showVerifyGuide && tab === "aggregate" && aggregate && (
                <div className="stageVerifyCol slideInRight">
                  <VerifyAggregatePanel
                    aggregate={aggregate}
                    onDownloadFixture={downloadAggregateFixture}
                    downloading={downloadingAggFixture}
                    onAddToClaude={() => setShowAiSkill(true)}
                  />
                </div>
              )}
              {showVerifyGuide && tab === "shares" && shares && aggregate && (
                <div className="stageVerifyCol slideInRight">
                  <VerifySharesPanel
                    overview={overview}
                    aggregate={aggregate}
                    shares={shares}
                    selectedElection={selectedElection}
                    onAddToClaude={() => setShowAiSkill(true)}
                  />
                </div>
              )}
              {showVerifyGuide && tab === "result" && result && aggregate && shares && (
                <div className="stageVerifyCol slideInRight">
                  <VerifyResultPanel
                    overview={overview}
                    aggregate={aggregate}
                    shares={shares}
                    result={result}
                    totalBallots={overviewBallotTotal}
                    selectedElection={selectedElection}
                    onAddToClaude={() => setShowAiSkill(true)}
                  />
                </div>
              )}

            </div>
          )}
          </div>{/* end .contentFrame */}
        </>
      )}

      </div>{/* end .pageMain */}

      {/* ═══ SITE FOOTER ═══ */}
      <footer className="siteFooter" aria-label="Credits">
        <span className="siteFooterLine">
          <span className="siteFooterDeveloped">{t("Developed for City of Munich")}</span>
          <span className="siteFooterComma">, </span>
          <span className="siteFooterPowered">
            {t("Powered by Bundeswehr Universität München × Votebase × brainbot/Shutter")}
          </span>
        </span>
      </footer>
    </div>
  );
}
