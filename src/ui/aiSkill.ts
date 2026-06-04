const SDK = "@shutter-network/urban-verified-crypto";

const ABI = [
  "function getElection() view returns (tuple(uint256 electionId,uint64 votingStart,uint64 votingEnd,uint256 selfSubmitFee,uint32 numCandidates,uint32 budget,uint64 thresholdN,uint64 thresholdT,address[] keyperAddresses,bytes pkWR) config, tuple(bytes pkElection,bytes[] committeePKs) dkgResult)",
  "function getNumBallots() view returns (uint256)",
  "function getBallots(uint256 startIndex,uint256 count) view returns (tuple(bytes32 pseudonym,bytes vk,tuple(bytes c1,bytes c2)[] ciphertexts,bytes zkProof,bytes voterSignature,bytes wrAttestation)[])",
  "function getAggregate() view returns (tuple(tuple(bytes c1,bytes c2)[] aggregates))",
  "function getDecryptionShares() view returns (tuple(uint8 keyperIndex,uint64 submittedAt,bytes[] shares,tuple(uint256 e,uint256 z)[] proofs)[])",
  "function getResult() view returns (tuple(uint256[] tally,uint8[] keyperIndices))",
];

type SkillParams = {
  electionAddress: string;
  rpcUrl: string;
  electionId: string;
  numCandidates: number;
  budget: number;
  thresholdT: number;
  thresholdN: number;
};

