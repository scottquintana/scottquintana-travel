"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { PlaceCard } from "@/components/places/PlaceCard";
import { CityMap } from "@/components/map/CityMap";
import { PlaceDetailPanel } from "@/components/places/PlaceDetailPanel";
import { formatCategory } from "@/lib/utils";
import { Map, List } from "lucide-react";
import type { City, Place } from "@/lib/types";
import { cn } from "@/lib/utils";

interface CityPageClientProps {
  city: City;
  places: Place[];
}

export function CityPageClient({ city, places }: CityPageClientProps) {
  const [hoveredPlaceId, setHoveredPlaceId] = useState<string | null>(null);
  const [panelPlace, setPanelPlace] = useState<Place | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showUnvetted, setShowUnvetted] = useState(true);
  const [mobileView, setMobileView] = useState<"list" | "map">("list");

  const openPanel = useCallback((place: Place) => {
    setPanelPlace(place);
  }, []);

  const handlePinClick = useCallback((placeId: string) => {
    const place = places.find((p) => p.id === placeId) ?? null;
    if (place) openPanel(place);
  }, [places, openPanel]);

  const categories = useMemo(() => {
    const cats = new Set(places.map((p) => p.category));
    return Array.from(cats).sort();
  }, [places]);

  const filteredPlaces = useMemo(() => {
    return places.filter((p) => {
      if (activeCategory && p.category !== activeCategory) return false;
      if (!showUnvetted && !p.vetted) return false;
      return true;
    });
  }, [places, activeCategory, showUnvetted]);

  const mapPins = useMemo(() => {
    return filteredPlaces.flatMap((place) =>
      (place.locations ?? []).map((location) => ({ place, location }))
    );
  }, [filteredPlaces]);

  return (
    <div className="flex flex-col h-screen bg-[var(--color-background)]">
      {/* Top nav */}
      <header className="shrink-0 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <Link href="/" className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors">
              ← All cities
            </Link>
            <h1 className="text-lg font-semibold text-[var(--color-text-primary)]">{city.name}</h1>
          </div>
          {/* Mobile view toggle */}
          <div className="flex md:hidden gap-1 bg-[var(--color-surface-alt)] p-1 rounded-[var(--radius-md)]">
            <button
              onClick={() => setMobileView("list")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-medium transition-colors",
                mobileView === "list"
                  ? "bg-[var(--color-surface)] text-[var(--color-text-primary)] shadow-[var(--shadow-sm)]"
                  : "text-[var(--color-text-muted)]"
              )}
            >
              <List size={13} /> List
            </button>
            <button
              onClick={() => setMobileView("map")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-medium transition-colors",
                mobileView === "map"
                  ? "bg-[var(--color-surface)] text-[var(--color-text-primary)] shadow-[var(--shadow-sm)]"
                  : "text-[var(--color-text-muted)]"
              )}
            >
              <Map size={13} /> Map
            </button>
          </div>
        </div>
      </header>

      {/* City description */}
      {city.description && (
        <div className="shrink-0 bg-[var(--color-surface)] px-4 py-4 border-b border-[var(--color-border-subtle)]">
          <p className="max-w-7xl mx-auto text-sm text-[var(--color-text-secondary)] leading-relaxed">
            {city.description}
          </p>
        </div>
      )}

      {/* Filter bar */}
      <div className="shrink-0 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-4 py-2">
        <div className="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveCategory(null)}
            className={cn(
              "shrink-0 text-xs px-3 py-1 rounded-[var(--radius-full)] border transition-colors",
              activeCategory === null
                ? "bg-[var(--color-accent)] text-white border-[var(--color-accent)]"
                : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent-muted)]"
            )}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat === activeCategory ? null : cat)}
              className={cn(
                "shrink-0 text-xs px-3 py-1 rounded-[var(--radius-full)] border transition-colors capitalize",
                activeCategory === cat
                  ? "bg-[var(--color-accent)] text-white border-[var(--color-accent)]"
                  : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent-muted)]"
              )}
            >
              {formatCategory(cat)}
            </button>
          ))}
          <div className="ml-auto shrink-0">
            <button
              onClick={() => setShowUnvetted((v) => !v)}
              className={cn(
                "text-xs px-3 py-1 rounded-[var(--radius-full)] border transition-colors",
                !showUnvetted
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : "border-[var(--color-border)] text-[var(--color-text-muted)]"
              )}
            >
              {showUnvetted ? "Hide unvetted" : "Show unvetted"}
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden w-full">
        {/* List panel — fixed narrow width, map gets the rest */}
        <div className={cn(
          "w-72 shrink-0 overflow-y-auto p-3 border-r border-[var(--color-border)]",
          mobileView === "map" ? "hidden md:block" : "block"
        )}>
          <p className="text-xs text-[var(--color-text-muted)] mb-2">
            {filteredPlaces.length} {filteredPlaces.length === 1 ? "place" : "places"}
          </p>
          <div className="flex flex-col gap-1.5">
            {filteredPlaces.map((place) => (
              <PlaceCard
                key={place.id}
                place={place}
                isSelected={panelPlace?.id === place.id || hoveredPlaceId === place.id}
                onHover={setHoveredPlaceId}
                onClick={openPanel}
              />
            ))}
            {filteredPlaces.length === 0 && (
              <p className="text-sm text-[var(--color-text-muted)]">No places match the current filter.</p>
            )}
          </div>
        </div>

        {/* Map panel — takes remaining space */}
        <div className={cn(
          "flex-1",
          mobileView === "list" ? "hidden md:block" : "block"
        )}>
          <CityMap
            pins={mapPins}
            selectedPlaceId={panelPlace?.id ?? hoveredPlaceId}
            focusedPlaceId={panelPlace?.id ?? null}
            onPinClick={handlePinClick}
          />
        </div>
      </div>

      {panelPlace && (
        <PlaceDetailPanel
          place={panelPlace}
          onClose={() => setPanelPlace(null)}
        />
      )}
    </div>
  );
}
