import { useTranslation } from "react-i18next";
import { setLanguage, type Lang } from "../i18n";

export function LanguageToggle() {
  const { i18n } = useTranslation();
  const current = (i18n.resolvedLanguage ?? i18n.language ?? "de") as Lang;

  return (
    <div className="langToggle" role="group" aria-label="Language">
      {(["de", "en"] as const).map((lang) => (
        <button
          key={lang}
          type="button"
          className={`langToggleBtn${current === lang ? " langToggleBtn--active" : ""}`}
          aria-pressed={current === lang}
          onClick={() => setLanguage(lang)}
        >
          {lang.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
