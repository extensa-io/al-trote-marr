"use client";

import {
  durationDigitsToMinutes,
  groupDurationDigits,
  minutesToDurationDigits,
  normalizeDurationDigits,
} from "@/lib/pace";

interface Props {
  id: string;
  label: string;
  digits: string;
  onDigits: (digits: string) => void;
  disabled?: boolean;
}

// Duration entry as a stream of digits, read right to left: 2845 is 28:45,
// 12832 is 1:28:32. The field carries the raw digits and renders them grouped,
// so a plain numeric keypad is enough — no colon, and no converting an
// hour-plus run into total minutes by hand.
export default function DurationField({ id, label, digits, onDigits, disabled }: Props) {
  const hintId = `${id}-hint`;

  // Deleting a digit shifts the rest right, which can leave a transient value
  // like 12:83. Rolling it over on blur settles the field on a real duration
  // (13:23) rather than leaving something that reads as broken.
  function settle() {
    const minutes = durationDigitsToMinutes(digits);
    if (minutes != null) onDigits(minutesToDurationDigits(minutes));
  }

  return (
    <label htmlFor={id} className="flex flex-col gap-1">
      <span className="eyebrow">{label}</span>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={groupDurationDigits(digits)}
        onChange={(e) => onDigits(normalizeDurationDigits(e.target.value))}
        onBlur={settle}
        disabled={disabled}
        placeholder="0:00"
        aria-describedby={hintId}
        className="w-full bg-panel border border-line rounded-md px-3 py-2 font-mono text-canvas placeholder:text-canvas-dim/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
      />
      <span id={hintId} className="font-mono text-canvas-dim text-xs">
        Digits only · 2845 → 28:45
      </span>
    </label>
  );
}
