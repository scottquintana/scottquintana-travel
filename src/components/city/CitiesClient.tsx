"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search } from "lucide-react";

interface CityWithCount {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  cover_photo: string | null;
  places: { count: number }[];
}

export function CitiesClient({ cities }: { cities: CityWithCount[] }) {
  const [query, setQuery] = useState("");

  const filtered = query.trim()
    ? cities.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
    : cities;

  return (
    <>
      <div className="relative mb-8">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search cities…"
          className="w-full text-base pl-9 pr-4 py-2.5 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none focus:border-[var(--color-accent)] transition-colors"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-[var(--color-text-muted)] text-sm">No cities match "{query}".</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {filtered.map((city) => {
            const count = city.places?.[0]?.count ?? 0;
            return (
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
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <h2 className="font-semibold text-[var(--color-text-primary)]">{city.name}</h2>
                    <span className="text-xs text-[var(--color-text-muted)] shrink-0">
                      {count} {count === 1 ? "place" : "places"}
                    </span>
                  </div>
                  {city.description && (
                    <p className="text-sm text-[var(--color-text-secondary)] line-clamp-2">{city.description}</p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
