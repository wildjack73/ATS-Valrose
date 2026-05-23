"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  async function onClick() {
    setLoading(true);
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="rounded-md bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
    >
      {loading ? "…" : "Se déconnecter"}
    </button>
  );
}
