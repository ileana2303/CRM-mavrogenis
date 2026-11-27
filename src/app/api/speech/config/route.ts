import { NextResponse } from "next/server";
import { getSession } from "@/server/auth/session";
import { geminiConfigured } from "@/server/gemini/client";

export const dynamic = "force-dynamic";

/** Which dictation backend the client should use (Gemini needs GEMINI_API_KEY). */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  return NextResponse.json({ gemini: geminiConfigured() });
}