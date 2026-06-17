"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface AccountSettingsData {
  id: string;
  name: string;
  platform: string;
  handle: string;
  connected: boolean;
  voiceTone: string | null;
  voiceDos: string | null;
  voiceDonts: string | null;
  bannedWords: string | null;
  autoLike: boolean;
  autoHideSpam: boolean;
}

export default function AccountSettings({ account }: { account: AccountSettingsData }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    voiceTone: account.voiceTone ?? "",
    voiceDos: account.voiceDos ?? "",
    voiceDonts: account.voiceDonts ?? "",
    bannedWords: account.bannedWords ?? "",
    autoLike: account.autoLike,
    autoHideSpam: account.autoHideSpam,
  });

  async function save() {
    setBusy(true);
    setSaved(false);
    const res = await fetch(`/api/accounts/${account.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setBusy(false);
    if (res.ok) {
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2000);
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={`shrink-0 rounded px-1 text-[10px] font-semibold ${
              account.platform === "instagram" ? "bg-pink-100 text-pink-700" : "bg-blue-100 text-blue-700"
            }`}
          >
            {account.platform === "instagram" ? "IG" : "FB"}
          </span>
          <span className="truncate font-medium text-zinc-900">{account.name}</span>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
              account.connected ? "bg-emerald-100 text-emerald-700" : "bg-zinc-100 text-zinc-500"
            }`}
          >
            {account.connected ? "Connected" : "Mock"}
          </span>
        </div>
        <button
          onClick={() => setOpen((o) => !o)}
          className="shrink-0 rounded-lg border border-zinc-300 px-3 py-1 text-sm text-zinc-700 hover:bg-zinc-50"
        >
          {open ? "Close" : "Edit voice"}
        </button>
      </div>

      {open && (
        <div className="mt-4 space-y-3">
          <Field label="Tone" placeholder="warm, playful, concise" value={form.voiceTone} onChange={(v) => setForm({ ...form, voiceTone: v })} />
          <Field label="Do" placeholder="thank people, invite them back" value={form.voiceDos} onChange={(v) => setForm({ ...form, voiceDos: v })} />
          <Field label="Don't" placeholder="be stiff or corporate" value={form.voiceDonts} onChange={(v) => setForm({ ...form, voiceDonts: v })} />
          <Field label="Banned words" placeholder="comma,separated" value={form.bannedWords} onChange={(v) => setForm({ ...form, bannedWords: v })} />

          <div className="flex flex-wrap gap-4 pt-1">
            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <input type="checkbox" checked={form.autoLike} onChange={(e) => setForm({ ...form, autoLike: e.target.checked })} />
              Auto-like good comments
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <input type="checkbox" checked={form.autoHideSpam} onChange={(e) => setForm({ ...form, autoHideSpam: e.target.checked })} />
              Auto-hide spam
            </label>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={save}
              disabled={busy}
              className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              {busy ? "Saving…" : "Save"}
            </button>
            {saved && <span className="text-sm text-emerald-700">Saved ✓</span>}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, placeholder, value, onChange }: { label: string; placeholder: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs font-medium uppercase tracking-wide text-zinc-400">{label}</label>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-zinc-900"
      />
    </div>
  );
}
