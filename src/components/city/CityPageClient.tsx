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

const CATEGORY_COLORS: Record<string, string> = {
  food: "#e07040",
  drink: "#7c4fc4",
  activity: "#2d9e4a",
};

interface CityPageClientProps {
  city: City;
  places: Place[];
}

export function CityPageClient({ city, places }: CityPageClientProps) {
  const [hoveredPlaceId, setHoveredPlaceId] = useState<string | null>(null);
  const [panelPlace, setPanelPlace] = useState<Place | null>(null);
  const [activeCategories, setActiveCategories] = useState<Set<string>>(new Set());
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

  const toggleCategory = useCallback((cat: string) => {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  }, []);

  const filteredPlaces = useMemo(() => {
    return places.filter((p) => {
      if (activeCategories.size > 0 && !activeCategories.has(p.category)) return false;
      if (!showUnvetted && !p.vetted) return false;
      return true;
    });
  }, [places, activeCategories, showUnvetted]);

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
          {categories.map((cat) => {
            const active = activeCategories.has(cat);
            const dotColor = CATEGORY_COLORS[cat] ?? "#6b7280";
            return (
              <button
                key={cat}
                onClick={() => toggleCategory(cat)}
                className={cn(
                  "shrink-0 flex items-center gap-1.5 text-xs px-3 py-1 rounded-[var(--radius-full)] border transition-colors capitalize",
                  active
                    ? "bg-[var(--color-surface-alt)] text-[var(--color-text-primary)] border-[var(--color-border)] font-medium shadow-[var(--shadow-sm)]"
                    : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent-muted)]"
                )}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: dotColor, opacity: active ? 1 : 0.45 }}
                />
                {formatCategory(cat)}
              </button>
            );
          })}
          {activeCategories.size > 0 && (
            <button
              onClick={() => setActiveCategories(new Set())}
              className="shrink-0 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              Clear
            </button>
          )}
          <label className="ml-auto shrink-0 flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={!showUnvetted}
              onChange={(e) => setShowUnvetted(!e.target.checked)}
              className="w-3.5 h-3.5 rounded accent-[var(--color-accent)] cursor-pointer"
            />
            <span className="text-xs text-[var(--color-text-muted)]">Vetted only</span>
          </label>
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
            onMapClick={() => setPanelPlace(null)}
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
