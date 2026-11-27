import { GoogleGenAI } from "@google/genai";

const TIMEOUT_MS = 60_000;
const DEFAULT_MODEL = process.env.GEMINI_TRANSCRIBE_MODEL ?? "gemini-2.5-flash";

const TRANSCRIBE_PROMPT = `Transcribe the audio exactly as spoken in Greek (el-GR).
The speaker is recording short CRM field notes about doctors and medical equipment sales.
Return only the transcribed text—no labels, markdown, or commentary.`;

export const geminiConfigured = (): boolean => Boolean(process.env.GEMINI_API_KEY);

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("gemini: not configured");
  return new GoogleGenAI({ apiKey });
}

/** Audio bytes → Greek transcript via Gemini (server-only; never expose the API key). */
export async function transcribeAudio(buffer: Buffer, mimeType: string, signal?: AbortSignal): Promise<string> {
  const ai = getClient();
  const effectiveSignal = signal ?? AbortSignal.timeout(TIMEOUT_MS);
  const response = await ai.models.generateContent({
    model: DEFAULT_MODEL,
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType, data: buffer.toString("base64") } },
          { text: TRANSCRIBE_PROMPT },
        ],
      },
    ],
    config: { abortSignal: effectiveSignal },
  });
  return (response.text ?? "").trim();
}