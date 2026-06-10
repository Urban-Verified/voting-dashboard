import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { StageLifecycle } from "./stageLifecycle";
import type { DecryptionShare } from "../eth/types";

type Tab = "overview" | "dkg" | "ballots" | "aggregate" | "shares" | "result";

// ── Animated primitives ────────────────────────────────────────────────────

export function AnimatedCheck({ size = 20, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 13l4 4L19 7"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="easyCheckPath"
      />
    </svg>
  );
}

function PulsingDot() {
  return <span className="easyPulsingDot" aria-hidden />;
}

export function useCountUp(target: number, duration = 1100): number {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (target === 0) { setVal(0); return; }
    let startTs = 0;
    let rafId = 0;
    function step(ts: number) {
      if (!startTs) startTs = ts;
      const t = Math.min((ts - startTs) / duration, 1);
      const eased = 1 - (1 - t) ** 3;
      setVal(Math.round(eased * target));
      if (t < 1) { rafId = requestAnimationFrame(step); }
      else { setVal(target); }
    }
    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [target, duration]);
  return val;
}

// ── Stage icons ────────────────────────────────────────────────────────────

function IconShield() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function IconEnvelope() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M2 7l10 7 10-7" />
    </svg>
  );
}

function IconLock() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function IconKey() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="7.5" cy="15.5" r="5.5" />
      <path d="M21 2l-9.6 9.6M15.5 7.5l3 3" />
    </svg>
  );
}

function IconAward() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="8" r="6" />
      <path d="M8.21 13.89L7 23l5-3 5 3-1.21-9.11" />
    </svg>
  );
}

export function getStageIcon(num: number) {
  switch (num) {
    case 1: return <IconShield />;
    case 2: return <IconEnvelope />;
    case 3: return <IconLock />;
    case 4: return <IconKey />;
    case 5: return <IconAward />;
    default: return null;
  }
}

// ── EasyJourney ────────────────────────────────────────────────────────────

export type JourneyStage = {
  num: number;
  tab: Tab;
  title: string;
  statusLine: string;
  detail?: string;
  lifecycle: StageLifecycle;
  icon: React.ReactNode;
};

