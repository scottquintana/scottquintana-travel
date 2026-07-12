import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import type { City } from "@/lib/types";

async function getCities(): Promise<City[]> {
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
        <header className="mb-12">
          <h1 className="text-3xl font-semibold text-[var(--color-text-primary)] mb-2">Places</h1>
          <p className="text-[var(--color-text-secondary)]">
            Food, drinks, and things to do across cities I love.
          </p>
        </header>

        {cities.length === 0 ? (
          <p className="text-[var(--color-text-muted)] text-sm">No cities yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {cities.map((city) => (
              <Link
                key={city.id}
                href={`/${city.slug}`}
                className="group block rounded-[var(--radius-xl)] overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] hover:border-[var(--color-accent-muted)] transition-all duration-200"
              >
                <div className="relative h-48 bg-[var(--color-surface-alt)]">
                  {city.cover_photo ? (
                    <Image
                      src={city.cover_photo}
                      alt={city.name}
                      fill
                      className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[var(--color-text-muted)] text-sm">
                      No photo
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h2 className="font-semibold text-[var(--color-text-primary)] mb-1">{city.name}</h2>
                  {city.description && (
                    <p className="text-sm text-[var(--color-text-secondary)] line-clamp-2">{city.description}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
