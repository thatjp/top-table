"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

export type ResolvedVenue = {
  location: string;
  placeId: string;
  locationLat: number;
  locationLng: number;
};

type Props = {
  /** Controlled display string (address / name). */
  value: string;
  onChange: (value: string, resolved: ResolvedVenue | null) => void;
};

export function LocationAutocomplete({ value, onChange }: Props) {
  const listId = useId();
  const sessionTokenRef = useRef(crypto.randomUUID());
  const [input, setInput] = useState(value);
  const [suggestions, setSuggestions] = useState<{ placeId: string; description: string }[]>(
    [],
  );
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [busy, setBusy] = useState(false);
  const lastResolvedLabel = useRef<string | null>(null);

  useEffect(() => {
    setInput(value);
    if (lastResolvedLabel.current !== null && value !== lastResolvedLabel.current) {
      lastResolvedLabel.current = null;
    }
  }, [value]);

  function handleInputChange(next: string) {
    setInput(next);
    if (lastResolvedLabel.current !== null && next !== lastResolvedLabel.current) {
      lastResolvedLabel.current = null;
      onChange(next, null);
    } else if (lastResolvedLabel.current === null) {
      onChange(next, null);
    }
  }

  useEffect(() => {
    const q = input.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    const id = setTimeout(async () => {
      setBusy(true);
      try {
        const res = await fetch("/api/places/autocomplete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input: q,
            sessionToken: sessionTokenRef.current,
          }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          suggestions?: { placeId: string; description: string }[];
        };
        if (!res.ok) {
          setSuggestions([]);
          return;
        }
        setSuggestions(data.suggestions ?? []);
        setOpen((data.suggestions?.length ?? 0) > 0);
        setHighlight(-1);
      } catch {
        setSuggestions([]);
      } finally {
        setBusy(false);
      }
    }, 280);

    return () => clearTimeout(id);
  }, [input]);

  const pick = useCallback(
    async (placeId: string, description: string) => {
      setBusy(true);
      setOpen(false);
      try {
        const res = await fetch(
          `/api/places/details?placeId=${encodeURIComponent(placeId)}`,
          { method: "GET" },
        );
        const data = (await res.json().catch(() => ({}))) as {
          formattedAddress?: string;
          displayName?: string;
          latitude?: number;
          longitude?: number;
          placeId?: string;
          error?: string;
        };
        if (!res.ok || data.latitude == null || data.longitude == null) {
          setInput(description);
          onChange(description, null);
          lastResolvedLabel.current = null;
          return;
        }
        const label = (data.formattedAddress || data.displayName || description).slice(0, 500);
        setInput(label);
        lastResolvedLabel.current = label;
        onChange(label, {
          location: label,
          placeId: data.placeId ?? placeId,
          locationLat: data.latitude,
          locationLng: data.longitude,
        });
      } catch {
        setInput(description);
        onChange(description, null);
        lastResolvedLabel.current = null;
      } finally {
        setBusy(false);
      }
    },
    [onChange],
  );

  return (
    <div className="relative flex flex-col gap-1">
      <label htmlFor="venue-search" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        Where you played
      </label>
      <input
        id="venue-search"
        type="text"
        autoComplete="off"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        role="combobox"
        required
        maxLength={500}
        placeholder="Search for a bar or venue…"
        value={input}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 180)}
        onKeyDown={(e) => {
          if (!open || suggestions.length === 0) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlight((h) => (h + 1) % suggestions.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight((h) => (h <= 0 ? suggestions.length - 1 : h - 1));
          } else if (e.key === "Enter" && highlight >= 0) {
            e.preventDefault();
            const s = suggestions[highlight];
            if (s) void pick(s.placeId, s.description);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
      />
      {busy ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400" aria-live="polite">
          Searching…
        </p>
      ) : null}
      {open ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute top-full z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
        >
          {suggestions.map((s, i) => (
            <li key={s.placeId} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={i === highlight}
                className={`w-full px-3 py-2 text-left text-sm ${
                  i === highlight
                    ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                    : "text-zinc-800 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
                }`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => void pick(s.placeId, s.description)}
              >
                {s.description}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Pick a Google Places result when possible. You can still type a custom location if search is
        unavailable.
      </p>
    </div>
  );
}
