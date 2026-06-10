# Frontend — Election transparency dashboard

Read-only **Election Dashboard** for the on-chain voting stack. It connects to an Ethereum JSON-RPC node with **`ethers`**, reads **`ElectionRegistry`** and **`Election`** contracts, walks each election through a five-stage lifecycle, and runs **client-side cryptographic verification** in the browser using **`@shutter-network/urban-verified-crypto`** (BLST-backed WASM). **`viem`** is used for small helpers (`keccak256`, `hexToBytes`, etc.) alongside the SDK. **`echarts`** renders the final-tally pie.

There is **no wallet**: only `VITE_RPC_URL` + `VITE_ELECTION_REGISTRY` from `.env` (Vite exposes only `VITE_*`).

---

## Architecture (current)

```text
.env (VITE_RPC_URL, VITE_ELECTION_REGISTRY, VITE_EXPLORER_URL, VITE_REGISTRY_DEPLOY_BLOCK)
        │
        ▼
┌────────────────────────────────────────────────────────────────┐
│  App.tsx                                                        │
│  • Election list (registry) + per-election Overview narrative   │
│  • Per-stage panel: locked / in-progress / done                 │
│  • Ballot pagination + per-ballot verify queue + detail view    │
│  • Easy / Technical mode toggle                                 │
│  • Glossary terms inline, result pie on FINAL TALLY             │
│  • Election phases shown below the main panel                   │
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
| **`src/App.tsx`** | Main UI: env-driven RPC, registry load + refresh, election selector, Overview narrative, per-stage main panel, ballot list + verify, aggregate / shares / result inspection. Easy/technical mode switch. Uses refs + a **serialized verify queue** so concurrent WASM calls stay stable. |
| **`src/eth/client.ts`** | `ethers` `JsonRpcProvider` + `Contract` helpers: registry election enumeration (**1-based** `getElections(1, count)` — slot `0` is zero), `getElection`, phase, ballots page, aggregate, decryption shares, result. Reads `VITE_REGISTRY_DEPLOY_BLOCK` to narrow event search range. |
| **`src/eth/abis.ts`** | Minimal ABI fragments for `ElectionRegistry` + `Election`. |
| **`src/eth/types.ts`** | Typed views for decoded contract tuples. |
| **`src/crypto/curves.ts`** | Loads **`/blst.js`** + **`/blst.wasm`** and calls SDK **`initCurves()`** once at startup. |
| **`src/crypto/verifyBallot.ts`** | Thin wrapper around SDK **`verifyBallot`** (full ballot validity vs on-chain `mpk` + `pkWR`). |
| **`src/crypto/verifyDecryptShare.ts`** | Decryption-share **DLEQ** verification against published aggregate + committee keys. |
| **`viem`** (dependency) | `keccak256` / `hexToBytes` / `bytesToHex` in **`verifyBallot.ts`** and **`utils.ts`** — not used for RPC (that is **`ethers`**). |
| **`src/ui/`** | Stage lifecycle, easy-mode views, verification panels, glossary tooltips, pie chart, styling (see below). |
| **`public/`** | **`postinstall`** copies **`blst.wasm`** and **`blst.js`** from **`@shutter-network/urban-verified-crypto/dist`** so the browser can fetch them at **`/blst.wasm`** and **`/blst.js`**. Brand asset **`/shutter.png`** is used in the top bar. |

### `src/ui/` contents

| File | Role |
|------|------|
| **`ComplexityContext.tsx`** | React context + `useComplexity()` hook exposing `isEasy`. Persisted to `localStorage`. |
| **`ComplexityToggle.tsx`** | Easy / Technical mode toggle button rendered in the top bar. |
| **`EasyModeViews.tsx`** | Easy-mode stage cards with looping SVG/CSS animations for each phase (DKG, Ballots, Aggregate, Shares), visual trust badges, journey navigator, and phase icons. Shown when `isEasy` is true. |
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
| **`AddToClaudeView.tsx`** | Generates a `verify-election.md` skill the user can copy/download and hand to any AI agent for autonomous on-chain verification. |
| **`aiSkill.ts`** | Builds the verification skill markdown from live election data. |
| **`Term.tsx`** | Inline glossary popovers (DKG, BLS12-381, DLEQ, keypers, t-of-n threshold, ElGamal, …). |
| **`Hex.tsx`**, **`CodeBlock.tsx`** | Hex display + copy, fenced code block. |
| **`LanguageToggle.tsx`** | EN / DE language switcher. |
| **`clipboard.ts`**, **`formatUnixUtc.ts`** | Small helpers. |
| **`styles.css`** | Dark theme, responsive breakpoints so 14" layouts don't clip. |

**Data flow (short):**
`VITE_*` → RPC provider → list elections from registry → user picks address → fetch `Election.getElection()` + phase + ballots (paged) + aggregate + shares + result → decode bytes → `stageLifecycle` derives per-stage state → **`initCurves()`** → SDK **`verifyBallot`** / aggregate re-derive / share DLEQ / result reconstruction in the browser.

---

## Easy / Technical mode

The top bar has a **mode toggle** (Easy / Technical). The chosen mode persists across page reloads.

| Mode | What you see |
|------|-------------|
| **Easy** | Animated visual cards for each election phase. Plain-language descriptions, trust badges ("Fully public", "You can verify"), and a journey navigator. No raw hex or cryptographic detail panels. |
| **Technical** | Full hex data, "What this means technically" panels, inline glossary tooltips, per-ballot / aggregate / share / result cryptographic verification panels, registry address in the top bar. |

---

## Election phases

The election lifecycle is displayed below the main panel as five sequential phases, each with a `done` / `in_progress` / `pending` badge. Selecting a phase that isn't reachable yet shows `StageLockedPanel` listing the prerequisite phases.

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

## Independent verification

Anyone can verify this election without trusting the dashboard. The **"Add to Claude"** button generates a `verify-election.md` skill pre-filled with all live contract addresses and parameters. Paste it into:

- **Claude Code** (`claude`) or any Claude agent
- Any other AI agent with shell access and a terminal

The agent fetches all election data directly from the blockchain and runs every cryptographic check autonomously — no backend, no trust in this dashboard required.

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

| Variable | Required | Meaning |
|----------|----------|---------|
| **`VITE_RPC_URL`** | Yes | HTTP(S) JSON-RPC endpoint (e.g. local Anvil, Sepolia). |
| **`VITE_ELECTION_REGISTRY`** | Yes | `ElectionRegistry` contract address (`0x…`). |
| **`VITE_EXPLORER_URL`** | No | Block explorer base URL (e.g. `https://sepolia.etherscan.io`). Used to generate transaction links in the UI. |
| **`VITE_REGISTRY_DEPLOY_BLOCK`** | No | Block number at which the registry contract was deployed. Optional but recommended — narrows the event log search range and speeds up election discovery. |

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
