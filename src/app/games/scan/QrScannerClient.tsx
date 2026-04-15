"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type Detector = {
  detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue?: string }>>;
};

declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats?: string[] }) => Detector;
  }
}

function resolveDestination(input: string): { href: string; external: boolean } | null {
  const raw = input.trim();
  if (!raw) return null;

  if (raw.startsWith("/")) {
    return { href: raw, external: false };
  }

  try {
    const parsed = new URL(raw);
    const sameOrigin = parsed.origin === window.location.origin;
    return {
      href: sameOrigin
        ? `${parsed.pathname}${parsed.search}${parsed.hash}`
        : parsed.toString(),
      external: !sameOrigin,
    };
  } catch {
    return null;
  }
}

export function QrScannerClient() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const [manual, setManual] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "starting" | "scanning">("idle");
  const [lastScanned, setLastScanned] = useState<string | null>(null);

  const detectorSupported = useMemo(() => typeof window !== "undefined" && !!window.BarcodeDetector, []);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
      }
      if (streamRef.current) {
        for (const t of streamRef.current.getTracks()) t.stop();
      }
    };
  }, []);

  async function goToScanned(rawValue: string) {
    if (!rawValue) return;
    setLastScanned(rawValue);
    const target = resolveDestination(rawValue);
    if (!target) {
      setError("Scanned QR code is not a valid app link.");
      return;
    }
    if (target.external) {
      window.location.href = target.href;
      return;
    }
    router.push(target.href);
    router.refresh();
  }

  async function startCamera() {
    if (!detectorSupported) {
      setError("QR scanner is not supported in this browser. Paste the link below instead.");
      return;
    }
    setError(null);
    setStatus("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) {
        setError("Camera preview failed to initialize.");
        setStatus("idle");
        return;
      }
      video.srcObject = stream;
      await video.play();
      const BarcodeDetectorCtor = window.BarcodeDetector;
      if (!BarcodeDetectorCtor) {
        setError("QR scanner is not supported in this browser. Paste the link below instead.");
        setStatus("idle");
        return;
      }
      const detector = new BarcodeDetectorCtor({ formats: ["qr_code"] });
      setStatus("scanning");
      timerRef.current = window.setInterval(async () => {
        try {
          const hits = await detector.detect(video);
          const first = hits[0]?.rawValue?.trim();
          if (!first) return;
          if (timerRef.current !== null) window.clearInterval(timerRef.current);
          timerRef.current = null;
          for (const t of stream.getTracks()) t.stop();
          streamRef.current = null;
          setStatus("idle");
          await goToScanned(first);
        } catch {
          // Keep scanning.
        }
      }, 350);
    } catch {
      setError("Unable to access camera. Check browser permissions and try again.");
      setStatus("idle");
    }
  }

  function stopCamera() {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      for (const t of streamRef.current.getTracks()) t.stop();
      streamRef.current = null;
    }
    setStatus("idle");
  }

  async function onManualOpen(e: React.FormEvent) {
    e.preventDefault();
    const target = resolveDestination(manual);
    if (!target) {
      setError("Enter a full QR link from this app.");
      return;
    }
    setError(null);
    if (target.external) {
      window.location.href = target.href;
      return;
    }
    router.push(target.href);
    router.refresh();
  }

  return (
    <div className="flex max-w-lg flex-col gap-4">
      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200">
          {error}
        </p>
      ) : null}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-950 dark:border-zinc-800">
        <video
          ref={videoRef}
          className="aspect-4/3 w-full object-cover"
          playsInline
          muted
          aria-label="Camera preview for QR scanning"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={startCamera}
          disabled={status !== "idle"}
          className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {status === "starting" ? "Starting camera…" : status === "scanning" ? "Scanning…" : "Open camera"}
        </button>
        <button
          type="button"
          onClick={stopCamera}
          disabled={status === "idle"}
          className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200"
        >
          Stop
        </button>
      </div>

      <form onSubmit={onManualOpen} className="mt-2 flex flex-col gap-2">
        <label htmlFor="manual-qr-link" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Or paste a QR link
        </label>
        <input
          id="manual-qr-link"
          type="url"
          placeholder="https://…"
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
        <button
          type="submit"
          className="self-start rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
        >
          Open link
        </button>
      </form>

      {lastScanned ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">Last scan: {lastScanned}</p>
      ) : null}
    </div>
  );
}
