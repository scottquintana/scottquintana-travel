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

export default async function NewPlacePage() {
  const cities = await getCities();
  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-xl font-semibold text-[var(--color-text-primary)] mb-6">New place</h1>
      <PlaceForm cities={cities} />
    </div>
  );
}
