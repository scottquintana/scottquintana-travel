import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PlaceDetail } from "@/components/places/PlaceDetail";
import type { Place } from "@/lib/types";
import siteConfig from "@/lib/siteConfig";

async function getPlace(citySlug: string, placeSlug: string): Promise<Place | null> {
  try {
    const supabase = await createClient();
    const { data: city } = await supabase.from("cities").select("*").eq("slug", citySlug).single();
    if (!city) return null;
    const { data: place } = await supabase
      .from("places")
      .select("*, locations:place_locations(*)")
      .eq("city_id", city.id)
      .eq("slug", placeSlug)
      .single();
    if (!place) return null;
    return { ...place, city };
  } catch {
    return null;
  }
}

export default async function PlacePage({ params }: { params: Promise<{ citySlug: string; placeSlug: string }> }) {
  const { citySlug, placeSlug } = await params;
  const place = await getPlace(citySlug, placeSlug);
  if (!place) notFound();

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <div className="max-w-2xl mx-auto py-8 px-4">
        <PlaceDetail place={place} citySlug={citySlug} />
      </div>
    </div>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ citySlug: string; placeSlug: string }> }) {
  const { citySlug, placeSlug } = await params;
  const place = await getPlace(citySlug, placeSlug);
  return { title: place ? `${place.name} - ${siteConfig.ownerName}` : "Not Found" };
}
