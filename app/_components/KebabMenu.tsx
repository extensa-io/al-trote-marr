"use client";

import { useEffect, useRef, useState } from "react";

export interface MenuItem {
  label: string;
  onSelect: () => void;
  disabled?: boolean;
  destructive?: boolean;
}

interface Props {
  items: MenuItem[];
  label?: string;
  disabled?: boolean;
}

export default function KebabMenu({ items, label = "More actions", disabled }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="px-3 py-2 border border-line rounded-md text-canvas-dim hover:text-canvas disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass leading-none"
      >
        <span aria-hidden className="font-mono text-lg tracking-tight">⋮</span>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-10 mt-1 min-w-[10rem] bg-panel border border-line rounded-md py-1 shadow-lg"
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
              className={`block w-full text-left px-4 py-2 font-display uppercase tracking-wider text-sm disabled:opacity-60 hover:bg-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass ${
                item.destructive ? "text-signal" : "text-canvas-dim hover:text-canvas"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
