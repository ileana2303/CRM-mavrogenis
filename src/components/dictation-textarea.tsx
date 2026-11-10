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

function getRecognition(): (new () => SR) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const isApple = () => typeof navigator !== "undefined" && /iPad|iPhone|Macintosh/.test(navigator.userAgent) && "ontouchend" in document;

/**
 * Textarea with Web Speech API dictation (el-GR).
 * iPad Safari (primary target): `webkitSpeechRecognition` exists since iPadOS 14.5, needs a secure context
 * (HTTPS) and Siri/Dictation enabled in Settings. Safari ends a session after a pause, so while the user
 * has not pressed stop we restart it and append to the text already captured.
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
  const [supported, setSupported] = useState(true);
  const [insecure, setInsecure] = useState(false);
  const recRef = useRef<SR | null>(null);
  const wantRef = useRef(false);
  const baseRef = useRef("");
  const restartsRef = useRef(0);

  useEffect(() => {
    setSupported(!!getRecognition());
    setInsecure(typeof window !== "undefined" && !window.isSecureContext);
    return () => {
      wantRef.current = false;
      recRef.current?.abort();
    };
  }, []);

  const startSession = () => {
    const Ctor = getRecognition();
    if (!Ctor) return setSupported(false);
    const rec = new Ctor();
    rec.lang = "el-GR";
    // Safari handles short sessions better; Chrome is happy with continuous.
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

  const toggle = () => {
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
    try {
      startSession();
    } catch {
      wantRef.current = false;
      setListening(false);
      setSupported(false);
    }
  };

  const disabled = !supported || insecure;

  return (
    <div className="flex flex-col gap-2">
      <textarea name={name} className="input" rows={rows} placeholder={placeholder} value={value} onChange={(e) => setValue(e.target.value)} />
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={toggle} disabled={disabled} className={listening ? "btn-danger" : "btn-secondary"} aria-pressed={listening}>
          <span aria-hidden>{listening ? "⏹" : "🎤"}</span>
          {listening ? el.visit.dictating : el.visit.dictate}
        </button>
        {insecure ? (
          <span className="text-xs text-[var(--muted)]">{el.visit.dictateInsecure}</span>
        ) : (
          !supported && <span className="text-xs text-[var(--muted)]">{el.visit.dictateUnsupported}</span>
        )}
      </div>
    </div>
  );
}
