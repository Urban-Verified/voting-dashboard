# Urban Verified: Voting Dashboard

> **Part of the Urban Verified: Private and Verifiable Online Voting stack.**
> To understand the full end-to-end architecture, start with the [thresholdELGamal README](https://github.com/Urban-Verified/thresholdELGamal#readme).

## Where this fits

The dashboard is the public window into an election. Voters, observers and auditors use it to follow each election from key setup to final result, and to check for themselves that the result is correct.

It has **no backend and no special access**. It reads the public [bulletin-board](https://github.com/Urban-Verified/bulletin-board) contracts over plain JSON-RPC and re-runs the cryptographic checks in the browser with the [Shutter Voting SDK](https://github.com/Urban-Verified/shutter-voting-sdk). So it does not have to be trusted: it only repeats what anyone could compute from the chain.

| Election step | What the dashboard shows and checks |
|---|---|
| Keypers create the keys | The election public key and each keyper's public key, once the DKG result is final on chain |
| Voters cast ballots | Every encrypted ballot. Re-checks each ballot's proofs, voter signature and Voter Registry Oracle attestation. "Find my vote" lets a voter confirm their ballot was recorded |
| Ballots are added up | Recomputes the encrypted total from the ballots, using the same re-vote rule as the tally aggregator (newest valid ballot per pseudonym), and compares it to the published total |
| Keypers publish shares | Checks each keyper's decryption share proof against the encrypted total |
| Result is published | Combines the shares, decrypts the total, and compares it to the published result |

**SDK version:** the dashboard depends on `@shutter-network/urban-verified-crypto` **`^0.1.2`**, the ballot format the rest of the stack uses. SDK 0.2.0 and later (0.3.0 is the latest on npm) change the ballot and attestation format and must not be swapped in without updating the whole stack. See [Version used by the Urban Verified stack](https://github.com/Urban-Verified/shutter-voting-sdk#version-used-by-the-urban-verified-stack) for the differences.

### Related repositories

| Repository | Role |
|---|---|
| [`thresholdELGamal`](https://github.com/Urban-Verified/thresholdELGamal) | Keypers, DKG coordinator, tally aggregator. Entry point for the whole system |
| [`bulletin-board`](https://github.com/Urban-Verified/bulletin-board) | On-chain election record that this dashboard reads |
| [`shutter-voting-sdk`](https://github.com/Urban-Verified/shutter-voting-sdk) | TypeScript SDK that builds and verifies encrypted ballots (`@shutter-network/urban-verified-crypto`) |

---

## Overview

Read-only **Election Dashboard** for the on-chain voting stack. It connects to an Ethereum JSON-RPC node with **`ethers`**, reads **`ElectionRegistry`** and **`Election`** contracts, walks each election through a five-stage lifecycle, and runs **client-side cryptographic verification** in the browser using **`@shutter-network/urban-verified-crypto`** (BLST-backed WASM). **`viem`** is used for small helpers (`keccak256`, `hexToBytes`, etc.) alongside the SDK. **`echarts`** renders the final-tally pie.

There is **no wallet**: only `VITE_RPC_URL` + `VITE_ELECTION_REGISTRY` from `.env` (Vite exposes only `VITE_*`).

---

## Architecture

```text
.env (VITE_RPC_URL, VITE_ELECTION_REGISTRY, VITE_EXPLORER_URL, VITE_REGISTRY_DEPLOY_BLOCK)
        │
        v
┌────────────────────────────────────────────────────────────────────────┐
│  App.tsx                                                               │
│  - Election list (registry) + per-election Overview narrative          │
│  - Per-stage panel: locked / in-progress / done                        │
│  - Ballot pagination + per-ballot verify queue + detail view           │
│  - Re-vote status per ballot: counted / superseded / rejected          │
│  - Easy / Technical mode, EN / DE language                             │
│  - Glossary terms inline, result pie on FINAL TALLY                    │
│  - Overview stage list, then stage detail + optional verify guide      │
└────────────────────────────────────────────────────────────────────────┘
        │                                     │
        v                                     v
┌────────────────────────────────┐    ┌──────────────────────────────────┐
│  src/eth/                      │    │  src/crypto/                     │
│  - client.ts: contract reads,  │    │  - curves.ts: initCurves() once  │
│    ballot proofs from          │    │  - verifyBallot.ts: SDK ballot   │
│    VoteSubmitted logs          │    │  - verifyDecryptShare.ts: DLEQ   │
│  - abis.ts                     │    │  - utils.ts: hex / concat        │
│  - types.ts                    │    └──────────────────────────────────┘
└────────────────────────────────┘
```

| Path | Role |
|------|------|
| **`src/App.tsx`** | Main UI: env-driven RPC, registry load + refresh, election switcher, Overview narrative, per-stage main panel, ballot list + verify with re-vote status (counted / superseded / rejected, using the same "newest valid ballot per pseudonym" rule as the tally aggregator), aggregate / shares / result inspection. Easy/technical mode switch. Uses refs + a **serialized verify queue** so concurrent WASM calls stay stable. |
| **`src/eth/client.ts`** | `ethers` `JsonRpcProvider` + `Contract` helpers: registry election enumeration (**1-based** `getElections(1, count)` — slot `0` is zero), `getElection`, phase, ballots page, aggregate, decryption shares, result. Ballot proofs are not kept in contract storage, so it recovers each ballot's `zkProof` from its `VoteSubmitted` event and checks it against the on-chain `zkProofHash`. Uses `VITE_REGISTRY_DEPLOY_BLOCK` as the start block for its `VoteSubmitted` log searches (proof recovery and ballot transaction links). |
| **`src/eth/abis.ts`** | Minimal ABI fragments for `ElectionRegistry` + `Election`. |
| **`src/eth/types.ts`** | Typed views for decoded contract tuples. |
| **`src/crypto/curves.ts`** | Calls SDK **`initCurves()`** once and caches the promise. The SDK itself loads **`/blst.js`** + **`/blst.wasm`**. |
| **`src/crypto/verifyBallot.ts`** | `verifyBallotMvp`: calls SDK **`verifyBallot`** (full ballot validity vs on-chain `mpk`) with its own Voter Registry Oracle attestation check (Schnorr against `pkWR`), input length and range checks, and a lock so only one verification uses the WASM heap at a time. |
| **`src/crypto/verifyDecryptShare.ts`** | Decryption-share **DLEQ** verification against published aggregate + committee keys. |
| **`viem`** (dependency) | `keccak256` / `hexToBytes` / `bytesToHex` in **`verifyBallot.ts`** and **`utils.ts`** — not used for RPC (that is **`ethers`**). |
| **`src/i18n/`** | `i18next` + `react-i18next` setup (`index.ts`) and German translations (`de.ts`). English source strings are the keys. German is the default; the choice is saved in `localStorage`. Components get `t` from `useTranslation()`. |
| **`src/ui/`** | Stage lifecycle, easy-mode views, verification panels, glossary tooltips, pie chart, styling (see below). |
| **`public/`** | **`postinstall`** copies **`blst.wasm`** and **`blst.js`** from **`@shutter-network/urban-verified-crypto/dist`** so the browser can fetch them at **`/blst.wasm`** and **`/blst.js`**. The top-bar logo is **`src/assets/logo.svg`**. |

### `src/ui/` contents

| File | Role |
|------|------|
| **`ComplexityContext.tsx`** | Small module-level store read through `useSyncExternalStore`. `useComplexity()` returns `complexity`, `isEasy` and `isTechnical`. Defaults to Easy; persisted to `localStorage`. |
| **`ComplexityToggle.tsx`** | Easy / Technical mode toggle button rendered in the top bar. |
| **`EasyModeViews.tsx`** | Easy-mode stage cards with looping SVG/CSS animations for each phase (DKG, Ballots, Aggregate, Shares), visual trust badges, journey navigator, and phase icons. Shown when `isEasy` is true. |
| **`stageLifecycle.ts`** | Pure state machine deriving each stage's `done` / `in_progress` / `pending` from on-chain `phase`, DKG/result flags, aggregate, shares count vs threshold `t`. Also `getWaitingOnStageNums` for locked panels. |
| **`StageLifecycleBadge.tsx`** | Badge rendering the lifecycle state next to a stage. |
| **`StageLockedPanel.tsx`** | Placeholder shown when a stage's prerequisites aren't met yet (lists what we're waiting on). |
| **`electionOutcome.ts`** | Computes winner / tie / total votes from the decrypted tally and formats the headline strings used on Overview and the Result stage. |
| **`ResultPie2D.tsx`** | `echarts` pie chart of decrypted per-candidate counts. |
| **`BallotDetail.tsx`** | Per-ballot drill-down view. |
| **`ballotVerifyCache.ts`** | In-memory verify-result cache so re-opening a ballot doesn't re-run WASM. |
| **`VerifyBallotPanel.tsx`** | Stage 2 "verify it yourself" guide: download `ballot-N-fixture.json`, install the SDK, run a Node script that calls `verifyBallot`. (The in-browser check runs from `App.tsx`.) |
| **`VerifyAggregatePanel.tsx`** | Stage 3 guide: download `aggregate-fixture.json` and run a script that re-adds the ballots and compares the sum to `getAggregate()`. |
| **`VerifySharesPanel.tsx`** | Stage 4 guide: download `shares-fixture.json` and run a script that DLEQ-checks every keyper share. (The dashboard also checks shares in the browser.) |
| **`VerifyResultPanel.tsx`** | Stage 5 guide: download `result-fixture.json` and run a script that combines the shares, decrypts the aggregate and checks it against `getResult()`. |
| **`AddToClaudeView.tsx`** | Generates a `verify-election.md` skill the user can copy/download and hand to any AI agent for autonomous on-chain verification. |
| **`aiSkill.ts`** | Builds the verification skill markdown from live election data. |
| **`Term.tsx`** | Inline glossary popovers (DKG, BLS12-381, DLEQ, keypers, t-of-n threshold, ElGamal, …). |
| **`Hex.tsx`**, **`CodeBlock.tsx`** | Hex display + copy, fenced code block. |
| **`LanguageToggle.tsx`** | EN / DE language switcher. |
| **`clipboard.ts`**, **`formatUnixUtc.ts`** | Small helpers. |
| **`styles.css`** | Light theme, responsive breakpoints at 900 px and 600 px. |

**Data flow (short):**
`VITE_*` → RPC provider → list elections from registry → user picks address → fetch `Election.getElection()` + phase + ballots (paged) + aggregate + shares + result → decode bytes → `stageLifecycle` derives per-stage state → **`initCurves()`** → SDK **`verifyBallot`** per ballot and share DLEQ checks in the browser. Aggregate and result checks run from the downloadable scripts.

---

## Easy / Technical mode

The top bar has a **mode toggle** (Easy / Technical). The chosen mode persists across page reloads.

| Mode | What you see |
|------|-------------|
| **Easy** | Animated visual cards for each election phase. Plain-language descriptions, trust badges ("Fully public", "You can verify"), and a journey navigator. No raw hex or cryptographic detail panels. |
| **Technical** | Full hex data, "What this means technically" panels, inline glossary tooltips, per-ballot / aggregate / share / result "verify it yourself" guides, registry address and "Add to AI agent" in the top bar. |

---

## Page layout

```
┌─ Top bar ──────────────────────────────────────────────────────┐
│  Logo, Registry*, Find my vote, Language, Easy/Technical,      │
│  Add to AI agent*, Refresh       (* Technical mode only)       │
└────────────────────────────────────────────────────────────────┘
┌─ Election header ──────────────────────────────────────────────┐
│  Election number and title, Switch election                    │
│  Voting Opens/Closes, Candidates, Vote Points per Voter,       │
│  Key Guardians (t of n)                                        │
└────────────────────────────────────────────────────────────────┘
┌─ Persistent overview content (always visible) ─────────────────┐
│  Trust section: "HOW THIS ELECTION IS KEPT HONEST"             │
│  + current status / winner narrative                           │
└────────────────────────────────────────────────────────────────┘
┌─ Election phases (tabbed) ─────────────────────────────────────┐
│  Stage 1 · Stage 2 · Stage 3 · Stage 4 · Stage 5              │
└────────────────────────────────────────────────────────────────┘
```

## Election phases

The default view lists all five stages, each with a `done` / `in_progress` / `pending` badge. Selecting a stage switches to a column layout: a short stage list on the left, the stage detail next to it, and an optional verify guide column. Selecting a stage whose prerequisites aren't met shows `StageLockedPanel`.

Stage 1 also shows the overview details (DKG setup, committee keys, `pkWR`, `pkElection`, keyper addresses).

| Stage | View id | Title | Content |
|-------|--------|-------|---------|
| 1 | `dkg` | Encryption Keys Set Up | Overview details (election config, committee keys, keyper addresses, `pkWR`) + DKG finalization |
| 2 | `ballots` | Voters Cast Encrypted Ballots | Paginated ballots (`getBallots`, **page size 10**) with proofs from `VoteSubmitted` logs, per-ballot verify, re-vote status |
| 3 | `aggregate` | Encrypted Vote Counting | On-chain encrypted tally (`getAggregate`) + script to recompute the sum |
| 4 | `shares` | Threshold Decryption | On-chain decryption shares + DLEQ verify in the browser |
| 5 | `result` | Final Tally Published | Published tally vector (`getResult`) + pie chart |

Stage 1 has no meaningful "in progress" window — DKG finalizes atomically on-chain, so it transitions `pending → done`.

---

## Find my vote

After casting a ballot, a voter receives a **pseudonym** — a unique `0x…` code they can use to confirm their vote was recorded on-chain.

The **"Find my vote"** button opens a modal with a short explanation of what a pseudonym is and a search input. As the voter types, the dashboard searches all ballots by pseudonym prefix and lists up to 8 matches. Clicking any result navigates directly to that ballot's detail view for full cryptographic inspection.

Entry points:
- **Top bar** — visible whenever an election is selected and voting has opened or closed (`stageLifecycle(2) !== "pending"`).
- **Stage 2 (Ballots)** — a contextual "Voted? Find my vote →" prompt appears above the ballot list in both easy and technical mode, at the moment a voter is most likely to want to confirm their submission.

The button is hidden before voting opens so it doesn't appear for elections still in setup.

---

## Independent verification

Anyone can verify this election without trusting the dashboard. The **"Add to AI agent"** button (Technical mode, once an election is loaded) generates a `verify-election.md` skill pre-filled with all live contract addresses and parameters. Paste it into:

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
| **`VITE_REGISTRY_DEPLOY_BLOCK`** | No | Block number at which the registry contract was deployed. Used as the start block for `VoteSubmitted` log searches (recovering ballot proofs and finding ballot transactions). Elections themselves are listed with contract calls, not logs. Optional on a local chain, but **set it on public chains**, where RPC providers often refuse or time out on log searches from block 0. |

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

---

## Licence

Copyright (C) 2026 Brainbot GmbH

This program is free software: you can redistribute it and/or modify it under
the terms of the GNU Affero General Public License, version 3 only, as published
by the Free Software Foundation.

This program is distributed in the hope that it will be useful, but WITHOUT ANY
WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A
PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License along
with this program. If not, see <https://www.gnu.org/licenses/>.

SPDX-License-Identifier: AGPL-3.0-only
