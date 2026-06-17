"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface DMMessage {
  fromUs: boolean;
  text: string;
}

export interface DMCardData {
  id: string;
  participantName: string;
  participantHandle: string | null;
  accountName: string;
  platform: string;
  sentiment: string | null;
  spamLabel: string | null;
  reason: string | null;
  status: string;
  draftBody: string | null;
  messages: DMMessage[];
  windowOpen: boolean;
}

const SENTIMENT_STYLE: Record<string, string> = {
  positive: "bg-emerald-100 text-emerald-700",
  neutral: "bg-zinc-100 text-zinc-600",
  negative: "bg-red-100 text-red-700",
  question: "bg-blue-100 text-blue-700",
};

export default function DMCard({ data }: { data: DMCardData }) {
  const router = useRouter();
  const [reply, setReply] = useState(data.draftBody ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function act(action: string, body?: string) {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/conversations/${data.id}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, body }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.message ?? "Action failed");
      return;
    }
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium text-zinc-900">{data.participantName}</span>
          {data.participantHandle && <span className="text-zinc-400">@{data.participantHandle}</span>}
        </div>
        <div className="flex items-center gap-1.5">
          {data.sentiment && (
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${SENTIMENT_STYLE[data.sentiment] ?? "bg-zinc-100 text-zinc-600"}`}>
              {data.sentiment}
            </span>
          )}
          {data.spamLabel && data.spamLabel !== "clean" && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              {data.spamLabel}
            </span>
          )}
        </div>
      </div>

      {/* Message thread */}
      <div className="mt-3 space-y-1.5">
        {data.messages.map((m, i) => (
          <div key={i} className={`flex ${m.fromUs ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-3 py-1.5 text-sm ${
                m.fromUs ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-800"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-1 text-xs text-zinc-400">
        {data.accountName} · {data.platform}
        {data.reason ? ` · ${data.reason}` : ""}
      </p>

      {data.status === "needs_reply" && (
        <div className="mt-3">
          {!data.windowOpen && (
            <p className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              ⏰ Outside Meta&apos;s 24-hour reply window. Sending a standard message isn&apos;t
              allowed — you&apos;d need a message tag. Replying here is disabled.
            </p>
          )}
          <label className="text-xs font-medium text-zinc-500">AI-drafted reply — edit then send</label>
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-zinc-300 p-2 text-sm outline-none focus:border-zinc-900"
          />
          {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              onClick={() => act("reply", reply)}
              disabled={busy || !reply.trim() || !data.windowOpen}
              className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              Send DM
            </button>
            <button
              onClick={() => act("dismiss")}
              disabled={busy}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {data.status === "spam_review" && (
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="self-center text-xs text-zinc-500">Not sure if this is spam —</span>
          <button
            onClick={() => act("confirm_spam")}
            disabled={busy}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            Confirm spam
          </button>
          <button
            onClick={() => act("not_spam")}
            disabled={busy}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            Not spam
          </button>
        </div>
      )}

      {data.status === "spam_hidden" && <p className="mt-3 text-sm text-zinc-400">🚫 Marked as spam</p>}
      {data.status === "replied" && <p className="mt-3 text-sm text-emerald-700">✓ Reply sent</p>}
      {data.status === "dismissed" && <p className="mt-3 text-sm text-zinc-400">Dismissed</p>}
    </div>
  );
}
