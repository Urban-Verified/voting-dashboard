import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { ElectionConfigView, DkgResultView } from "../eth/types";
import { buildElectionSkill } from "./aiSkill";

type Props = {
  overview: { config: ElectionConfigView; dkg: DkgResultView };
  selectedElection: string;
  onClose: () => void;
};

export function AddToClaudeView({ overview, selectedElection, onClose }: Props) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const skill = buildElectionSkill({
    electionAddress: selectedElection,
    rpcUrl: import.meta.env.VITE_RPC_URL as string ?? "",
    electionId: overview.config.electionId.toString(),
    numCandidates: overview.config.numCandidates,
    budget: overview.config.budget,
    thresholdT: Number(overview.config.thresholdT),
    thresholdN: Number(overview.config.thresholdN),
  });

  function handleCopy() {
    void navigator.clipboard.writeText(skill).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleDownload() {
    const blob = new Blob([skill], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "verify-election.md";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="atcContainer">
      {/* Header */}
      <div className="atcHdr">
        <button type="button" className="atcBack" onClick={onClose}>
          ← {t("Back")}
        </button>
        <div className="atcHdrMain">
          <div className="atcHdrIcon" aria-hidden>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z" />
              <path d="M12 8v4l3 3" />
              <circle cx="9" cy="9" r="1" fill="currentColor" />
              <circle cx="15" cy="9" r="1" fill="currentColor" />
            </svg>
          </div>
          <div>
            <h1 className="atcTitle">{t("Add to your AI assistant")}</h1>
            <p className="atcSubtitle">{t("Let an AI agent verify this election independently")}</p>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="atcDesc">
        <p>
          {t("Copy the skill below into Claude Code, OpenClaw, or any AI agent with shell access and a terminal. The agent will fetch all election data directly from the blockchain and run every cryptographic check autonomously — no backend, no trust in this dashboard required.")}
        </p>
        <div className="atcStepPills">
          {[
            t("Fetch from chain"),
            t("Verify ballots"),
            t("Verify aggregate"),
            t("Verify shares"),
            t("Verify tally"),
          ].map((label, i) => (
            <span key={i} className="atcStepPill">
              <span className="atcStepPillNum">{i + 1}</span>
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="atcActions">
        <button type="button" className="atcCopyBtn" onClick={handleCopy}>
          {copied ? (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M20 6L9 17l-5-5" />
              </svg>
              {t("Copied!")}
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              {t("Copy Skill")}
            </>
          )}
        </button>
        <button type="button" className="atcDownloadBtn" onClick={handleDownload}>
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M6.5 1v8M3 6l3.5 3.5L10 6" />
            <path d="M1 11h11" />
          </svg>
          {t("Download .md")}
        </button>
        <span className="atcActionsHint">
          {t("Then paste into Claude Code and say: \"follow this skill\"")}
        </span>
      </div>

      {/* Skill content */}
      <div className="atcSkillWrapper">
        <div className="atcSkillHeader">
          <span className="atcSkillLabel">verify-election.md</span>
          <button type="button" className="atcSkillCopyBtn" onClick={handleCopy}>
            {copied ? t("Copied!") : t("Copy")}
          </button>
        </div>
        <pre className="atcSkillCode">{skill}</pre>
      </div>
    </div>
  );
}
