"use client";

import { useEffect, useRef, useState } from "react";
import { el } from "@/lib/i18n/el";

type SR = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
};

type Provider = "gemini" | "browser";

function getRecognition(): (new () => SR) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const isApple = () => typeof navigator !== "undefined" && /iPad|iPhone|Macintosh/.test(navigator.userAgent) && "ontouchend" in document;

function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const types = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm", "audio/aac"];
  return types.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}

function geminiRecordingSupported(): boolean {
  return typeof MediaRecorder !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);
}

/**
 * Textarea with voice dictation: Gemini (server) when `GEMINI_API_KEY` is set, else Web Speech API (`el-GR`).
 */
export function DictationTextarea({
  name,
  placeholder,
  defaultValue = "",
  rows = 3,
}: {
  name: string;
  placeholder?: string;
  defaultValue?: string;
  rows?: number;
}) {
  const [value, setValue] = useState(defaultValue);
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [supported, setSupported] = useState(true);
  const [insecure, setInsecure] = useState(false);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recRef = useRef<SR | null>(null);
  const wantRef = useRef(false);
  const baseRef = useRef("");
  const restartsRef = useRef(0);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const mimeRef = useRef("audio/webm");

  useEffect(() => {
    setInsecure(typeof window !== "undefined" && !window.isSecureContext);
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/speech/config", { credentials: "same-origin" });
        if (cancelled) return;
        if (res.ok) {
          const body = (await res.json()) as { gemini?: boolean };
          if (body.gemini) {
            setProvider("gemini");
            setSupported(geminiRecordingSupported());
            return;
          }
        }
      } catch {
        /* fall back to browser */
      }
      if (!cancelled) {
        setProvider("browser");
        setSupported(!!getRecognition());
      }
    })();

    return () => {
      cancelled = true;
      wantRef.current = false;
      recRef.current?.abort();
      recorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const startSession = () => {
    const Ctor = getRecognition();
    if (!Ctor) return setSupported(false);
    const rec = new Ctor();
    rec.lang = "el-GR";
    rec.continuous = !isApple();
    rec.interimResults = true;
    let finalText = "";
    rec.onresult = (e) => {
      finalText = "";
      let interim = "";
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript + " ";
        else interim += r[0].transcript;
      }
      setValue((baseRef.current + finalText + interim).trimStart());
    };
    rec.onend = () => {
      baseRef.current = (baseRef.current + finalText).replace(/\s+$/, "") + (finalText ? " " : "");
      if (wantRef.current && restartsRef.current < 20) {
        restartsRef.current++;
        try {
          startSession();
          return;
        } catch {
          /* fall through */
        }
      }
      wantRef.current = false;
      setListening(false);
    };
    rec.onerror = (e) => {
      if (e?.error === "not-allowed" || e?.error === "service-not-allowed") {
        wantRef.current = false;
        setSupported(false);
      }
    };
    recRef.current = rec;
    rec.start();
  };

  const finishGeminiRecording = async () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;

    const blob = new Blob(chunksRef.current, { type: mimeRef.current });
    chunksRef.current = [];

    if (blob.size === 0) {
      setTranscribing(false);
      return;
    }

    const fd = new FormData();
    fd.append("audio", blob, "recording.webm");

    try {
      const res = await fetch("/api/speech/transcribe", { method: "POST", body: fd, credentials: "same-origin" });
      const body = (await res.json()) as { text?: string; error?: string };
      if (res.ok && body.text) {
        setValue((v) => (v ? `${v.replace(/\s+$/, "")} ` : "") + body.text);
        setError(null);
      } else {
        setError(el.visit.dictateTranscribeError);
      }
    } catch {
      setError(el.visit.dictateTranscribeError);
    } finally {
      setTranscribing(false);
    }
  };

  const startGemini = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const mime = pickMimeType();
      mimeRef.current = mime || "audio/webm";
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      recorder.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        void finishGeminiRecording();
      };
      recorderRef.current = recorder;
      recorder.start();
      setListening(true);
    } catch {
      setSupported(false);
      setListening(false);
    }
  };

  const stopGemini = () => {
    setListening(false);
    setTranscribing(true);
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
    else void finishGeminiRecording();
  };

  const toggleBrowser = () => {
    if (listening) {
      wantRef.current = false;
      recRef.current?.stop();
      setListening(false);
      return;
    }
    baseRef.current = value ? value.replace(/\s+$/, "") + " " : "";
    restartsRef.current = 0;
    wantRef.current = true;
    setListening(true);
    setError(null);
    try {
      startSession();
    } catch {
      wantRef.current = false;
      setListening(false);
      setSupported(false);
    }
  };

  const toggle = () => {
    if (transcribing || provider === null) return;
    if (provider === "gemini") {
      if (listening) stopGemini();
      else void startGemini();
    } else {
      toggleBrowser();
    }
  };

  const disabled = insecure || provider === null || transcribing || !supported;

  const buttonLabel = transcribing ? el.visit.dictateTranscribing : listening ? el.visit.dictating : el.visit.dictate;

  return (
    <div className="flex flex-col gap-2">
      <textarea name={name} className="input" rows={rows} placeholder={placeholder} value={value} onChange={(e) => setValue(e.target.value)} />
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          disabled={disabled}
          className={listening ? "btn-danger" : "btn-secondary"}
          aria-pressed={listening || transcribing}
        >
          <span aria-hidden>{listening ? "⏹" : transcribing ? "…" : "🎤"}</span>
          {buttonLabel}
        </button>
        {error ? (
          <span className="text-xs text-[var(--muted)]">{error}</span>
        ) : insecure ? (
          <span className="text-xs text-[var(--muted)]">{el.visit.dictateInsecure}</span>
        ) : (
          !supported && <span className="text-xs text-[var(--muted)]">{el.visit.dictateUnsupported}</span>
        )}
      </div>
    </div>
  );
}