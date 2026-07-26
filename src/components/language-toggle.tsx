"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Globe, Loader2 } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { LOCALES, LOCALE_NAMES, LOCALE_SHORT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * The site language control.
 *
 * Hand-rolled rather than built on a menu primitive, for the same reason the
 * theme toggle and the mobile nav are: four options and a click-outside is not
 * enough behaviour to justify learning a component library's API surface, and
 * everything else in this header is already plain React.
 *
 * Language names are shown in their own language, never translated. Someone
 * hunting for Portuguese scans for "Português"; "Portuguese" spelled out in
 * Spanish helps nobody.
 */
export function LanguageToggle() {
  const { lang, setLang, loading, t } = useI18n();
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: PointerEvent) => {
      if (!wrapper.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={wrapper} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t.language.label}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border px-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <Globe className="size-4" aria-hidden />
        )}
        <span className="text-xs font-medium">{LOCALE_SHORT[lang]}</span>
      </button>

      {open && (
        <div
          role="menu"
          aria-label={t.language.label}
          className="absolute right-0 z-50 mt-2 min-w-40 overflow-hidden rounded-md border border-border bg-card py-1 shadow-lg"
        >
          {LOCALES.map((l) => (
            <button
              key={l}
              type="button"
              role="menuitemradio"
              aria-checked={l === lang}
              onClick={() => {
                setLang(l);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors",
                l === lang
                  ? "text-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <Check
                className={cn("size-3.5 shrink-0", l !== lang && "invisible")}
                aria-hidden
              />
              {LOCALE_NAMES[l]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
