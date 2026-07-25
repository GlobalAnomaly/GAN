"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export function SearchBox({
  defaultValue = "",
  autoFocus = false,
  className,
}: {
  defaultValue?: string;
  autoFocus?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        const q = value.trim();
        router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
      }}
      className={cn("relative", className)}
    >
      <label htmlFor="site-search" className="sr-only">
        Search cases and science entries
      </label>
      <Search
        className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <input
        id="site-search"
        type="search"
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search by place, year, witness or keyword"
        className="h-12 w-full rounded-full border border-border bg-card pr-24 pl-11 text-base outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
      />
      <button
        type="submit"
        className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground transition-opacity hover:opacity-90"
      >
        Search
      </button>
    </form>
  );
}
