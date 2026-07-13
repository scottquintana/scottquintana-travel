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
        <header className="mb-8">
          <h1 className="text-3xl font-semibold text-[var(--color-text-primary)] mb-2">Cities</h1>
          <p className="text-[var(--color-text-secondary)]">
            Food, drinks, and things to do across cities I love.
          </p>
        </header>

        <CitiesClient cities={cities} />
      </div>
    </main>
  );
}
