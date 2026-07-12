import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PlaceForm } from "@/components/admin/PlaceForm";
import type { City } from "@/lib/types";

async function getCities(): Promise<City[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("cities").select("*").order("name");
    return data ?? [];
  } catch { return []; }
}

export default async function EditPlacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [supabase, cities] = await Promise.all([createClient(), getCities()]);
  const { data: place } = await supabase
    .from("places")
    .select("*, locations:place_locations(*)")
    .eq("id", id)
    .single();
  if (!place) notFound();
  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-xl font-semibold text-[var(--color-text-primary)] mb-6">Edit place</h1>
      <PlaceForm cities={cities} place={place} />
    </div>
  );
}
