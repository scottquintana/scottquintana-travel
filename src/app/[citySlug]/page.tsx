import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CityPageClient } from "@/components/city/CityPageClient";
import type { City, Place } from "@/lib/types";

async function getCityData(slug: string): Promise<{ city: City; places: Place[] } | null> {
  try {
    const supabase = await createClient();
    const { data: city } = await supabase
      .from("cities")
      .select("*")
      .eq("slug", slug)
      .single();
    if (!city) return null;

    const { data: places } = await supabase
      .from("places")
      .select("*, locations:place_locations(*)")
      .eq("city_id", city.id)
      .order("name");

    return { city, places: places ?? [] };
  } catch {
    return null;
  }
}

export default async function CityPage({ params }: { params: Promise<{ citySlug: string }> }) {
  const { citySlug } = await params;
  const data = await getCityData(citySlug);
  if (!data) notFound();

  return <CityPageClient city={data.city} places={data.places} />;
}

export async function generateMetadata({ params }: { params: Promise<{ citySlug: string }> }) {
  const { citySlug } = await params;
  const data = await getCityData(citySlug);
  return { title: data ? `${data.city.name} - Scott Quintana` : "Not Found" };
}
