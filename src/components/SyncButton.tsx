"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SyncButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  async function sync() {
    setLoading(true);
    setSummary(null);
    const res = await fetch("/api/sync", { method: "POST" });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      setSummary(
        `+${data.ingested} new · ${data.autoLiked} liked · ${data.needsReply} to reply · ${data.spamReview} spam review · ${data.autoHidden} hidden`
      );
      router.refresh();
    } else {
      setSummary("Sync failed");
    }
  }

  return (
    <div>
      <button
        onClick={sync}
        disabled={loading}
        className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
      >
        {loading ? "Syncing…" : "Sync now"}
      </button>
      {summary && <p className="mt-2 text-xs text-zinc-500">{summary}</p>}
    </div>
  );
}
