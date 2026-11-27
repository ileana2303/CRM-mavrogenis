import { NextResponse } from "next/server";
import { getSession } from "@/server/auth/session";
import { geminiConfigured, transcribeAudio } from "@/server/gemini/client";

export const dynamic = "force-dynamic";

const MAX_BYTES = 15 * 1024 * 1024;

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (!geminiConfigured()) return NextResponse.json({ error: "speech_unconfigured" }, { status: 503 });

  const form = await req.formData();
  const file = form.get("audio");
  if (!(file instanceof Blob) || file.size === 0) {
    return NextResponse.json({ error: "missing_audio" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "audio_too_large" }, { status: 413 });
  }

  const mimeType = file.type || "audio/webm";
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const text = await transcribeAudio(buffer, mimeType, req.signal);
    return NextResponse.json({ text });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}