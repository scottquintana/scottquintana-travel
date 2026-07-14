"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";

interface ExportButtonProps {
  cityId: string;
  cityName: string;
}

export function ExportButton({ cityId, cityName }: ExportButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    const supabase = createClient();

    const { data: places, error } = await supabase
      .from("places")
      .select("*, locations:place_locations(*)")
      .eq("city_id", cityId)
      .order("name");

    if (error || !places) {
      setLoading(false);
      alert("Export failed: " + (error?.message ?? "unknown error"));
      return;
    }

    const payload = {
      places: places.map((place) => ({
        name: place.name,
        categories: place.categories ?? [],
        description: place.description ?? "",
        vetted: place.vetted ?? false,
        ...(place.website ? { website: place.website } : {}),
        ...(place.socials?.length ? { socials: place.socials } : {}),
        ...(place.recommendations?.length ? { recommendations: place.recommendations } : {}),
        ...(place.photos?.length ? { photos: place.photos } : {}),
        locations: (place.locations ?? []).map((loc: { address: string; lat: number; lng: number; notes: string | null }) => ({
          address: loc.address,
          lat: loc.lat,
          lng: loc.lng,
          ...(loc.notes ? { notes: loc.notes } : {}),
        })),
      })),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${cityName.toLowerCase().replace(/\s+/g, "-")}-places.json`;
    a.click();
    URL.revokeObjectURL(url);
    setLoading(false);
  };

  return (
    <Button variant="secondary" size="sm" onClick={handleExport} disabled={loading}>
      {loading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
      Export places
    </Button>
  );
}
