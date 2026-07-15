"use client";

import { useState } from "react";
import { ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";

interface FetchPhotosButtonProps {
  cityId: string;
}

export function FetchPhotosSection({ cityId }: FetchPhotosButtonProps) {
  const [status, setStatus] = useState<"idle" | "running" | "done">("idle");
  const [current, setCurrent] = useState("");
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState("");

  const handleFetch = async () => {
    setStatus("running");
    setSummary("");
    setCurrent("Loading places…");
    setProgress(0);
    setTotal(0);

    const supabase = createClient();
    const { data: places, error } = await supabase
      .from("places")
      .select("id, name, photos")
      .eq("city_id", cityId)
      .order("name");

    if (error || !places) {
      setStatus("idle");
      setCurrent("");
      alert("Failed to load places: " + (error?.message ?? "unknown error"));
      return;
    }

    const missing = places.filter((p) => !p.photos || p.photos.length === 0);

    if (missing.length === 0) {
      setStatus("done");
      setSummary("All places already have photos.");
      setCurrent("");
      return;
    }

    setTotal(missing.length);
    let updated = 0;
    let skipped = 0;

    for (let i = 0; i < missing.length; i++) {
      const place = missing[i];
      setCurrent(place.name);
      setProgress(i);

      try {
        const res = await fetch("/api/admin/places/google-import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: place.name }),
        });
        if (!res.ok) { skipped++; continue; }
        const data = await res.json();
        if (!data.photos?.length) { skipped++; continue; }

        await supabase
          .from("places")
          .update({ photos: data.photos })
          .eq("id", place.id);

        updated++;
      } catch {
        skipped++;
      }
    }

    setProgress(missing.length);
    setStatus("done");
    setCurrent("");
    setSummary(`${updated} updated, ${skipped} skipped.`);
  };

  const pct = total > 0 ? Math.round((progress / total) * 100) : 0;

  return (
    <div className="mt-8 border border-[var(--color-border)] rounded-[var(--radius-lg)] p-5">
      <div className="flex items-center gap-2 mb-1">
        <ImageIcon size={15} className="text-[var(--color-text-muted)]" />
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">Photos</h2>
      </div>
      <p className="text-xs text-[var(--color-text-muted)] mb-4">
        Fetch Google photos for all places that don&apos;t have any yet.
      </p>

      {status === "running" && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-[var(--color-text-muted)] truncate flex-1 mr-3">
              {current}
            </span>
            <span className="text-xs text-[var(--color-text-muted)] shrink-0">{pct}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-[var(--color-border)] overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--color-accent)] transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {status === "done" && summary && (
        <p className="text-xs text-[var(--color-text-muted)] mb-4">{summary}</p>
      )}

      <Button
        variant="secondary"
        size="sm"
        onClick={handleFetch}
        disabled={status === "running"}
      >
        {status === "running"
          ? <Loader2 size={13} className="animate-spin" />
          : <ImageIcon size={13} />}
        {status === "done" ? "Fetch again" : "Fetch missing photos"}
      </Button>
    </div>
  );
}
