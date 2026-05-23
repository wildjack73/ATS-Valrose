"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, inputClass } from "@/components/ui/Field";

export default function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Erreur");
      router.push("/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de connexion");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Mot de passe" htmlFor="password" required error={error ?? undefined}>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          className={inputClass}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
        />
      </Field>
      <button
        type="submit"
        disabled={submitting || !password}
        className="w-full rounded-lg bg-navy text-white px-4 py-2 font-semibold hover:bg-navy-dark disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? "Connexion…" : "Se connecter"}
      </button>
    </form>
  );
}
