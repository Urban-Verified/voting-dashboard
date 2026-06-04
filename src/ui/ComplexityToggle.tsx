import { useTranslation } from "react-i18next";
import { useComplexity, setComplexity, type Complexity } from "./ComplexityContext";

export function ComplexityToggle() {
  const { i18n } = useTranslation();
  const { complexity } = useComplexity();
  const isDE = (i18n.resolvedLanguage ?? i18n.language) === "de";

  const options: { value: Complexity; label: string }[] = isDE
    ? [{ value: "easy", label: "Einfach" }, { value: "technical", label: "Technisch" }]
    : [{ value: "easy", label: "Easy" }, { value: "technical", label: "Technical" }];

  return (
    <div className="langToggle" role="group" aria-label={isDE ? "Ansichtsmodus" : "View mode"}>
      {options.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          className={`langToggleBtn${complexity === value ? " langToggleBtn--active" : ""}`}
          aria-pressed={complexity === value}
          onClick={() => setComplexity(value)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
