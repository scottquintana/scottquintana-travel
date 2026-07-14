"use client";

import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface DeleteAllPlacesButtonProps {
  cityId: string;
  cityName: string;
}

export function DeleteAllPlacesButton({ cityId, cityName }: DeleteAllPlacesButtonProps) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleDelete = async () => {
    const supabase = createClient();

    // Get count first so the confirm message is informative
    const { count } = await supabase
      .from("places")
      .select("id", { count: "exact", head: true })
      .eq("city_id", cityId);

    const n = count ?? 0;
    if (n === 0) {
      alert("No places to delete.");
      return;
    }

    const confirmed = window.confirm(
      `Delete all ${n} place${n !== 1 ? "s" : ""} in ${cityName}?\n\nThis cannot be undone. Export first if you want a backup.`
    );
    if (!confirmed) return;

    setLoading(true);

    // Get place IDs, delete locations first, then places
    const { data: places, error: fetchErr } = await supabase
      .from("places")
      .select("id")
      .eq("city_id", cityId);

    if (fetchErr || !places) {
      alert("Failed to fetch places: " + (fetchErr?.message ?? "unknown error"));
      setLoading(false);
      return;
    }

    const ids = places.map((p) => p.id);

    const { error: locErr } = await supabase
      .from("place_locations")
      .delete()
      .in("place_id", ids);

    if (locErr) {
      alert("Failed to delete locations: " + locErr.message);
      setLoading(false);
      return;
    }

    const { error: placeErr } = await supabase
      .from("places")
      .delete()
      .eq("city_id", cityId);

    if (placeErr) {
      alert("Failed to delete places: " + placeErr.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    setDone(true);
  };

  return (
    <button
      onClick={handleDelete}
      disabled={loading || done}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--radius-md)] text-xs font-medium border border-[var(--color-border)] text-[var(--color-danger)] hover:bg-[var(--color-danger-light)] transition-colors disabled:opacity-50"
    >
      {loading ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
      {done ? "Deleted" : "Delete all places"}
    </button>
  );
}
