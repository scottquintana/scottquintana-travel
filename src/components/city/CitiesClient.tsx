"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, LayoutGrid, List } from "lucide-react";

interface CityWithCount {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  cover_photo: string | null;
  places: { count: number }[];
}

type ViewMode = "grid" | "list";

function ViewToggle({ mode, onChange }: { mode: ViewMode; onChange: (m: ViewMode) => void }) {
  return (
    <div className="flex items-center gap-0.5 border border-[var(--color-border)] rounded-[var(--radius-md)] p-0.5">
      <button
        onClick={() => onChange("grid")}
        className={`p-1.5 rounded-[var(--radius-sm)] transition-colors ${
          mode === "grid"
            ? "bg-[var(--color-accent)] text-white"
            : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
        }`}
        aria-label="Grid view"
      >
        <LayoutGrid size={14} />
      </button>
      <button
        onClick={() => onChange("list")}
        className={`p-1.5 rounded-[var(--radius-sm)] transition-colors ${
          mode === "list"
            ? "bg-[var(--color-accent)] text-white"
            : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
        }`}
        aria-label="List view"
      >
        <List size={14} />
      </button>
    </div>
  );
}

function GridCard({ city }: { city: CityWithCount }) {
  const count = city.places?.[0]?.count ?? 0;
  return (
    <Link
      href={`/${city.slug}`}
      className="group block rounded-[var(--radius-xl)] overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] hover:border-[var(--color-accent-muted)] transition-all duration-200 active:opacity-80 touch-manipulation"
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
      <div className="px-4 py-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-semibold text-[var(--color-text-primary)] [font-family:var(--font-display)]">{city.name}</h2>
          <span className="text-xs text-[var(--color-accent)] shrink-0">
            {count} {count === 1 ? "place" : "places"}
          </span>
        </div>
      </div>
    </Link>
  );
}

function ListRow({ city }: { city: CityWithCount }) {
  const count = city.places?.[0]?.count ?? 0;
  return (
    <Link
      href={`/${city.slug}`}
      className="flex items-center justify-between gap-3 py-3 px-1 border-b border-[var(--color-border)] last:border-0 hover:text-[var(--color-accent)] transition-colors active:opacity-70 touch-manipulation"
    >
      <span className="font-medium text-[var(--color-text-primary)] [font-family:var(--font-display)]">{city.name}</span>
      <span className="text-xs text-[var(--color-text-muted)] shrink-0">{count} {count === 1 ? "place" : "places"}</span>
    </Link>
  );
}

function SearchBar({ value, onChange, className = "" }: { value: string; onChange: (v: string) => void; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search cities…"
        className="w-full text-base pl-9 pr-4 py-2 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none focus:border-[var(--color-accent)] transition-colors"
      />
    </div>
  );
}

export function CitiesClient({ cities }: { cities: CityWithCount[] }) {
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [stickyVisible, setStickyVisible] = useState(false);
  const searchBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = searchBarRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setStickyVisible(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const filtered = query.trim()
    ? cities.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
    : cities;

  return (
    <>
      {/* Sticky header */}
      <div
        className={`fixed top-0 left-0 right-0 z-50 bg-[var(--color-bg)]/97 backdrop-blur-sm border-b border-[var(--color-border)] transition-transform duration-200 ${
          stickyVisible ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-[var(--color-text-primary)] [font-family:var(--font-display)]">Cities</span>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="text-sm text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-colors"
          >
            Back to top
          </button>
          <ViewToggle mode={viewMode} onChange={setViewMode} />
        </div>
      </div>

      {/* Hero */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-[var(--color-text-primary)] mb-2 [font-family:var(--font-display)]">
          Scott&apos;s Travel Recs
        </h1>
        <p className="text-[var(--color-text-secondary)] max-w-lg">
          After years of touring, I&apos;ve collected a good list of all of my favorites.
        </p>
      </div>

      {/* Cities row */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Cities</h2>
        <ViewToggle mode={viewMode} onChange={setViewMode} />
      </div>

      {/* Search bar (watched by IntersectionObserver) */}
      <div ref={searchBarRef} className="mb-6">
        <SearchBar value={query} onChange={setQuery} />
      </div>

      {/* City grid / list */}
      {filtered.length === 0 ? (
        <p className="text-[var(--color-text-muted)] text-sm">No cities match &ldquo;{query}&rdquo;.</p>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 items-start">
          {filtered.map((city) => <GridCard key={city.id} city={city} />)}
        </div>
      ) : (
        <div>
          {filtered.map((city) => <ListRow key={city.id} city={city} />)}
        </div>
      )}
    </>
  );
}
