import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Update an account's brand voice + automation settings.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const data: Record<string, unknown> = {};
  for (const field of ["voiceTone", "voiceDos", "voiceDonts", "bannedWords"] as const) {
    if (field in body) data[field] = body[field] === "" ? null : body[field];
  }
  for (const field of ["autoLike", "autoHideSpam"] as const) {
    if (field in body) data[field] = Boolean(body[field]);
  }

  const account = await prisma.account.update({ where: { id }, data }).catch(() => null);
  if (!account) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
