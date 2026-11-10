"use client";

import { useEffect, useRef, useState } from "react";
import { el } from "@/lib/i18n/el";

/** Canvas signature pad. Writes a PNG data URL into the hidden input `name`. */
export function SignaturePad({ name }: { name: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  // ink is tracked in a ref too: the pointer-up handler may run before React re-rendered with hasInk=true
  const inkRef = useRef(false);
  const [hasInk, setHasInk] = useState(false);

  useEffect(() => {
    const c = canvasRef.current!;
    const resize = () => {
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const rect = c.getBoundingClientRect();
      const data = c.toDataURL();
      c.width = rect.width * ratio;
      c.height = rect.height * ratio;
      const ctx = c.getContext("2d")!;
      ctx.scale(ratio, ratio);
      ctx.lineWidth = 2.2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#15223b";
      if (inkRef.current) {
        const img = new Image();
        img.onload = () => ctx.drawImage(img, 0, 0, rect.width, rect.height);
        img.src = data;
      }
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pos = (e: React.PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const commit = () => {
    if (inputRef.current) inputRef.current.value = inkRef.current ? canvasRef.current!.toDataURL("image/png") : "";
  };

  const onDown = (e: React.PointerEvent) => {
    e.preventDefault();
    canvasRef.current!.setPointerCapture(e.pointerId);
    drawing.current = true;
    last.current = pos(e);
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.beginPath();
    ctx.arc(last.current.x, last.current.y, 1, 0, Math.PI * 2);
    ctx.fill();
    inkRef.current = true;
    setHasInk(true);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drawing.current || !last.current) return;
    e.preventDefault();
    const p = pos(e);
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    commit();
  };
  const onUp = () => {
    drawing.current = false;
    last.current = null;
    commit();
  };
  const clear = () => {
    const c = canvasRef.current!;
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, c.width, c.height);
    inkRef.current = false;
    setHasInk(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="relative rounded-xl border-2 border-dashed border-brand-200 bg-white overflow-hidden">
        <canvas
          ref={canvasRef}
          className="block w-full h-48 sm:h-56 md:h-64 touch-none cursor-crosshair select-none"
          style={{ WebkitTouchCallout: "none", WebkitUserSelect: "none" }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onPointerLeave={onUp}
        />
        {!hasInk && <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-[var(--muted)]">{el.consent.signature}</span>}
        <span className="pointer-events-none absolute left-6 right-6 bottom-8 border-b border-[var(--line)]" />
      </div>
      <input ref={inputRef} type="hidden" name={name} />
      <button type="button" onClick={clear} className="btn-secondary self-start">
        {el.consent.clear}
      </button>
    </div>
  );
}
