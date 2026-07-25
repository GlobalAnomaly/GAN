"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { signIn } from "@/app/admin/actions";

function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/admin";

  const [state, action, pending] = useActionState(signIn, null);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />

      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm">
          Admin password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoFocus
          autoComplete="current-password"
          className="h-11 w-full rounded-md border border-border bg-card px-3 outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40"
        />
      </div>

      {state?.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-primary px-4 py-2.5 text-sm text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Checking" : "Sign in"}
      </button>
    </form>
  );
}

export default function AdminLoginPage() {
  return (
    <div className="mx-auto max-w-sm px-4 py-20">
      <h1 className="font-[family-name:var(--font-serif)] text-2xl">
        Admin sign in
      </h1>
      <p className="mt-2 mb-6 text-sm text-muted-foreground">
        The password is whatever you set as ADMIN_PASSWORD in .env.local.
      </p>

      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
