import type { EncryptedTally } from "../eth/types";
import { CodeBlock } from "./CodeBlock";

const SDK_PACKAGE = "@shutter-network/urban-verified-crypto";

type Props = {
  aggregate: EncryptedTally;
  onDownloadFixture: () => Promise<void>;
  downloading: boolean;
};

export function VerifyAggregatePanel({ aggregate, onDownloadFixture, downloading }: Props) {
  const fixtureFilename = "aggregate-fixture.json";
  const scriptName = "verify-aggregate.js";

  const installCmd = `npm install ${SDK_PACKAGE}`;

  const scriptCode = [
    `const { initCurves, G2Point, sumCts } = require("${SDK_PACKAGE}");`,
    `const { readFileSync } = require("node:fs");`,
    `const fromHex = (h) => Uint8Array.from(Buffer.from(String(h).replace(/^0x/, ""), "hex"));`,
    `const g2FromHex = (h) => G2Point.fromBytes(fromHex(h));`,
    `async function main() {`,
    `  const f = JSON.parse(readFileSync("${fixtureFilename}", "utf8"));`,
    `  await initCurves();`,
    `  let ok = true;`,
    `  for (let j = 0; j < f.numCandidates; j++) {`,
    `    const sum = sumCts(f.ballots.map((b) => ({ c1: g2FromHex(b.ciphertexts[j].c1), c2: g2FromHex(b.ciphertexts[j].c2) })));`,
    `    const pub = { c1: g2FromHex(f.aggregate[j].c1), c2: g2FromHex(f.aggregate[j].c2) };`,
    `    const match = sum.c1.equals(pub.c1) && sum.c2.equals(pub.c2);`,
    `    if (!match) ok = false;`,
    `    console.log(\`Candidate \${j}: \${match ? "✓ match" : "✗ mismatch"}\`);`,
    `  }`,
    `  console.log(ok ? "\\n✓ Aggregate verified" : "\\n✗ Aggregate mismatch");`,
    `  process.exit(ok ? 0 : 1);`,
    `}`,
    `main().catch((e) => { console.error(e); process.exit(2); });`,
  ].join("\n");

  const candidateLines = aggregate.aggregates
    .map((_, j) => `Candidate ${j}: ✓ match`)
    .join("\n");
  const expectedOutput = `${candidateLines}\n\n✓ Aggregate verified`;

  return (
    <div className="vpInline" role="region" aria-label="Aggregate verification guide">
      <div className="vpInlineHdr">
        <div>
          <div className="vpHeaderLabel">Reproduce the homomorphic sum</div>
          <div className="vpHeaderSub">{aggregate.aggregates.length} candidate ciphertexts</div>
        </div>
      </div>

      <div className="vpBody">
        <p className="vpIntro">
          Confirm that the on-chain aggregate is exactly the homomorphic sum of every accepted ballot —
          no ballot added twice, none omitted.
        </p>

        <div className="vpStep">
          <div className="vpStepNum">1</div>
          <div className="vpStepContent">
            <div className="vpStepTitle">Download the aggregate fixture</div>
            <p className="vpStepDesc">
              Contains every accepted ballot's ciphertext points and the published on-chain aggregate.
              All ballots are fetched from the chain — may take a moment.
            </p>
            <button
              type="button"
              className="vpDownloadBtn"
              onClick={() => void onDownloadFixture()}
              disabled={downloading}
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M6.5 1v8M3 6l3.5 3.5L10 6" />
                <path d="M1 11h11" />
              </svg>
              {downloading ? "Fetching all ballots…" : fixtureFilename}
            </button>
          </div>
        </div>

        <div className="vpStep">
          <div className="vpStepNum">2</div>
          <div className="vpStepContent">
            <div className="vpStepTitle">Install the Shutter crypto SDK</div>
            <CodeBlock>{installCmd}</CodeBlock>
          </div>
        </div>

        <div className="vpStep">
          <div className="vpStepNum">3</div>
          <div className="vpStepContent">
            <div className="vpStepTitle">Write and run the verification script</div>
            <p className="vpStepDesc">
              Save as <span className="mono">{scriptName}</span> next to the fixture, then run:
            </p>
            <CodeBlock>{scriptCode}</CodeBlock>
            <CodeBlock>{`node ${scriptName}`}</CodeBlock>
            <div className="vpExpectedLabel">Expected output</div>
            <pre className="vpExpectedOutput">{expectedOutput}</pre>
            <p className="vpStepDesc" style={{ marginTop: 8 }}>
              Exit code 0 = aggregate matches. Exit code 1 = mismatch detected.
            </p>
          </div>
        </div>

        <div className="vpSection">
          <div className="vpSectionLabel">WHAT'S BEING CHECKED</div>
          <div className="vpCheckList">
            <div className="vpCheckItem">
              <div className="vpCheckName">Homomorphic sum</div>
              <div className="vpCheckDesc">
                Each ballot ciphertext (c1, c2) is a BLS12-381 G2 point. Point-adding all per-candidate
                c1s gives the aggregate c1; same for c2. The result must equal the on-chain aggregate byte-for-byte.
              </div>
            </div>
            <div className="vpCheckItem">
              <div className="vpCheckName">Only accepted ballots counted</div>
              <div className="vpCheckDesc">
                The fixture includes only ballots whose ZK proofs passed on-chain.
                Any ballot rejected at submission is excluded from the sum.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
