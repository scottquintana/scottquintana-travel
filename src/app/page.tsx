import { createClient } from "@/lib/supabase/server";
import { CitiesClient } from "@/components/city/CitiesClient";

async function getCities() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("cities")
      .select("*, places(count)")
      .order("name");
    if (error) throw error;
    return data ?? [];
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const cities = await getCities();

  return (
    <main className="min-h-screen bg-[var(--color-background)]">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <CitiesClient cities={cities} />
      </div>
    </main>
  );
}
