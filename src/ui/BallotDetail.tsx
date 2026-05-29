import { Hex } from "./Hex";
import type { Ballot } from "../eth/types";

type VerifyState =
  | { status: "idle" }
  | { status: "verifying"; token: number }
  | { status: "ok"; token: number }
  | { status: "bad"; reason: string; token: number };

function hexBytesLen(hex: string): number {
  if (!hex || hex === "0x") return 0;
  if (!hex.startsWith("0x")) return 0;
  return Math.max(0, (hex.length - 2) / 2);
}

function StatusIcon({ type }: { type: "ok" | "bad" | "checking" | "idle" }) {
  if (type === "ok") {
    return (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
        <circle cx="11" cy="11" r="11" fill="#15803d" />
        <path d="M6 11.5l3.5 3.5 6.5-7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (type === "bad") {
    return (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
        <circle cx="11" cy="11" r="11" fill="#b91c1c" />
        <path d="M7 7l8 8M15 7l-8 8" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === "checking") {
    return (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden className="bdSpinner">
        <circle cx="11" cy="11" r="9" stroke="#a16207" strokeWidth="2.5" strokeDasharray="40 20" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="9" stroke="#9ca3af" strokeWidth="2" />
    </svg>
  );
}

type Props = {
  ballot: Ballot;
  globalIndex: number;
  verifyState: VerifyState;
  onBack: () => void;
  onVerifyLocally: () => void;
};

export function BallotDetail({ ballot, globalIndex, verifyState, onBack, onVerifyLocally }: Props) {
  const vs = verifyState.status;
  const iconType = vs === "ok" ? "ok" : vs === "bad" ? "bad" : vs === "verifying" ? "checking" : "idle";

  return (
    <div className="bdContainer">
      <button type="button" className="bdBack" onClick={onBack}>
        ← Back to ballots
      </button>

      <div className="bdBallotLabel">BALLOT</div>
      <h2 className="bdBallotIndex">Index {globalIndex}</h2>

      <div className="bdPseudonymRow mono">
        <span className="dim">pseudonym</span>
        <Hex value={ballot.pseudonym} trim={20} />
      </div>

      {/* Status card */}
      <div className={`bdStatusCard bdStatusCard--${iconType}`}>
        <div className="bdStatusIcon">
          <StatusIcon type={iconType} />
        </div>
        <div className="bdStatusBody">
          {vs === "ok" && (
            <>
              <div className="bdStatusTitle">VALID</div>
              <div className="bdStatusDesc">
                All cryptographic checks passed — WR attestation, ZK proofs, voter signature, field decoding.
              </div>
            </>
          )}
          {vs === "bad" && (
            <>
              <div className="bdStatusTitle">INVALID</div>
              <div className="bdStatusDesc">
                {(verifyState as Extract<VerifyState, { status: "bad" }>).reason}
              </div>
            </>
          )}
          {vs === "verifying" && (
            <>
              <div className="bdStatusTitle">Verifying…</div>
              <div className="bdStatusDesc">Running cryptographic checks in the background.</div>
            </>
          )}
          {vs === "idle" && (
            <>
              <div className="bdStatusTitle">Pending</div>
              <div className="bdStatusDesc">Verification will run automatically.</div>
            </>
          )}
        </div>
      </div>

      {/* Details section */}
      <div className="bdSection">
        <div className="bdSectionLabel">DETAILS</div>
        <div className="bdGrid mono">
          <div className="dim">vk</div>
          <div>
            <Hex value={ballot.vk} trim={26} />{" "}
            <span className="dim">({hexBytesLen(ballot.vk)} bytes)</span>
          </div>

          <div className="dim">ciphertexts</div>
          <div>
            {ballot.ciphertexts.map((ct, j) => (
              <div key={j} className="bdCiphertext">
                <div className="dim bdCandidateLabel">candidate {j}</div>
                <div className="bdCipherRow">
                  <span className="dim">c1</span>
                  <Hex value={ct.c1} trim={20} />
                </div>
                <div className="bdCipherRow">
                  <span className="dim">c2</span>
                  <Hex value={ct.c2} trim={20} />
                </div>
              </div>
            ))}
          </div>

          <div className="dim">zkProof</div>
          <div>
            <Hex value={ballot.zkProof} trim={26} />
          </div>

          <div className="dim">voterSignature</div>
          <div>
            <Hex value={ballot.voterSignature} trim={26} />
          </div>

          <div className="dim">wrAttestation</div>
          <div>
            <Hex value={ballot.wrAttestation} trim={26} />
          </div>
        </div>
      </div>

      {/* Verify yourself section */}
      <div className="verifyYourselfSection">
        <div className="verifyYourselfLabel">VERIFY YOURSELF</div>
          <p className="verifyYourselfDesc">
            Don't trust this panel — re-run the same cryptographic check yourself, against this stage's on-chain data, on your own machine.
          </p>
          <button type="button" className="verifyYourselfBtn" onClick={onVerifyLocally}>
            Open manual verification guide →
          </button>
      </div>
    </div>
  );
}
