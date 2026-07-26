"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { en, type Dictionary } from "@/lib/i18n/dictionaries/en";
import {
  DEFAULT_LOCALE,
  detectLocale,
  readLocaleCookie,
  writeLocaleCookie,
} from "@/lib/i18n";
import type { Lang } from "@/lib/types";

/**
 * The UI string layer.
 *
 * English is bundled because it is the default and the fallback, and because
 * something has to render before any decision about language can be made. The
 * other three are fetched on demand: the dictionary grows every time a page is
 * translated, and shipping four copies of it to a reader using one is a cost
 * that only ever goes up.
 */
const LOADERS: Record<Exclude<Lang, "en">, () => Promise<Dictionary>> = {
  fr: () => import("@/lib/i18n/dictionaries/fr").then((m) => m.fr),
  pt: () => import("@/lib/i18n/dictionaries/pt").then((m) => m.pt),
  es: () => import("@/lib/i18n/dictionaries/es").then((m) => m.es),
};

interface I18nValue {
  lang: Lang;
  t: Dictionary;
  setLang: (next: Lang) => void;
  /** True while a dictionary is in flight, so a control can show it. */
  loading: boolean;
}

const I18nContext = createContext<I18nValue>({
  lang: DEFAULT_LOCALE,
  t: en,
  setLang: () => {},
  loading: false,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(DEFAULT_LOCALE);
  const [dict, setDict] = useState<Dictionary>(en);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (next: Lang) => {
    if (next === "en") {
      setDict(en);
      setLangState("en");
      return;
    }

    setLoading(true);
    try {
      const loaded = await LOADERS[next]();
      setDict(loaded);
      setLangState(next);
    } catch {
      // A dictionary that fails to load leaves English in place. Half a page in
      // French over English headings is worse than a page that stayed English.
      setDict(en);
      setLangState(DEFAULT_LOCALE);
    } finally {
      setLoading(false);
    }
  }, []);

  // Runs once, after hydration. The server rendered English, so anything that
  // happens here is a swap and never a mismatch.
  //
  // Deliberately not calling `load` here. That would set state synchronously
  // inside the effect, which cascades renders, and it would flash the spinner
  // on a switch nobody asked for. This path is silent: the strings either
  // change or they do not.
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const stored = readLocaleCookie();
      const initial = stored === DEFAULT_LOCALE ? detectLocale() : stored;
      if (initial === DEFAULT_LOCALE) return;

      const loaded = await LOADERS[initial]().catch(() => null);
      if (cancelled || !loaded) return;

      setDict(loaded);
      setLangState(initial);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Kept in step with the strings actually on screen, because screen readers
  // and browser translation prompts both read it.
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback(
    (next: Lang) => {
      writeLocaleCookie(next);
      void load(next);
    },
    [load],
  );

  const value = useMemo<I18nValue>(
    () => ({ lang, t: dict, setLang, loading }),
    [lang, dict, setLang, loading],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
