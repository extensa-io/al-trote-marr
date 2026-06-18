"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const STORAGE_KEY = "install-hint-dismissed";
const STANDALONE_QUERY = "(display-mode: standalone)";

function subscribeMedia(query: string) {
  return (callback: () => void) => {
    if (typeof window === "undefined" || !window.matchMedia) return () => {};
    const m = window.matchMedia(query);
    m.addEventListener("change", callback);
    return () => m.removeEventListener("change", callback);
  };
}

function subscribeStorage(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function readDismissed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function readIsIos(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
}

const NO_SUBSCRIBE = () => () => {};

export default function InstallHint() {
  const standalone = useSyncExternalStore(
    subscribeMedia(STANDALONE_QUERY),
    () => window.matchMedia(STANDALONE_QUERY).matches,
    () => false,
  );
  const dismissed = useSyncExternalStore(subscribeStorage, readDismissed, () => false);
  const isIos = useSyncExternalStore(NO_SUBSCRIBE, readIsIos, () => false);

  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
    // Force this tab to re-read; the storage event only fires in other tabs.
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
  }

  async function install() {
    if (!event) return;
    await event.prompt();
    await event.userChoice;
    setEvent(null);
  }

  if (standalone || dismissed) return null;
  const mode: "prompt" | "ios" | null = event ? "prompt" : isIos ? "ios" : null;
  if (!mode) return null;

  return (
    <section
      aria-label="Install this app"
      className="border border-line bg-panel rounded-md p-4 flex items-start gap-3"
    >
      <div className="flex-1">
        <p className="eyebrow mb-1">Install app</p>
        {mode === "prompt" ? (
          <p className="text-canvas-dim text-sm">
            Add Al Trote Marr to your home screen for a faster, full-screen run.
          </p>
        ) : (
          <p className="text-canvas-dim text-sm">
            Tap <span className="font-mono text-canvas">Share</span> in Safari, then{" "}
            <span className="font-mono text-canvas">Add to Home Screen</span>.
          </p>
        )}
        {mode === "prompt" ? (
          <button
            type="button"
            onClick={install}
            className="mt-3 px-3 py-1.5 bg-brass text-field font-display uppercase tracking-wider text-xs rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
          >
            Install
          </button>
        ) : null}
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss install hint"
        className="eyebrow text-canvas-dim hover:text-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass rounded-sm"
      >
        Dismiss
      </button>
    </section>
  );
}
