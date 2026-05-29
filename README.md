# Frontend — Election transparency dashboard

Read-only **Election Dashboard** for the on-chain voting stack. It connects to an Ethereum JSON-RPC node with **`ethers`**, reads **`ElectionRegistry`** and **`Election`** contracts, walks each election through a five-stage lifecycle, and runs **client-side cryptographic verification** in the browser using **`@shutter-network/urban-verified-crypto`** (BLST-backed WASM). **`viem`** is used for small helpers (`keccak256`, `hexToBytes`, etc.) alongside the SDK. **`echarts`** renders the final-tally pie.

There is **no wallet**: only `VITE_RPC_URL` + `VITE_ELECTION_REGISTRY` from `.env` (Vite exposes only `VITE_*`).

---

## Architecture (current)

```text
.env (VITE_RPC_URL, VITE_ELECTION_REGISTRY)
        │
        ▼
┌────────────────────────────────────────────────────────────────┐
│  App.tsx                                                        │
│  • Fixed sidebar (5-stage lifecycle) + scrollable main          │
│  • Election list (registry) + per-election Overview narrative   │
│  • Per-stage panel: locked / in-progress / done                 │
│  • Ballot pagination + per-ballot verify queue + detail view    │
│  • Glossary terms inline, result pie on FINAL TALLY             │
└────────────────────────────────────────────────────────────────┘
        │                              │
        ▼                              ▼
┌──────────────────┐         ┌──────────────────────────────────┐
│  src/eth/        │         │  src/crypto/                      │
│  • client.ts     │         │  • curves.ts — initCurves() once  │
│    JsonRpc +     │         │  • verifyBallot.ts — SDK ballot   │
│    Contract reads│         │  • verifyDecryptShare.ts — DLEQ   │
│  • abis.ts       │         │  • utils.ts — hex / concat        │
│  • types.ts      │         └──────────────────────────────────┘
└──────────────────┘
```

| Path | Role |
|------|------|
| **`src/App.tsx`** | Main UI: env-driven RPC, registry load + refresh, election selector, stage-lifecycle sidebar, Overview narrative, per-stage main panel, ballot list + verify, aggregate / shares / result inspection. Uses refs + a **serialized verify queue** so concurrent WASM calls stay stable. |
| **`src/eth/client.ts`** | `ethers` `JsonRpcProvider` + `Contract` helpers: registry election enumeration (**1-based** `getElections(1, count)` — slot `0` is zero), `getElection`, phase, ballots page, aggregate, decryption shares, result. |
| **`src/eth/abis.ts`** | Minimal ABI fragments for `ElectionRegistry` + `Election`. |
| **`src/eth/types.ts`** | Typed views for decoded contract tuples. |
| **`src/crypto/curves.ts`** | Loads **`/blst.js`** + **`/blst.wasm`** and calls SDK **`initCurves()`** once at startup. |
| **`src/crypto/verifyBallot.ts`** | Thin wrapper around SDK **`verifyBallot`** (full ballot validity vs on-chain `mpk` + `pkWR`). |
| **`src/crypto/verifyDecryptShare.ts`** | Decryption-share **DLEQ** verification against published aggregate + committee keys. |
| **`viem`** (dependency) | `keccak256` / `hexToBytes` / `bytesToHex` in **`verifyBallot.ts`** and **`utils.ts`** — not used for RPC (that is **`ethers`**). |
| **`src/ui/`** | Stage lifecycle, verification panels, glossary tooltips, pie chart, styling (see below). |
| **`public/`** | **`postinstall`** copies **`blst.wasm`** and **`blst.js`** from **`@shutter-network/urban-verified-crypto/dist`** so the browser can fetch them at **`/blst.wasm`** and **`/blst.js`**. Brand asset **`/shutter.png`** is used in the sidebar. |

### `src/ui/` contents

