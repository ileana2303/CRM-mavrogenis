"use client";

import { useEffect, useRef, useState } from "react";
import { el } from "@/lib/i18n/el";

type SR = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

function getRecognition(): (new () => SR) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Textarea with Web Speech API dictation (el-GR). */
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
  const recRef = useRef<SR | null>(null);
  const baseRef = useRef("");

  useEffect(() => {
    setSupported(!!getRecognition());
    return () => recRef.current?.stop();
  }, []);

  const toggle = () => {
    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }
    const Ctor = getRecognition();
    if (!Ctor) return setSupported(false);
    const rec = new Ctor();
    rec.lang = "el-GR";
    rec.continuous = true;
    rec.interimResults = true;
    baseRef.current = value ? value.replace(/\s+$/, "") + " " : "";
    rec.onresult = (e) => {
      let finalText = "";
      let interim = "";
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript + " ";
        else interim += r[0].transcript;
      }
      setValue((baseRef.current + finalText + interim).trimStart());
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  };

  return (
    <div className="flex flex-col gap-2">
      <textarea name={name} className="input" rows={rows} placeholder={placeholder} value={value} onChange={(e) => setValue(e.target.value)} />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          disabled={!supported}
          className={listening ? "btn-danger" : "btn-secondary"}
          aria-pressed={listening}
        >
          <span aria-hidden>{listening ? "⏹" : "🎤"}</span>
          {listening ? el.visit.dictating : el.visit.dictate}
        </button>
        {!supported && <span className="text-xs text-[var(--muted)]">{el.visit.dictateUnsupported}</span>}
      </div>
    </div>
  );
}
