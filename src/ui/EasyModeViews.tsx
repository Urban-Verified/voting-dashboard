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
      <p className="easyStageCardDesc">
        {t("{{t}} of {{n}} guardians must work together to unlock the result — no single person can do it alone.", { t: thresholdT, n: thresholdN })}
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