export function buildElectionSkill(p: SkillParams): string {
  const abiJson = JSON.stringify(ABI, null, 4)
    .split("\n")
    .map((l, i) => (i === 0 ? l : "  " + l))
    .join("\n");

  // ── Step 1: fetch-data.mjs ─────────────────────────────────────────────────
  // Detects which artifacts are available and only writes fixtures for them.
  const fetchScript = `\
// fetch-data.mjs  —  fetches election data from the blockchain.
// Detects which artifacts are available and only writes fixtures for those.
import { JsonRpcProvider, Contract } from "ethers";
import { writeFileSync } from "node:fs";

const RPC      = "${p.rpcUrl}";
const ELECTION = "${p.electionAddress}";
const ABI = ${abiJson};

const provider = new JsonRpcProvider(RPC);
const election = new Contract(ELECTION, ABI, provider);

console.log("Fetching election config and ballots…");
const [[cfg, dkg], totalBn] = await Promise.all([
  election.getElection(),
  election.getNumBallots(),
]);

const total = Number(totalBn);
const BATCH = 100;
const allBallots = [];
for (let i = 0; i < Math.ceil(total / BATCH); i++) {
  const start = i * BATCH;
  const count = Math.min(BATCH, total - start);
  const page = await election.getBallots(start, count);
  for (const b of page) {
    allBallots.push({
      pseudonym: b.pseudonym,
      vk: b.vk,
      ciphertexts: b.ciphertexts.map(ct => ({ c1: ct.c1, c2: ct.c2 })),
      zkProof: b.zkProof,
      voterSignature: b.voterSignature,
      wrAttestation: b.wrAttestation,
    });
  }
  console.log(\`  ballots: \${start + count}/\${total}\`);
}

const base = {
  electionId: cfg.electionId.toString(),
  numCandidates: Number(cfg.numCandidates),
  budget: Number(cfg.budget),
  thresholdT: Number(cfg.thresholdT),
  thresholdN: Number(cfg.thresholdN),
  mpkElectionG2: dkg.pkElection,
  pkWrG1: cfg.pkWR,
  committeePKs: [...dkg.committeePKs],
  totalBallots: total.toString(),
  mode: "exact",
  variant: "A",
};

// Ballots are always available.
writeFileSync("ballot-fixture.json", JSON.stringify({ ...base, ballots: allBallots }, null, 2));
console.log("wrote ballot-fixture.json");

// Aggregate: published by the tally aggregator immediately after voting closes.
let aggregate = null;
try {
  const aggRaw = await election.getAggregate();
  if (aggRaw && aggRaw.aggregates && aggRaw.aggregates.length > 0) {
    aggregate = [...aggRaw.aggregates].map(ct => ({ c1: ct.c1, c2: ct.c2 }));
    writeFileSync("aggregate-fixture.json", JSON.stringify({ ...base, ballots: allBallots, aggregate }, null, 2));
    console.log("wrote aggregate-fixture.json");
  } else {
    console.log("aggregate not published yet, skipping");
  }
} catch (err) {
  console.log("aggregate not available yet, skipping:", err.message);
}

// Decryption shares: only available after aggregate exists.
let shares = null;
if (aggregate) {
  try {
    const sharesRaw = await election.getDecryptionShares();
    if (sharesRaw && sharesRaw.length > 0) {
      shares = sharesRaw.map(s => ({
        keyperIndex: Number(s.keyperIndex),
        shares: [...s.shares],
        proofs: s.proofs.map(proof => ({ e: proof.e.toString(), z: proof.z.toString() })),
      }));
      writeFileSync("shares-fixture.json", JSON.stringify({ ...base, aggregate, shares }, null, 2));
      console.log("wrote shares-fixture.json");
    } else {
      console.log("decryption shares not submitted yet, skipping");
    }
  } catch (err) {
    console.log("decryption shares not available yet, skipping:", err.message);
  }
}

// Result: published immediately after enough shares are combined.
if (shares) {
  try {
    const resultRaw = await election.getResult();
    if (resultRaw.tally && resultRaw.tally.length > 0) {
      const tally = [...resultRaw.tally].map(v => v.toString());
      const keyperIndices = [...resultRaw.keyperIndices].map(Number);
      writeFileSync("result-fixture.json", JSON.stringify({ ...base, aggregate, shares, tally, keyperIndices }, null, 2));
      console.log("wrote result-fixture.json");
    } else {
      console.log("result not published yet, skipping");
    }
  } catch (err) {
    console.log("result not available yet, skipping:", err.message);
  }
}

const written = ["ballot-fixture.json",
  aggregate ? "aggregate-fixture.json" : null,
  shares    ? "shares-fixture.json"    : null,
  shares    ? "result-fixture.json"    : null,
].filter(Boolean).join(", ");
console.log("Fetch complete. Fixtures written: " + written);`;

  // ── Step 2: verify-ballots.js ──────────────────────────────────────────────
  // Always runs (ballots are always present).
  const verifyBallotsScript = `\
// verify-ballots.js  —  checks every ballot: ZK proofs, WR attestation, voter signature
const { initCurves, G1Point, G2Point, schnorrVerify, verifyBallot } = require("${SDK}");
const { readFileSync } = require("node:fs");
const { keccak256 } = require("viem");
const fromHex   = (h) => Uint8Array.from(Buffer.from(String(h).replace(/^0x/, ""), "hex"));
const g2FromHex = (h) => G2Point.fromBytes(fromHex(h));
const electionId32 = (id) => fromHex(BigInt(id).toString(16).padStart(64, "0"));
const makeWrVerifier = (pkWr) => {
  const wrVk = G1Point.fromBytes(pkWr);
  return (electionIdBytes, pseudonym, vk, att) => {
    if (electionIdBytes.length !== 32 || pseudonym.length !== 32 || vk.length !== 48) return false;
    try {
      let s = 0n;
      for (let i = 48; i < 80; i++) s = (s << 8n) + BigInt(att[i]);
      return schnorrVerify(
        wrVk,
        fromHex(keccak256(Buffer.concat([Buffer.from(electionIdBytes), Buffer.from(pseudonym), Buffer.from(vk)]))),
        { R: G1Point.fromBytes(att.subarray(0, 48)), s },
      );
    } catch { return false; }
  };
};
async function main() {
  const f = JSON.parse(readFileSync("ballot-fixture.json", "utf8"));
  await initCurves();
  const mpk        = g2FromHex(f.mpkElectionG2);
  const wrVerifier = makeWrVerifier(fromHex(f.pkWrG1));
  const config     = { numCandidates: f.numCandidates, budget: f.budget, mode: f.mode ?? "exact", variant: f.variant ?? "A" };
  const electionIdBytes = electionId32(f.electionId);
  let allOk = true;
  for (let i = 0; i < f.ballots.length; i++) {
    const b = f.ballots[i];
    const res = verifyBallot(
      { electionId: electionIdBytes, pseudonym: fromHex(b.pseudonym), vk: fromHex(b.vk),
        ciphertexts: b.ciphertexts.map(({ c1, c2 }) => [fromHex(c1), fromHex(c2)]),
        zkProof: fromHex(b.zkProof), voterSignature: fromHex(b.voterSignature), wrAttestation: fromHex(b.wrAttestation) },
      config, mpk, wrVerifier,
    );
    if (!res.ok) allOk = false;
    console.log(\`Ballot \${i}: \${res.ok ? "✓ valid" : \`✗ invalid: \${res.reason}\`}\`);
  }
  console.log(allOk ? \`\\n✓ All \${f.ballots.length} ballots valid\` : "\\n✗ Some ballots are invalid");
  process.exit(allOk ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(2); });`;

  // ── Step 3: verify-aggregate.js ───────────────────────────────────────────
  // Only written/run when aggregate-fixture.json exists.
  const verifyAggregateScript = `\
// verify-aggregate.js  —  reproduces the homomorphic sum and compares with on-chain aggregate.
// Only locally-valid ballots are summed — the on-chain aggregator excludes invalid ones too.
const { initCurves, G1Point, G2Point, schnorrVerify, verifyBallot, sumCts } = require("${SDK}");
const { readFileSync } = require("node:fs");
const { keccak256 } = require("viem");
const fromHex   = (h) => Uint8Array.from(Buffer.from(String(h).replace(/^0x/, ""), "hex"));
const g2FromHex = (h) => G2Point.fromBytes(fromHex(h));
const electionId32 = (id) => fromHex(BigInt(id).toString(16).padStart(64, "0"));
const makeWrVerifier = (pkWr) => {
  const wrVk = G1Point.fromBytes(pkWr);
  return (electionIdBytes, pseudonym, vk, att) => {
    if (electionIdBytes.length !== 32 || pseudonym.length !== 32 || vk.length !== 48) return false;
    try {
      let s = 0n;
      for (let i = 48; i < 80; i++) s = (s << 8n) + BigInt(att[i]);
      return schnorrVerify(
        wrVk,
        fromHex(keccak256(Buffer.concat([Buffer.from(electionIdBytes), Buffer.from(pseudonym), Buffer.from(vk)]))),
        { R: G1Point.fromBytes(att.subarray(0, 48)), s },
      );
    } catch { return false; }
  };
};
async function main() {
  const f = JSON.parse(readFileSync("aggregate-fixture.json", "utf8"));
  await initCurves();
  const mpk        = g2FromHex(f.mpkElectionG2);
  const wrVerifier = makeWrVerifier(fromHex(f.pkWrG1));
  const config     = { numCandidates: f.numCandidates, budget: f.budget, mode: f.mode ?? "exact", variant: f.variant ?? "A" };
  const electionIdBytes = electionId32(f.electionId);
  const validBallots = f.ballots.filter((b) => {
    const res = verifyBallot(
      { electionId: electionIdBytes, pseudonym: fromHex(b.pseudonym), vk: fromHex(b.vk),
        ciphertexts: b.ciphertexts.map(({ c1, c2 }) => [fromHex(c1), fromHex(c2)]),
        zkProof: fromHex(b.zkProof), voterSignature: fromHex(b.voterSignature), wrAttestation: fromHex(b.wrAttestation) },
      config, mpk, wrVerifier,
    );
    return res.ok;
  });
  console.log(\`Using \${validBallots.length} of \${f.ballots.length} ballots (locally valid)\`);
  let ok = true;
  for (let j = 0; j < f.numCandidates; j++) {
    const sum = sumCts(validBallots.map((b) => ({ c1: g2FromHex(b.ciphertexts[j].c1), c2: g2FromHex(b.ciphertexts[j].c2) })));
    const pub = { c1: g2FromHex(f.aggregate[j].c1), c2: g2FromHex(f.aggregate[j].c2) };
    const match = sum.c1.equals(pub.c1) && sum.c2.equals(pub.c2);
    if (!match) ok = false;
    console.log(\`Candidate \${j}: \${match ? "✓ match" : "✗ mismatch"}\`);
  }
  console.log(ok ? "\\n✓ Aggregate verified" : "\\n✗ Aggregate mismatch");
  process.exit(ok ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(2); });`;

  // ── Step 4: verify-shares.js ──────────────────────────────────────────────
  // Only written/run when shares-fixture.json exists.
  const verifySharesScript = `\
// verify-shares.js  —  checks every keyper's DLEQ proof against the aggregate.
const { initCurves, G2Point, Transcript, verifyDecryptionShare } = require("${SDK}");
const { readFileSync } = require("node:fs");
const fromHex   = (h) => Uint8Array.from(Buffer.from(String(h).replace(/^0x/, ""), "hex"));
const g2FromHex = (h) => G2Point.fromBytes(fromHex(h));
const electionId32 = (id) => fromHex(BigInt(id).toString(16).padStart(64, "0"));
const decryptTranscript = (electionIdBytes, j) => {
  const t = new Transcript("SHUTTER-VOTE-DECRYPT-v1");
  t.append("electionId", electionIdBytes);
  t.append("candidate", new Uint8Array([(j >> 8) & 255, j & 255]));
  return t;
};
async function main() {
  const f = JSON.parse(readFileSync("shares-fixture.json", "utf8"));
  await initCurves();
  const electionIdBytes = electionId32(f.electionId);
  let ok = true;
  for (const s of f.shares) {
    const pk = g2FromHex(f.committeePKs[s.keyperIndex]);
    for (let j = 0; j < f.numCandidates; j++) {
      const ct    = { c1: g2FromHex(f.aggregate[j].c1), c2: g2FromHex(f.aggregate[j].c2) };
      const share = { keyperIndex: s.keyperIndex + 1, sigma: g2FromHex(s.shares[j]),
                      proof: { e: BigInt(s.proofs[j].e), z: BigInt(s.proofs[j].z) } };
      const valid = verifyDecryptionShare(ct, share, pk, decryptTranscript(electionIdBytes, j));
      if (!valid) ok = false;
      console.log(\`Keyper \${s.keyperIndex}, candidate \${j}: \${valid ? "✓ valid" : "✗ invalid"}\`);
    }
  }
  console.log(ok ? "\\n✓ All shares verified" : "\\n✗ Invalid shares detected");
  process.exit(ok ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(2); });`;

  // ── Step 5: verify-result.js ──────────────────────────────────────────────
  // Only written/run when result-fixture.json exists.
  const verifyResultScript = `\
// verify-result.js  —  Lagrange-combines shares to decrypt the tally and checks it matches on-chain.
const { initCurves, G2Point, Transcript, verifyDecryptionShare,
        combineShares, buildBabyStepTable, recoverDiscreteLogWithTable } = require("${SDK}");
const { readFileSync } = require("node:fs");
const fromHex   = (h) => Uint8Array.from(Buffer.from(String(h).replace(/^0x/, ""), "hex"));
const g2FromHex = (h) => G2Point.fromBytes(fromHex(h));
const electionId32 = (id) => fromHex(BigInt(id).toString(16).padStart(64, "0"));
const decryptTranscript = (electionIdBytes, j) => {
  const t = new Transcript("SHUTTER-VOTE-DECRYPT-v1");
  t.append("electionId", electionIdBytes);
  t.append("candidate", new Uint8Array([(j >> 8) & 255, j & 255]));
  return t;
};
async function main() {
  const f = JSON.parse(readFileSync("result-fixture.json", "utf8"));
  const threshold = Number(f.thresholdT);
  await initCurves();
  const electionIdBytes = electionId32(f.electionId);
  const babyStepTable   = buildBabyStepTable(BigInt(f.totalBallots) * BigInt(f.budget));
  const totals = [];
  for (let j = 0; j < f.numCandidates; j++) {
    const ct = { c1: g2FromHex(f.aggregate[j].c1), c2: g2FromHex(f.aggregate[j].c2) };
    const valid = [];
    for (const s of f.shares) {
      const share = { keyperIndex: s.keyperIndex + 1, sigma: g2FromHex(s.shares[j]),
                      proof: { e: BigInt(s.proofs[j].e), z: BigInt(s.proofs[j].z) } };
      if (verifyDecryptionShare(ct, share, g2FromHex(f.committeePKs[s.keyperIndex]), decryptTranscript(electionIdBytes, j)))
        valid.push(share);
      if (valid.length >= threshold) break;
    }
    if (valid.length < threshold)
      throw new Error(\`Candidate \${j}: only \${valid.length} valid shares (need \${threshold})\`);
    totals.push(recoverDiscreteLogWithTable(
      combineShares(valid, valid.map(sh => BigInt(sh.keyperIndex)), ct),
      babyStepTable,
    ));
  }
  let ok = true;
  for (let j = 0; j < f.numCandidates; j++) {
    const pub = BigInt(f.tally[j]), match = totals[j] === pub;
    if (!match) ok = false;
    console.log(\`Candidate \${j}: \${totals[j]} votes \${match ? "✓" : \`✗ published=\${pub}\`}\`);
  }
  console.log(ok ? "\\n✓ Tally verified" : "\\n✗ Tally mismatch");
  process.exit(ok ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(2); });`;

  // ── Skill markdown ─────────────────────────────────────────────────────────
  return `\
# Verify Election: Personalrat München

You are an AI agent with full shell access. Execute every step in order
and report a final verdict at the end.

**Important:** The election may not have completed all phases yet.
Step 1 detects which artifacts are currently on-chain and only writes
fixture files for what exists. Steps 3–5 skip automatically if their
fixture file is absent — this is not an error.

## Election details

| Field | Value |
|---|---|
| Contract | \`${p.electionAddress}\` |
| RPC | \`${p.rpcUrl}\` |
| Election ID | ${p.electionId} |
| Candidates | ${p.numCandidates} |
| Budget per voter | ${p.budget} point(s) |
| Threshold | ${p.thresholdT} of ${p.thresholdN} keypers |

---

## Setup

\`\`\`bash
rm -rf verify-election && mkdir verify-election && cd verify-election && npm init -y && npm install ethers@6.15.0 ${SDK} viem
\`\`\`

---

## Step 1 — Fetch available data from the blockchain

Fetches ballots (always available), then probes for aggregate,
decryption shares, and result — only writing fixtures for what exists.

\`\`\`js
${fetchScript}
\`\`\`

\`\`\`bash
cd verify-election && node fetch-data.mjs
\`\`\`

**Expected output varies by election phase:**
- Voting in progress: \`✓ ballot-fixture.json\` only
- Voting ended: \`✓ ballot-fixture.json\` + \`✓ aggregate-fixture.json\`
- Fully complete: all four fixture files

---

## Step 2 — Verify all ballots

Always runs. Checks ZK range proofs, WR eligibility attestation,
voter Schnorr signature, and field decoding for every accepted ballot.

\`\`\`js
${verifyBallotsScript}
\`\`\`

\`\`\`bash
cd verify-election && node verify-ballots.js
\`\`\`

**Expected:** \`✓ All N ballots valid\`
Exit 0 = all valid · Exit 1 = at least one invalid

---

## Step 3 — Verify homomorphic aggregate

**Only do this step if \`verify-election/aggregate-fixture.json\` exists.**
If the file is absent, skip this step entirely — do not create the script.

Filters to locally-valid ballots, recomputes the homomorphic sum, and
confirms it matches on-chain byte-for-byte.

\`\`\`js
${verifyAggregateScript}
\`\`\`

\`\`\`bash
cd verify-election && node verify-aggregate.js
\`\`\`

**Expected:** \`✓ Aggregate verified\`
Exit 0 = verified · Exit 1 = mismatch

---

## Step 4 — Verify decryption shares

**Only do this step if \`verify-election/shares-fixture.json\` exists.**
If the file is absent, skip this step entirely — do not create the script.

Checks the DLEQ proof for every keyper share against their committee
public key. Confirms no share is fabricated or corrupt.

\`\`\`js
${verifySharesScript}
\`\`\`

\`\`\`bash
cd verify-election && node verify-shares.js
\`\`\`

**Expected:** \`✓ All shares verified\`
Exit 0 = all valid · Exit 1 = invalid share found

---

## Step 5 — Verify final tally

**Only do this step if \`verify-election/result-fixture.json\` exists.**
If the file is absent, skip this step entirely — do not create the script.

Lagrange-combines the verified shares to independently decrypt the
aggregate and confirms the vote counts match on-chain.

\`\`\`js
${verifyResultScript}
\`\`\`

\`\`\`bash
cd verify-election && node verify-result.js
\`\`\`

**Expected:** \`✓ Tally verified\`
Exit 0 = verified · Exit 1 = mismatch or insufficient shares

---

## Final verdict

After all steps complete, report the election phase and what was verified:

- If only ballots were available: **"✓ Ballot verification passed (voting still in progress)"**
- If ballots + aggregate: **"✓ Ballot and aggregate verification passed (decryption pending)"**
- If all four: **"✓ Election fully verified — all cryptographic stages pass independently"**

If any step exited with code 1, report which step failed,
the error output, and the exit code.
`;
}
