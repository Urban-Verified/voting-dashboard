import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { de } from "./de";

export type Lang = "de" | "en";

const STORAGE_KEY = "lang";

function detectInitial(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "de" || stored === "en") return stored;
  } catch {
    /* localStorage unavailable */
  }
  return "de";
}

void i18n.use(initReactI18next).init({
  resources: {
    de: { translation: de },
    en: { translation: {} },
  },
  lng: detectInitial(),
  fallbackLng: "en",
  // Natural keys: English source strings are used directly as keys, so we
  // disable namespace/key separators (otherwise "." / ":" inside a sentence
  // would be treated as nesting).
  keySeparator: false,
  nsSeparator: false,
  interpolation: { escapeValue: false },
  returnEmptyString: false,
});

export function setLanguage(lang: Lang) {
  try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* ignore */ }
  void i18n.changeLanguage(lang);
}

export default i18n;
