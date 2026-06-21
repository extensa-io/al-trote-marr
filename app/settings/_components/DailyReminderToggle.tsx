"use client";

import { useEffect, useState } from "react";

type State = "loading" | "unsupported" | "off" | "on" | "denied" | "working";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(normalized);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function supported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

const IS_DEV = process.env.NODE_ENV !== "production";

export default function DailyReminderToggle() {
  const [state, setState] = useState<State>("loading");
  const [error, setError] = useState<string | null>(null);
  const [testMsg, setTestMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!supported() || !VAPID_PUBLIC_KEY) {
        if (!cancelled) setState("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        if (!cancelled) setState("denied");
        return;
      }
      try {
        const reg = await navigator.serviceWorker.getRegistration("/sw.js");
        const sub = (await reg?.pushManager.getSubscription()) ?? null;
        if (!cancelled) setState(sub ? "on" : "off");
      } catch {
        if (!cancelled) setState("off");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function enable() {
    setError(null);
    setState("working");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      const json = sub.toJSON();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
      });
      if (!res.ok) throw new Error("Could not save subscription");
      setState("on");
    } catch {
      setError("Could not turn on reminders. Try again.");
      setState("off");
    }
  }

  async function disable() {
    setError(null);
    setState("working");
    try {
      const reg = await navigator.serviceWorker.getRegistration("/sw.js");
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setState("off");
    } catch {
      setError("Could not turn off reminders. Try again.");
      setState("on");
    }
  }

  async function sendTest() {
    setTestMsg(null);
    try {
      const res = await fetch("/api/dev/notify", { method: "POST" });
      const data = (await res.json().catch(() => null)) as { sent?: number; error?: string } | null;
      if (!res.ok) {
        setTestMsg(data?.error ?? "Test failed");
        return;
      }
      setTestMsg(`Sent to ${data?.sent ?? 0} device(s).`);
    } catch {
      setTestMsg("Test failed");
    }
  }

  return (
    <section className="border border-line bg-panel rounded-md p-5 mb-4">
      <p className="eyebrow mb-3">Daily reminder</p>
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-canvas-dim">
          A 7:00 AM notification with the day&apos;s session and where you are on the plan.
        </p>
        {state === "unsupported" ? (
          <span className="font-mono text-xs text-canvas-dim shrink-0">Not supported</span>
        ) : state === "denied" ? (
          <span className="font-mono text-xs text-signal shrink-0">Blocked</span>
        ) : (
          <button
            type="button"
            onClick={state === "on" ? disable : enable}
            disabled={state === "loading" || state === "working"}
            aria-pressed={state === "on"}
            className="shrink-0 border border-brass text-brass font-display uppercase tracking-wider text-xs px-4 py-2 rounded-md hover:bg-brass hover:text-canvas transition-colors disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
          >
            {state === "on" ? "On" : state === "working" ? "…" : "Off"}
          </button>
        )}
      </div>
      {state === "denied" ? (
        <p className="mt-3 text-xs text-canvas-dim">
          Notifications are blocked for this site. Enable them in your browser settings, then
          reload.
        </p>
      ) : null}
      {error ? <p className="mt-3 text-xs text-signal">{error}</p> : null}
      {IS_DEV && state === "on" ? (
        <div className="mt-4 pt-4 border-t border-line flex items-center justify-between gap-4">
          <span className="font-mono text-xs text-canvas-dim">Dev: send now</span>
          <button
            type="button"
            onClick={sendTest}
            className="shrink-0 border border-line text-canvas-dim font-mono text-xs px-3 py-1.5 rounded-md hover:text-canvas hover:border-canvas-dim transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
          >
            Send test
          </button>
        </div>
      ) : null}
      {testMsg ? <p className="mt-2 font-mono text-xs text-canvas-dim">{testMsg}</p> : null}
    </section>
  );
}
