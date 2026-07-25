"use client";

import { useState } from "react";
import { Check, Link2, Share2 } from "lucide-react";

/**
 * Sharing is open to everyone, no account required. Nothing here talks to a
 * platform API: each button is an ordinary web intent link, so there are no
 * tokens to store and nothing to break when a platform changes its layout.
 */
export function ShareButtons({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const targets = [
    {
      label: "Share on X",
      href: `https://x.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
    },
    {
      label: "Share on Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    },
    {
      label: "Share on Reddit",
      href: `https://www.reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`,
    },
  ];

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be refused (insecure context, denied permission).
      // The share links still work, so this fails quietly rather than alerting.
    }
  }

  const buttonClass =
    "inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <Share2 className="size-3.5" aria-hidden />
        Share
      </span>

      {targets.map((t) => (
        <a
          key={t.label}
          href={t.href}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonClass}
        >
          {t.label.replace("Share on ", "")}
        </a>
      ))}

      <button type="button" onClick={copy} className={buttonClass}>
        {copied ? (
          <>
            <Check className="size-3.5" aria-hidden />
            Copied
          </>
        ) : (
          <>
            <Link2 className="size-3.5" aria-hidden />
            Copy link
          </>
        )}
      </button>
    </div>
  );
}
