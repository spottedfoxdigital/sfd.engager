import { NextResponse } from "next/server";

// Railway healthcheck endpoint.
export async function GET() {
  return NextResponse.json({ status: "ok" });
}
