import "server-only";
import webpush from "web-push";
import type { PushSubscriptionDoc } from "./types";
import type { DailyMessage } from "./notify";

let configured = false;

function configure(): void {
  if (configured) return;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    throw new Error("VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT must be set");
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export interface SendResult {
  ok: boolean;
  /** true when the endpoint is gone (404/410) and should be pruned */
  expired: boolean;
}

export async function sendPush(
  sub: PushSubscriptionDoc,
  message: DailyMessage
): Promise<SendResult> {
  configure();
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: sub.keys },
      JSON.stringify(message)
    );
    return { ok: true, expired: false };
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode;
    return { ok: false, expired: status === 404 || status === 410 };
  }
}
