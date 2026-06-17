"use client";

import { useRouter } from "next/navigation";

export default function SignOutButton() {
  const router = useRouter();
  async function signOut() {
    await fetch("/api/login", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  }
  return (
    <button
      onClick={signOut}
      className="w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-500 hover:bg-zinc-100"
    >
      Sign out
    </button>
  );
}