| File | Role |
|------|------|
| **`stageLifecycle.ts`** | Pure state machine deriving each stage's `done` / `in_progress` / `pending` from on-chain `phase`, DKG/result flags, aggregate, shares count vs threshold `t`. Also `getWaitingOnStageNums` for locked panels. |
| **`StageLifecycleBadge.tsx`** | Badge rendering the lifecycle state next to a stage. |
| **`StageLockedPanel.tsx`** | Placeholder shown when a stage's prerequisites aren't met yet (lists what we're waiting on). |
| **`electionOutcome.ts`** | Computes winner / tie / total votes from the decrypted tally and formats the headline strings used on Overview and the Result stage. |
| **`ResultPie2D.tsx`** | `echarts` pie chart of decrypted per-candidate counts. |
| **`BallotDetail.tsx`** | Per-ballot drill-down view. |
| **`ballotVerifyCache.ts`** | In-memory verify-result cache so re-opening a ballot doesn't re-run WASM. |
| **`VerifyBallotPanel.tsx`** | Stage 2 verification panel — re-runs SDK `verifyBallot` for the focused ballot. |
| **`VerifyAggregatePanel.tsx`** | Stage 3 panel — re-derives the homomorphic sum from on-chain ballots and compares it to `getAggregate()`. |
| **`VerifySharesPanel.tsx`** | Stage 4 panel — DLEQ-checks every published keyper share against the aggregate and committee keys. |
| **`VerifyResultPanel.tsx`** | Stage 5 panel — combines shares to decrypt the aggregate and checks it against `getResult()`. |
| **`Term.tsx`** | Inline glossary popovers (DKG, BLS12-381, DLEQ, keypers, t-of-n threshold, ElGamal, …). |
| **`Hex.tsx`**, **`CodeBlock.tsx`** | Hex display + copy, fenced code block. |
| **`clipboard.ts`**, **`formatUnixUtc.ts`** | Small helpers. |
| **`styles.css`** | Dark theme, responsive breakpoints so 14" layouts don't clip. |

**Data flow (short):**
`VITE_*` → RPC provider → list elections from registry → user picks address → fetch `Election.getElection()` + phase + ballots (paged) + aggregate + shares + result → decode bytes → `stageLifecycle` derives per-stage state → **`initCurves()`** → SDK **`verifyBallot`** / aggregate re-derive / share DLEQ / result reconstruction in the browser.

---

## Sidebar (navigation)

A fixed **5-stage lifecycle** with `done` / `in_progress` / `pending` badges plus an Overview header. Selecting a stage that isn't reachable yet shows `StageLockedPanel` listing the prerequisite stages.

| Stage | Tab id | Title | Maps to |
|-------|--------|-------|---------|
| — | `overview` | Overview | Config, `pkWR`, `pkElection`, keyper addresses, current stage narrative + winner once finalized |
| 1 | `dkg` | Encryption Keys Set Up | DKG finalization + committee keys |
| 2 | `ballots` | Voters Cast Encrypted Ballots | Paginated ballots (`getBallots`, **page size 10**) + per-ballot verify |
| 3 | `aggregate` | Encrypted Vote Counting | On-chain encrypted tally (`getAggregate`) + recomputable sum |
| 4 | `shares` | Threshold Decryption | On-chain decryption shares + DLEQ verify |
| 5 | `result` | Final Tally Published | Published tally vector (`getResult`) + pie chart |

Stage 1 has no meaningful "in progress" window — DKG finalizes atomically on-chain, so it transitions `pending → done`.

---

## Registry indexing (important)

`ElectionRegistry` stores elections under **IDs starting at 1** (`elections[0]` is unused). The client calls **`getElections(1n, count)`** and filters zero addresses so the picker never shows a bogus `0x000…` first row.

---

## Prerequisites

- Node.js (LTS recommended)
- A chain exposing the voting contracts + a known **`ElectionRegistry`** address

---

## Environment

```bash
cp .env.example .env
```

| Variable | Meaning |
|----------|---------|
| **`VITE_RPC_URL`** | HTTP(S) JSON-RPC (e.g. local Anvil). |
| **`VITE_ELECTION_REGISTRY`** | `ElectionRegistry` contract address (`0x…`). |

---

## Install and dev

```bash
npm install   # runs postinstall: copies BLST assets into public/
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

| Script | Purpose |
|--------|---------|
| **`npm run build`** | `tsc -b` + production bundle |
| **`npm run preview`** | Serve the production build locally |
| **`npm run lint`** / **`lint:fix`** | ESLint (flat config) |