export function EasyJourney({ stages, onNavigate }: { stages: JourneyStage[]; onNavigate: (tab: Tab) => void }) {
  return (
    <div className="easyJourney">
      {stages.map((s, i) => (
        <div
          key={s.num}
          className={`easyJourneyStep easyJourneyStep--${s.lifecycle}`}
          role="button"
          tabIndex={0}
          onClick={() => onNavigate(s.tab)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onNavigate(s.tab); } }}
        >
          <div className="easyJourneyTrack">
            <div className={`easyJourneyCircle easyJourneyCircle--${s.lifecycle}`}>
              {s.lifecycle === "done"
                ? <AnimatedCheck size={18} color="#fff" />
                : s.lifecycle === "in_progress"
                ? <PulsingDot />
                : <span className="easyJourneyNum">{s.num}</span>}
            </div>
            {i < stages.length - 1 && (
              <div className={`easyJourneyLine easyJourneyLine--${s.lifecycle === "done" ? "done" : "pending"}`} />
            )}
          </div>
          <div className="easyJourneyContent">
            <div className={`easyJourneyIcon easyJourneyIcon--${s.lifecycle}`}>{s.icon}</div>
            <div className="easyJourneyText">
              <div className="easyJourneyTitle">{s.title}</div>
              <div className={`easyJourneyStatus easyJourneyStatus--${s.lifecycle}`}>{s.statusLine}</div>
              {s.detail && <div className="easyJourneyDetail">{s.detail}</div>}
            </div>
            <div className="easyJourneyArrow">›</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Phase animations ───────────────────────────────────────────────────────

/** Phase 1: Guardians send key shares to a central lock */
export function PhaseAnim1() {
  return (
    <div className="phaseAnimWrap">
      <svg className="phaseAnimSvg" viewBox="0 0 200 130" aria-hidden>
        {/* Dashed lines from each guardian to center lock */}
        <line x1="100" y1="28" x2="100" y2="64" stroke="var(--accent)" strokeWidth="1" strokeDasharray="3 3" opacity="0.3" />
        <line x1="46"  y1="108" x2="93"  y2="72" stroke="var(--accent)" strokeWidth="1" strokeDasharray="3 3" opacity="0.3" />
        <line x1="154" y1="108" x2="107" y2="72" stroke="var(--accent)" strokeWidth="1" strokeDasharray="3 3" opacity="0.3" />

        {/* Guardian nodes */}
        <circle cx="100" cy="17" r="13" fill="rgba(0,68,164,0.09)" stroke="var(--accent)" strokeWidth="1.5" />
        <text x="100" y="21.5" textAnchor="middle" fontSize="8" fill="var(--accent)" fontWeight="700">G1</text>
        <circle cx="44"  cy="115" r="13" fill="rgba(0,68,164,0.09)" stroke="var(--accent)" strokeWidth="1.5" />
        <text x="44"  y="119.5" textAnchor="middle" fontSize="8" fill="var(--accent)" fontWeight="700">G2</text>
        <circle cx="156" cy="115" r="13" fill="rgba(0,68,164,0.09)" stroke="var(--accent)" strokeWidth="1.5" />
        <text x="156" y="119.5" textAnchor="middle" fontSize="8" fill="var(--accent)" fontWeight="700">G3</text>

        {/* All 3 dots fire simultaneously, arrive at center at 70%, visible throughout */}
        <circle r="5" fill="var(--accent)" opacity="0">
          <animateTransform attributeName="transform" type="translate" values="100,17; 100,68; 100,68" keyTimes="0;0.7;1" dur="2s" begin="0s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;1;1;0;0" keyTimes="0;0.04;0.72;0.84;1" dur="2s" begin="0s" repeatCount="indefinite" />
        </circle>
        <circle r="5" fill="var(--accent)" opacity="0">
          <animateTransform attributeName="transform" type="translate" values="44,115; 100,68; 100,68" keyTimes="0;0.7;1" dur="2s" begin="0s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;1;1;0;0" keyTimes="0;0.04;0.72;0.84;1" dur="2s" begin="0s" repeatCount="indefinite" />
        </circle>
        <circle r="5" fill="var(--accent)" opacity="0">
          <animateTransform attributeName="transform" type="translate" values="156,115; 100,68; 100,68" keyTimes="0;0.7;1" dur="2s" begin="0s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;1;1;0;0" keyTimes="0;0.04;0.72;0.84;1" dur="2s" begin="0s" repeatCount="indefinite" />
        </circle>

        {/* Lock emerges from the collision point as dots fade */}
        <g opacity="0">
          <animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;0.7;0.78;0.92;1" dur="2s" begin="0s" repeatCount="indefinite" />
          <rect x="88" y="68" width="24" height="19" rx="3" fill="rgba(0,68,164,0.12)" stroke="var(--accent)" strokeWidth="2" />
          <path d="M94 68 v-6 a6 6 0 0 1 12 0 v6" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
          <circle cx="100" cy="77.5" r="2.5" fill="var(--accent)" />
        </g>

        {/* Glow ring expands after lock appears */}
        <circle cx="100" cy="77.5" fill="none" stroke="var(--accent)" strokeWidth="1.5" r="0" opacity="0">
          <animate attributeName="r"       values="0;0;13;28;0"  keyTimes="0;0.8;0.86;0.96;1" dur="2s" begin="0s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;0;0.7;0;0"  keyTimes="0;0.8;0.86;0.96;1" dur="2s" begin="0s" repeatCount="indefinite" />
        </circle>
      </svg>
    </div>
  );
}

/** Phase 2: Ballot paper falls into envelope → flap seals → lock snaps shut
 *  Cycle: 4s total
 *    0.0 – 1.8s : ballot paper (with checkmark) falls from above into the open envelope
 *    1.5 – 2.3s : flap closes over the ballot
 *    1.6 – 2.3s : ballot fades as flap seals over it
 *    2.3 – 2.9s : padlock slides down and snaps shut on the closed flap
 *    2.9 – 3.7s : sealed & locked envelope glows green
 *    3.7 – 4.0s : fade out, reset
 */
export function PhaseAnim2() {
  return (
    <div className="phaseAnimWrap">
      <svg className="phaseAnimSvg" viewBox="0 0 200 130" aria-hidden>
        {/* Envelope body */}
        <rect x="40" y="50" width="120" height="74" rx="5" fill="rgba(0,68,164,0.07)" stroke="var(--accent)" strokeWidth="1.8" />
        {/* Inner V and corner diagonals */}
        <path d="M40,59 L100,90 L160,59"  fill="none" stroke="var(--accent)" strokeWidth="1.1" strokeLinecap="round" opacity="0.25" />
        <path d="M40,124 L100,90"  fill="none" stroke="var(--accent)" strokeWidth="0.9" opacity="0.15" />
        <path d="M160,124 L100,90" fill="none" stroke="var(--accent)" strokeWidth="0.9" opacity="0.15" />

        {/* Ballot paper: falls from above, drawn before flap so flap closes over it */}
        <g opacity="0">
          <animate attributeName="opacity"
            values="0;1;1;1;0;0" keyTimes="0;0.04;0.36;0.44;0.56;1" dur="4s" begin="0s" repeatCount="indefinite" />
          <animateTransform attributeName="transform" type="translate"
            values="0,0; 0,0; 0,46; 0,46" keyTimes="0;0.04;0.5;1" dur="4s" begin="0s" repeatCount="indefinite" />
          {/* Paper body */}
          <rect x="80" y="4" width="40" height="44" rx="2" fill="#fff" stroke="var(--accent)" strokeWidth="1.5" />
          {/* Ruled lines (looks like a ballot) */}
          <line x1="87" y1="14" x2="113" y2="14" stroke="var(--accent)" strokeWidth="1" opacity="0.25" />
          <line x1="87" y1="20" x2="113" y2="20" stroke="var(--accent)" strokeWidth="1" opacity="0.25" />
          {/* Checkbox */}
          <rect x="87" y="28" width="11" height="11" rx="1.5" fill="none" stroke="var(--accent)" strokeWidth="1.4" />
          {/* Checkmark inside */}
          <path d="M89,33 l3.5,3.5 l5.5,-6.5" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </g>

        {/* Flap: open tent → flat closed (drawn AFTER ballot so it seals over it) */}
        <path fill="rgba(0,68,164,0.14)" stroke="var(--accent)" strokeWidth="1.5" strokeLinejoin="round">
          <animate attributeName="d"
            values="M40,50 L100,10 L160,50 Z;M40,50 L100,10 L160,50 Z;M40,50 L100,50 L160,50 Z;M40,50 L100,50 L160,50 Z;M40,50 L100,10 L160,50 Z"
            keyTimes="0;0.36;0.56;0.9;1" dur="4s" repeatCount="indefinite" />
        </path>

        {/* Padlock slides down and snaps onto the sealed flap */}
        <g opacity="0">
          <animate attributeName="opacity"
            values="0;0;1;1;0" keyTimes="0;0.58;0.68;0.9;1" dur="4s" begin="0s" repeatCount="indefinite" />
          <animateTransform attributeName="transform" type="translate"
            values="0,-38;0,-38;0,0;0,0;0,-38" keyTimes="0;0.58;0.68;0.9;1" dur="4s" begin="0s" repeatCount="indefinite" />
          <rect x="87" y="77" width="26" height="20" rx="3" fill="rgba(22,163,74,0.16)" stroke="var(--green)" strokeWidth="2" />
          <path d="M92 77 v-8 a8 8 0 0 1 16 0 v8" fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" />
          <circle cx="100" cy="87" r="3" fill="var(--green)" />
        </g>

        {/* Green glow: sealed and encrypted */}
        <circle cx="100" cy="87" fill="none" stroke="var(--green)" strokeWidth="1.5" r="0" opacity="0">
          <animate attributeName="r"       values="0;0;16;38;0"  keyTimes="0;0.68;0.74;0.9;1" dur="4s" begin="0s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;0;0.55;0;0" keyTimes="0;0.68;0.74;0.9;1" dur="4s" begin="0s" repeatCount="indefinite" />
        </circle>
      </svg>
    </div>
  );
}

/** Phase 3: 4 sealed envelopes converge from the corners → merge into one sealed aggregate
 *  Cycle: 4s total
 *    0.0 – 2.1s : 4 envelopes fly inward (staggered 0.2s apart, each 1.5s flight)
 *    2.0 – 2.6s : merge flash at center
 *    2.1 – 3.8s : merged aggregate (larger sealed envelope) glows at center
 *    3.8 – 4.0s : fade out, reset
 */
export function PhaseAnim3() {
  // Each small envelope: rect 22×14, with a tiny lock icon
  // Corners: TL(30,20) TR(170,20) BL(30,110) BR(170,110) → all translate to center(100,65)
  // dur=4s so each fires exactly once per cycle; stagger maintained via begin offset
  const SmallEnvelope = ({ x, y }: { x: number; y: number }) => (
    <>
      <rect x={x} y={y} width="22" height="14" rx="2"
        fill="rgba(0,68,164,0.1)" stroke="var(--accent)" strokeWidth="1.4" />
      <path d={`M${x},${y+3} L${x+11},${y+9} L${x+22},${y+3}`}
        fill="none" stroke="var(--accent)" strokeWidth="0.9" strokeLinecap="round" opacity="0.5" />
      {/* Tiny lock */}
      <rect x={x+6} y={y+4} width="10" height="7" rx="1"
        fill="rgba(22,163,74,0.15)" stroke="var(--green)" strokeWidth="1.1" />
      <path d={`M${x+8},${y+4} v-3 a3,3,0,0,1,6,0 v3`}
        fill="none" stroke="var(--green)" strokeWidth="1.1" strokeLinecap="round" />
    </>
  );

  return (
    <div className="phaseAnimWrap">
      <svg className="phaseAnimSvg" viewBox="0 0 200 130" aria-hidden>
        {/* Guide lines from corners to center */}
        <line x1="30"  y1="20"  x2="88"  y2="60" stroke="var(--accent)" strokeWidth="1" strokeDasharray="3 3" opacity="0.2" />
        <line x1="170" y1="20"  x2="112" y2="60" stroke="var(--accent)" strokeWidth="1" strokeDasharray="3 3" opacity="0.2" />
        <line x1="30"  y1="110" x2="88"  y2="72" stroke="var(--accent)" strokeWidth="1" strokeDasharray="3 3" opacity="0.2" />
        <line x1="170" y1="110" x2="112" y2="72" stroke="var(--accent)" strokeWidth="1" strokeDasharray="3 3" opacity="0.2" />

        {/* Top-left (30,20) → center: translate +70,+45 */}
        <g>
          <animateTransform attributeName="transform" type="translate"
            values="0,0; 70,45; 70,45" keyTimes="0;0.375;1" dur="4s" begin="0s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="1;1;0;0" keyTimes="0;0.28;0.375;1" dur="4s" begin="0s" repeatCount="indefinite" />
          <SmallEnvelope x={19} y={13} />
        </g>

        {/* Top-right (170,20) → center: translate -70,+45 */}
        <g>
          <animateTransform attributeName="transform" type="translate"
            values="0,0; -70,45; -70,45" keyTimes="0;0.375;1" dur="4s" begin="0.2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="1;1;0;0" keyTimes="0;0.28;0.375;1" dur="4s" begin="0.2s" repeatCount="indefinite" />
          <SmallEnvelope x={159} y={13} />
        </g>

        {/* Bottom-left (30,110) → center: translate +70,-45 */}
        <g>
          <animateTransform attributeName="transform" type="translate"
            values="0,0; 70,-45; 70,-45" keyTimes="0;0.375;1" dur="4s" begin="0.4s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="1;1;0;0" keyTimes="0;0.28;0.375;1" dur="4s" begin="0.4s" repeatCount="indefinite" />
          <SmallEnvelope x={19} y={103} />
        </g>

        {/* Bottom-right (170,110) → center: translate -70,-45 */}
        <g>
          <animateTransform attributeName="transform" type="translate"
            values="0,0; -70,-45; -70,-45" keyTimes="0;0.375;1" dur="4s" begin="0.6s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="1;1;0;0" keyTimes="0;0.28;0.375;1" dur="4s" begin="0.6s" repeatCount="indefinite" />
          <SmallEnvelope x={159} y={103} />
        </g>

        {/* Merge flash at center (t≈2.0–2.5s) */}
        <circle cx="100" cy="65" r="0" fill="rgba(0,68,164,0.2)" opacity="0">
          <animate attributeName="r"       values="0;0;24;0;0"   keyTimes="0;0.5;0.56;0.66;1" dur="4s" begin="0s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;0;0.65;0;0" keyTimes="0;0.5;0.56;0.66;1" dur="4s" begin="0s" repeatCount="indefinite" />
        </circle>

        {/* Merged sealed aggregate — larger envelope + lock, visible t=2.1–3.8s */}
        <g opacity="0">
          <animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;0.525;0.6;0.9;1" dur="4s" begin="0s" repeatCount="indefinite" />
          <rect x="72" y="53" width="56" height="34" rx="4"
            fill="rgba(0,68,164,0.09)" stroke="var(--accent)" strokeWidth="1.9" />
          <path d="M72,61 L100,74 L128,61"
            fill="none" stroke="var(--accent)" strokeWidth="1.2" strokeLinecap="round" opacity="0.4" />
          {/* Lock on aggregate */}
          <rect x="88" y="60" width="24" height="16" rx="2"
            fill="rgba(22,163,74,0.18)" stroke="var(--green)" strokeWidth="1.8" />
          <path d="M92,60 v-6 a8,8,0,0,1,16,0 v6"
            fill="none" stroke="var(--green)" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="100" cy="68" r="2.5" fill="var(--green)" />
        </g>

        {/* Glow ring on merged aggregate (independent opacity, t≈2.1–3.8s) */}
        <circle cx="100" cy="68" fill="none" stroke="var(--green)" strokeWidth="1.4" r="0" opacity="0">
          <animate attributeName="r"       values="0;0;12;30;0"    keyTimes="0;0.525;0.575;0.9;1" dur="4s" begin="0s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;0;0.65;0;0"   keyTimes="0;0.525;0.575;0.9;1" dur="4s" begin="0s" repeatCount="indefinite" />
        </circle>
      </svg>
    </div>
  );
}

/** Phase 4: Key fragments fly in from guardians, lock opens */
export function PhaseAnim4() {
  return (
    <div className="phaseAnimWrap">
      <svg className="phaseAnimSvg" viewBox="0 0 200 130" aria-hidden>
        {/* Guide lines: fragments → combine point (100,50); combine point → lock */}
        <line x1="30"  y1="22" x2="94"  y2="47" stroke="var(--accent)" strokeWidth="1" strokeDasharray="3 3" opacity="0.25" />
        <line x1="100" y1="8"  x2="100" y2="42" stroke="var(--accent)" strokeWidth="1" strokeDasharray="3 3" opacity="0.25" />
        <line x1="170" y1="22" x2="106" y2="47" stroke="var(--accent)" strokeWidth="1" strokeDasharray="3 3" opacity="0.25" />
        <line x1="100" y1="58" x2="100" y2="88" stroke="var(--accent)" strokeWidth="1" strokeDasharray="3 3" opacity="0.25" />

        {/* Fragment 1 — top-left (30,22) → center (100,52): translate +70,+30 */}
        <g>
          <animateTransform attributeName="transform" type="translate"
            values="0,0; 70,30; 70,30"
            keyTimes="0;0.289;1"
            dur="4.5s" begin="0s" repeatCount="indefinite" />
          <animate attributeName="opacity"
            values="1;1;0;0" keyTimes="0;0.211;0.289;1"
            dur="4.5s" begin="0s" repeatCount="indefinite" />
          <circle cx="30" cy="22" r="12" fill="rgba(0,68,164,0.09)" stroke="var(--accent)" strokeWidth="1.5" />
          <circle cx="27" cy="22" r="4" fill="none" stroke="var(--accent)" strokeWidth="1.4" />
          <line x1="31" y1="22" x2="42" y2="22" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="39" y1="22" x2="39" y2="26" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="35" y1="22" x2="35" y2="25" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
        </g>

        {/* Fragment 2 — top-center (100,8) → center (100,52): translate 0,+44 */}
        <g>
          <animateTransform attributeName="transform" type="translate"
            values="0,0; 0,44; 0,44"
            keyTimes="0;0.289;1"
            dur="4.5s" begin="0.4s" repeatCount="indefinite" />
          <animate attributeName="opacity"
            values="1;1;0;0" keyTimes="0;0.211;0.289;1"
            dur="4.5s" begin="0.4s" repeatCount="indefinite" />
          <circle cx="100" cy="8" r="12" fill="rgba(0,68,164,0.09)" stroke="var(--accent)" strokeWidth="1.5" />
          <circle cx="97" cy="8" r="4" fill="none" stroke="var(--accent)" strokeWidth="1.4" />
          <line x1="101" y1="8" x2="112" y2="8" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="109" y1="8" x2="109" y2="12" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="105" y1="8" x2="105" y2="11" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
        </g>

        {/* Fragment 3 — top-right (170,22) → center (100,52): translate -70,+30 */}
        <g>
          <animateTransform attributeName="transform" type="translate"
            values="0,0; -70,30; -70,30"
            keyTimes="0;0.289;1"
            dur="4.5s" begin="0.8s" repeatCount="indefinite" />
          <animate attributeName="opacity"
            values="1;1;0;0" keyTimes="0;0.211;0.289;1"
            dur="4.5s" begin="0.8s" repeatCount="indefinite" />
          <circle cx="170" cy="22" r="12" fill="rgba(0,68,164,0.09)" stroke="var(--accent)" strokeWidth="1.5" />
          <circle cx="167" cy="22" r="4" fill="none" stroke="var(--accent)" strokeWidth="1.4" />
          <line x1="171" y1="22" x2="182" y2="22" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="179" y1="22" x2="179" y2="26" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="175" y1="22" x2="175" y2="25" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
        </g>

        {/* Merge flash at center (t=2.1–2.4s → keyTimes ≈ 0.467–0.533) */}
        <circle cx="100" cy="52" r="0" fill="rgba(0,68,164,0.22)" opacity="0">
          <animate attributeName="r"       values="0;0;20;0"      keyTimes="0;0.467;0.511;0.556" dur="4.5s" begin="0s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;0;0.7;0"     keyTimes="0;0.467;0.511;0.556" dur="4.5s" begin="0s" repeatCount="indefinite" />
        </circle>

        {/* Combined vertical key: appears at center (100,52), then slides down to lock (translate 0→0,38) */}
        {/* Visible t=2.2–2.9s; slides t=2.6–3.0s */}
        <g opacity="0">
          <animate attributeName="opacity"
            values="0;0;1;1;1;0;0"
            keyTimes="0;0.489;0.511;0.556;0.6;0.667;1"
            dur="4.5s" begin="0s" repeatCount="indefinite" />
          <animateTransform attributeName="transform" type="translate"
            values="0,0; 0,0; 0,0; 0,38; 0,38"
            keyTimes="0;0.511;0.578;0.667;1"
            dur="4.5s" begin="0s" repeatCount="indefinite" />
          {/* Vertical key: head-circle at top (100,44), shaft pointing down */}
          <circle cx="100" cy="44" r="9" fill="rgba(0,68,164,0.15)" stroke="var(--accent)" strokeWidth="2.2" />
          <circle cx="100" cy="44" r="3.5" fill="var(--accent)" opacity="0.5" />
          <line x1="100" y1="53" x2="100" y2="68" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="100" y1="64" x2="107" y2="64" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="100" y1="59" x2="106" y2="59" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" />
        </g>

        {/* Lock body (center ~y=101) */}
        <rect x="87" y="90" width="26" height="22" rx="3" fill="rgba(22,163,74,0.13)" stroke="var(--green)" strokeWidth="2" />
        <circle cx="100" cy="101" r="3" fill="var(--green)" />

        {/* Shackle: closed until key arrives (t=3.0s→0.667), then opens, resets at end */}
        <path fill="none" stroke="var(--green)" strokeWidth="2.2" strokeLinecap="round">
          <animate attributeName="d"
            values="M92,90 v-10 a8,8,0,0,1,16,0 v10;M92,90 v-10 a8,8,0,0,1,16,0 v10;M92,90 v-10 a8,8,0,0,1,16,0 v-7;M92,90 v-10 a8,8,0,0,1,16,0 v-7;M92,90 v-10 a8,8,0,0,1,16,0 v10"
            keyTimes="0;0.667;0.756;0.889;1"
            dur="4.5s" begin="0s" repeatCount="indefinite" />
        </path>

        {/* Green glow ring when lock opens (t=3.3s→0.733) */}
        <circle cx="100" cy="101" fill="none" stroke="var(--green)" strokeWidth="1.5" r="0" opacity="0">
          <animate attributeName="r"       values="0;0;12;28"     keyTimes="0;0.733;0.756;1" dur="4.5s" begin="0s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;0;0.65;0"    keyTimes="0;0.733;0.756;1" dur="4.5s" begin="0s" repeatCount="indefinite" />
        </circle>
      </svg>
    </div>
  );
}

// ── EasyDkgView ────────────────────────────────────────────────────────────

export function EasyDkgView({ thresholdT, thresholdN, isDKGFinalized }: { thresholdT: number; thresholdN: number; isDKGFinalized: boolean }) {
  const { t } = useTranslation();
  return (
    <div className="easyStageCard fadeUp">
      <div className={`easyStageCardIcon easyStageCardIcon--${isDKGFinalized ? "done" : "progress"}`}>
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          {isDKGFinalized && <path d="M9 12l2 2 4-4" strokeWidth="2.2" />}
        </svg>
      </div>
      <div className={`easyStageCardStatus${isDKGFinalized ? " easyStageCardStatus--ok" : ""}`}>
        {isDKGFinalized
          ? <>{t("Election lock is ready")}&nbsp;<AnimatedCheck size={16} color="var(--green)" /></>
          : t("Setting up the election lock…")}
      </div>
      <PhaseAnim1 />
      <p className="easyStageCardDesc">
        {t("Guardians work together to create the election lock.")}
        <br />
        <span>
          {t("{{t}} of {{n}} guardians must work together to unlock the result — no single person can do it alone.", { t: thresholdT, n: thresholdN })}
        </span>
      </p>
      <div className="easyGuardianRow">
        {Array.from({ length: thresholdN }, (_, i) => (
          <div key={i} className={`easyGuardianChip${isDKGFinalized ? " easyGuardianChip--active" : ""}`}>
            {isDKGFinalized && <AnimatedCheck size={11} color="#fff" />}
            <span>{t("Guardian {{n}}", { n: i + 1 })}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── EasyBallotsView ────────────────────────────────────────────────────────

type BallotSnap = { valid: number; invalid: number; checking: number };

export function EasyBallotsView({ total, valid, invalid, checking }: { total: number; valid: number; invalid: number; checking: number }) {
  const { t } = useTranslation();
  const displayCount = useCountUp(total);

  // Keep a ref to latest props so the interval closure is always fresh
  const latestRef = useRef<BallotSnap>({ valid, invalid, checking });
  latestRef.current = { valid, invalid, checking };

  // Displayed snapshot: null = show initial spinner, updated every 5 s
  const [snap, setSnap] = useState<BallotSnap | null>(null);

  // Every 5 seconds, push the latest counts into the displayed snapshot
  useEffect(() => {
    if (total === 0) return;
    const id = window.setInterval(() => {
      const { valid: v, invalid: i, checking: c } = latestRef.current;
      if (v + i + c > 0) setSnap({ valid: v, invalid: i, checking: c });
    }, 5000);
    return () => window.clearInterval(id);
  }, [total]);

  // When verification finishes (checking hits 0), show the final state immediately
  useEffect(() => {
    if (checking === 0 && valid + invalid > 0) {
      setSnap({ valid, invalid, checking: 0 });
    }
  }, [valid, invalid, checking]);

  return (
    <div className="easyStageCard fadeUp">
      <div className="easyBallotStat">
        <div className="easyBallotNumber">{displayCount.toLocaleString()}</div>
        <div className="easyBallotLabel">{t("votes received")}</div>
      </div>
      <div className="easyBallotChecks">
        {snap === null && total > 0 ? (
          <div className="easyBallotCheckRow easyBallotCheckRow--checking">
            <span className="easySpinner" />
            <span>{t("Checking all {{n}} votes…", { n: total })}</span>
          </div>
        ) : snap !== null ? (
          <>
            {snap.valid > 0 && (
              <div className="easyBallotCheckRow easyBallotCheckRow--ok">
                <AnimatedCheck size={15} color="var(--green)" />
                <span>{t("{{n}} checked and valid", { n: snap.valid })}</span>
              </div>
            )}
            {snap.checking > 0 && (
              <div className="easyBallotCheckRow easyBallotCheckRow--checking">
                <span className="easySpinner" />
                <span>{t("{{n}} being checked…", { n: snap.checking })}</span>
              </div>
            )}
            {snap.invalid > 0 && (
              <div className="easyBallotCheckRow easyBallotCheckRow--bad">
                <span>✗</span>
                <span>{t("{{n}} did not pass", { n: snap.invalid })}</span>
              </div>
            )}
          </>
        ) : null}
      </div>
      <PhaseAnim2 />
      <p className="easyStageCardDesc">
        {t("Every vote is sealed. Nobody can open it or see the choice inside — not even the election organizers.")}
      </p>
    </div>
  );
}

// ── EasyAggregateView ──────────────────────────────────────────────────────

export function EasyAggregateView({ numCandidates }: { numCandidates: number }) {
  const { t } = useTranslation();
  return (
    <div className="easyStageCard fadeUp">
      <div className="easyStageCardIcon easyStageCardIcon--done">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          <path d="M10 16h4" strokeWidth="2" />
        </svg>
      </div>
      <div className="easyStageCardStatus easyStageCardStatus--ok">
        {t("All votes bundled together")}&nbsp;<AnimatedCheck size={16} color="var(--green)" />
      </div>
      <PhaseAnim3 />
      <p className="easyStageCardDesc">
        {t("All votes were added up while still sealed — like stacking closed envelopes without opening any. The counts stay hidden until the guardians unlock them.")}
      </p>
      <div className="easyAggCandidateList">
        {Array.from({ length: numCandidates }, (_, j) => (
          <div key={j} className="easyAggCandidate">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>{t("Candidate {{n}}", { n: j })}</span>
            <span className="easyAggCandidateSealed">{t("sealed")}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── EasySharesView ─────────────────────────────────────────────────────────

export function EasySharesView({ shares, thresholdT, thresholdN }: { shares: DecryptionShare[]; thresholdT: number; thresholdN: number }) {
  const { t } = useTranslation();
  const enough = shares.length >= thresholdT;
  const pct = Math.min(100, (shares.length / thresholdT) * 100);
  return (
    <div className="easyStageCard fadeUp">
      <div className={`easyStageCardIcon${enough ? " easyStageCardIcon--done" : " easyStageCardIcon--progress"}`}>
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="7.5" cy="15.5" r="5.5" />
          <path d="M21 2l-9.6 9.6M15.5 7.5l3 3" />
        </svg>
      </div>
      <div className={`easyStageCardStatus${enough ? " easyStageCardStatus--ok" : ""}`}>
        {t("{{n}} of {{total}} guardians contributed", { n: shares.length, total: thresholdN })}
        {enough && <>&nbsp;<AnimatedCheck size={16} color="var(--green)" /></>}
      </div>
      <PhaseAnim4 />
      <div className="easySharesBarWrap">
        <div className="easySharesBar">
          <div className="easySharesBarFill" style={{ width: `${pct}%` }} />
        </div>
        <span className="easySharesBarLabel">{shares.length} / {thresholdT} {t("needed")}</span>
      </div>
      <div className="easyGuardianRow">
        {Array.from({ length: thresholdN }, (_, i) => {
          const contributed = shares.some((s) => s.keyperIndex === i);
          return (
            <div key={i} className={`easyGuardianChip${contributed ? " easyGuardianChip--active" : " easyGuardianChip--waiting"}`}>
              {contributed && <AnimatedCheck size={11} color="#fff" />}
              <span>{t("Guardian {{n}}", { n: i + 1 })}</span>
            </div>
          );
        })}
      </div>
      {enough ? (
        <p className="easyStageCardDesc easyStageCardDesc--ok">
          {t("Enough pieces collected! The final counts can now be revealed.")}
        </p>
      ) : (
        <p className="easyStageCardDesc">
          {t("{{remaining}} more pieces needed before the result can be opened.", { remaining: thresholdT - shares.length })}
        </p>
      )}
    </div>
  );
}
