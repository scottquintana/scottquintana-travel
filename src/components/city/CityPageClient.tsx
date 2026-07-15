"use client";

import { useState, useMemo, useCallback, useEffect, useLayoutEffect, useRef } from "react";
import Link from "next/link";
import { PlaceCard } from "@/components/places/PlaceCard";
import { CityMap } from "@/components/map/CityMap";
import { PlaceDetailPanel } from "@/components/places/PlaceDetailPanel";
import { MobileMapModal } from "@/components/map/MobileMapModal";
import { formatCategory, haversineDistanceMi, formatDistanceMi } from "@/lib/utils";
import { Map, LocateFixed, Loader2, X, ArrowRight, Maximize2, ChevronDown, ChevronUp } from "lucide-react";
import { geocodeAddress } from "@/lib/geocode";
import type { City, Place } from "@/lib/types";
import { cn, OVERLAY_CAPSULE } from "@/lib/utils";

const CATEGORY_COLORS: Record<string, string> = {
  food: "#e07040",
  drink: "#7c4fc4",
  activity: "#2d9e4a",
  stays: "#0891b2",
};

interface CityPageClientProps {
  city: City;
  places: Place[];
}

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [breakpoint]);
  return isMobile;
}



export function CityPageClient({ city, places }: CityPageClientProps) {
  const isMobile = useIsMobile();

  // useLayoutEffect fires synchronously before the browser paints, winning the race
  // against Chrome mobile's async scroll restoration (useEffect fires too late).
  useLayoutEffect(() => {
    if (typeof window !== "undefined") {
      history.scrollRestoration = "manual";
      window.scrollTo(0, 0);
    }
  }, []);
  const [hoveredPlaceId, setHoveredPlaceId] = useState<string | null>(null);
  const [panelPlace, setPanelPlace] = useState<Place | null>(null);
  const [selectedItemKey, setSelectedItemKey] = useState<string | null>(null);
  const [focusedLocationId, setFocusedLocationId] = useState<string | null>(null);
  const [activeCategories, setActiveCategories] = useState<Set<string>>(new Set());
  const [showUnvetted, setShowUnvetted] = useState(true);
  const [mobileMapOpen, setMobileMapOpen] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLabel, setLocationLabel] = useState<string | null>(null);
  const [locationSetViaGps, setLocationSetViaGps] = useState(false);
  const [savedAddress, setSavedAddress] = useState("");
  const [locationStatus, setLocationStatus] = useState<"idle" | "loading" | "denied">("idle");
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [locationInput, setLocationInput] = useState("");
  const [locationInputStatus, setLocationInputStatus] = useState<"idle" | "loading" | "error">("idle");
  const [sortBy, setSortBy] = useState<"az" | "distance">("az");
  const [mapResetToken, setMapResetToken] = useState(0);
  const resetMapView = useCallback(() => setMapResetToken((t) => t + 1), []);

  const clearLocation = useCallback(() => {
    setUserLocation(null);
    setLocationLabel(null);
    setLocationStatus("idle");
    setLocationSetViaGps(false);
    setSavedAddress("");
    setLocationInput("");
  }, []);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    setLocationStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationLabel("Your location");
        setLocationStatus("idle");
        setLocationSetViaGps(true);
        setSavedAddress("");
      },
      () => setLocationStatus("denied"),
      { timeout: 8000 }
    );
  }, []);

  const handleSetLocation = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const query = locationInput.trim();
    if (!query) return;
    setLocationInputStatus("loading");
    const coords = await geocodeAddress(query);
    if (coords) {
      setUserLocation(coords);
      setLocationLabel(query);
      setShowLocationInput(false);
      setLocationInput("");
      setLocationInputStatus("idle");
      setLocationSetViaGps(false);
      setSavedAddress(query);
    } else {
      setLocationInputStatus("error");
    }
  }, [locationInput]);

  useEffect(() => {
    setSortBy(userLocation ? "distance" : "az");
    if (userLocation) setShowLocationInput(false);
  }, [userLocation]);

  const locationInputRef = useRef<HTMLInputElement>(null);

  const toggleLocationInput = useCallback(() => {
    setShowLocationInput((prev) => {
      const next = !prev;
      if (next) {
        // Pre-populate with saved address when editing a typed location
        setLocationInput(!locationSetViaGps && savedAddress ? savedAddress : "");
        setLocationInputStatus("idle");
      }
      return next;
    });
  }, [locationSetViaGps, savedAddress]);

  useEffect(() => {
    if (showLocationInput) locationInputRef.current?.focus();
  }, [showLocationInput]);

  useEffect(() => {
    if (!showLocationInput) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setShowLocationInput(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [showLocationInput]);

  const closePanel = useCallback(() => {
    setPanelPlace(null);
    setSelectedItemKey(null);
    setFocusedLocationId(null);
  }, []);

  const openPanel = useCallback((place: Place, itemKey: string, locationId: string) => {
    setPanelPlace(place);
    setSelectedItemKey(itemKey);
    setFocusedLocationId(locationId);
    if (isMobile) setMobileMapOpen(true);
  }, [isMobile]);

  const handlePinClick = useCallback((placeId: string, locationId: string) => {
    const place = places.find((p) => p.id === placeId) ?? null;
    if (place) openPanel(place, locationId, locationId);
  }, [places, openPanel]);

  const closeMobileMap = useCallback(() => {
    setMobileMapOpen(false);
    closePanel();
  }, [closePanel]);

  const categories = useMemo(() => {
    const cats = new Set(places.flatMap((p) => p.categories ?? []));
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
      if (activeCategories.size > 0 && !(p.categories ?? []).some((c) => activeCategories.has(c))) return false;
      if (!showUnvetted && !p.vetted) return false;
      return true;
    });
  }, [places, activeCategories, showUnvetted]);

  const listItems = useMemo(() => {
    type ListItem = { place: Place; locationNote?: string; locationLat?: number; locationLng?: number; key: string; distanceLabel?: string };
    const items: ListItem[] = [];

    for (const place of filteredPlaces) {
      const locs = place.locations ?? [];
      if (locs.length === 0) {
        items.push({ place, key: place.id });
      } else {
        for (const loc of locs) {
          const distanceLabel = userLocation && loc.lat && loc.lng
            ? formatDistanceMi(haversineDistanceMi(userLocation.lat, userLocation.lng, loc.lat, loc.lng))
            : undefined;
          items.push({
            place,
            locationNote: loc.notes ?? undefined,
            locationLat: loc.lat,
            locationLng: loc.lng,
            key: loc.id,
            distanceLabel,
          });
        }
      }
    }

    if (sortBy === "distance" && userLocation) {
      items.sort((a, b) => {
        const dA = a.locationLat && a.locationLng ? haversineDistanceMi(userLocation.lat, userLocation.lng, a.locationLat, a.locationLng) : Infinity;
        const dB = b.locationLat && b.locationLng ? haversineDistanceMi(userLocation.lat, userLocation.lng, b.locationLat, b.locationLng) : Infinity;
        return dA - dB;
      });
    } else {
      items.sort((a, b) => a.place.name.localeCompare(b.place.name));
    }

    return items;
  }, [filteredPlaces, sortBy, userLocation]);

  const mapPins = useMemo(() => {
    return filteredPlaces.flatMap((place) =>
      (place.locations ?? []).map((location) => ({ place, location }))
    );
  }, [filteredPlaces]);

  return (
    <div className="flex flex-col h-screen bg-[var(--color-background)]">
      {/* Top nav */}
      <header className="shrink-0 border-b border-[var(--color-border)] bg-[var(--color-surface)] relative overflow-hidden">
        {/* Cover photo background — mobile always, desktop optional */}
        {city.cover_photo && (
          <div className="absolute inset-0" aria-hidden="true">
            <img src={city.cover_photo} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/55" />
            <div className="absolute inset-0 bg-[var(--color-accent)]/30" />
          </div>
        )}

        <div className="max-w-7xl mx-auto relative z-10">
          {/* Single-row layout for both mobile and desktop */}
          <div className="relative flex items-center justify-between gap-3 px-4 py-3">
            <Link
              href="/"
              className={city.cover_photo
                ? "shrink-0 inline-flex items-center gap-1 text-xs font-medium text-white/90 hover:text-white transition-colors [text-shadow:0_1px_4px_rgba(0,0,0,0.5)]"
                : "shrink-0 inline-flex items-center gap-1 text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
              }
            >
              ← All cities
            </Link>
            <h1
              className={cn(
                "text-lg font-semibold [font-family:var(--font-display)]",
                "text-right md:absolute md:left-1/2 md:-translate-x-1/2 md:text-center",
                city.cover_photo ? "text-white" : "text-[var(--color-text-primary)]"
              )}
              style={city.cover_photo ? { textShadow: "0 1px 4px rgba(0,0,0,0.7)" } : undefined}
            >
              {city.name}
            </h1>
          </div>
        </div>
      </header>

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
                    ? "text-[var(--color-text-primary)] font-medium shadow-[var(--shadow-sm)]"
                    : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent-muted)]"
                )}
                style={active ? {
                  backgroundColor: `${dotColor}18`,
                  borderColor: `${dotColor}60`,
                } : {}}
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
          <label className="ml-auto shrink-0 flex items-center gap-2 cursor-pointer select-none py-1 px-1">
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
      <div className="flex-1 flex overflow-hidden w-full relative">
        {/* Floating map button — mobile only */}
        <button
          onClick={() => setMobileMapOpen(true)}
          className="md:hidden absolute bottom-5 right-4 z-10 flex items-center gap-2 px-4 py-3 rounded-full bg-[var(--color-accent)] text-white text-sm font-medium shadow-[0_4px_16px_rgba(0,0,0,0.25)] hover:bg-[var(--color-accent-hover)] active:scale-95 transition-all touch-manipulation"
        >
          <Map size={15} /> Map
        </button>

        {/* List panel — full width on mobile, fixed narrow on desktop */}
        <div className="w-full md:w-72 md:shrink-0 overflow-y-auto p-3 pb-20 md:pb-3 md:border-r md:border-[var(--color-border)]">
          {/* Single row: count | location toggle | sort */}
          <div className="flex items-center gap-2 mb-2">
            <p className="text-xs text-[var(--color-text-muted)] shrink-0">
              {filteredPlaces.length} {filteredPlaces.length === 1 ? "place" : "places"}
            </p>
            <button
              onClick={toggleLocationInput}
              className={cn(
                "flex-1 flex items-center justify-center gap-0.5 text-xs transition-colors min-w-0",
                userLocation
                  ? "text-[var(--color-accent)] hover:text-[var(--color-accent-hover)]"
                  : showLocationInput
                  ? "text-[var(--color-accent)]"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-accent)]"
              )}
            >
              <span className="truncate">
                {userLocation ? "Edit location" : "Set location"}
              </span>
              {showLocationInput ? <ChevronUp size={10} className="shrink-0" /> : <ChevronDown size={10} className="shrink-0" />}
            </button>
            <div className="shrink-0 relative flex items-center">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "az" | "distance")}
                className="appearance-none text-xs text-[var(--color-text-muted)] bg-transparent border-none outline-none cursor-pointer pr-3"
              >
                <option value="az">A–Z</option>
                {userLocation && <option value="distance">Distance</option>}
              </select>
              <ChevronDown size={10} className="absolute right-0 pointer-events-none text-[var(--color-text-muted)]" />
            </div>
          </div>

          {/* Location input panel */}
          {showLocationInput && (
            <div className="mb-3 rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-3">
              {/* Clear location capsule — only when a location is already set */}
              {userLocation && (
                <div className="flex justify-end mb-2">
                  <button
                    onClick={() => { clearLocation(); setShowLocationInput(false); }}
                    className="text-xs px-2.5 py-1 rounded-full border border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-danger)] hover:text-[var(--color-danger)] transition-colors"
                  >
                    Clear location
                  </button>
                </div>
              )}
              <form onSubmit={handleSetLocation} className="flex flex-col gap-2">
                <input
                  ref={locationInputRef}
                  value={locationInput}
                  onChange={(e) => { setLocationInput(e.target.value); setLocationInputStatus("idle"); }}
                  placeholder="City, neighborhood, or address…"
                  className="w-full text-base px-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)] outline-none focus:border-[var(--color-accent)] transition-colors placeholder:text-[var(--color-text-muted)]"
                />
                {locationInputStatus === "error" && (
                  <p className="text-xs text-[var(--color-danger)]">Couldn't find that location — try being more specific.</p>
                )}
                <button
                  type="submit"
                  disabled={locationInputStatus === "loading" || !locationInput.trim()}
                  className="flex items-center justify-center gap-1.5 w-full py-2 rounded-[var(--radius-md)] bg-[var(--color-accent)] text-white text-sm font-medium hover:bg-[var(--color-accent-hover)] transition-colors disabled:opacity-50"
                >
                  {locationInputStatus === "loading" ? <Loader2 size={13} className="animate-spin" /> : <ArrowRight size={13} />}
                  {locationInputStatus === "loading" ? "Locating…" : "Set location"}
                </button>
              </form>
              <div className="flex items-center gap-2 my-3">
                <div className="flex-1 h-px bg-[var(--color-border-subtle)]" />
                <span className="text-xs text-[var(--color-text-muted)]">or</span>
                <div className="flex-1 h-px bg-[var(--color-border-subtle)]" />
              </div>
              <button
                onClick={() => { requestLocation(); }}
                disabled={locationStatus === "loading"}
                className="flex items-center justify-center gap-1.5 w-full py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-alt)] transition-colors disabled:opacity-50"
              >
                {locationStatus === "loading" ? <Loader2 size={13} className="animate-spin" /> : <LocateFixed size={13} />}
                {locationSetViaGps ? "Update current location" : "Use my location"}
              </button>
              {locationStatus === "denied" && (
                <p className="text-xs text-[var(--color-text-muted)] text-center mt-2">Location access was denied.</p>
              )}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            {listItems.map(({ place, locationNote, distanceLabel, key, locationLat, locationLng }) => {
              const locationId = locationLat !== undefined ? key : (place.locations?.[0]?.id ?? key);
              return (
                <PlaceCard
                  key={key}
                  place={place}
                  locationNote={locationNote}
                  isSelected={!isMobile && (selectedItemKey === key || (!selectedItemKey && hoveredPlaceId === place.id))}
                  distanceLabel={distanceLabel}
                  onHover={isMobile ? undefined : setHoveredPlaceId}
                  onClick={() => openPanel(place, key, locationId)}
                />
              );
            })}
            {listItems.length === 0 && (
              <p className="text-sm text-[var(--color-text-muted)]">No places match the current filter.</p>
            )}
          </div>
        </div>

        {/* Map panel — desktop only */}
        <div className="hidden md:flex flex-1 relative">
          <CityMap
            pins={mapPins}
            selectedPlaceId={panelPlace?.id ?? hoveredPlaceId}
            focusedLocationId={focusedLocationId}
            userLocation={userLocation}
            onPinClick={handlePinClick}
            onMapClick={closePanel}
            resetToken={mapResetToken}
          />
          <button
            onClick={resetMapView}
            title="Reset map view"
            className="absolute top-3 right-3 z-10 flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--radius-md)] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-sm)] text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-alt)] transition-colors"
          >
            <Maximize2 size={12} />
            Reset view
          </button>
        </div>
      </div>

      {/* Desktop detail panel */}
      {panelPlace && !isMobile && (
        <PlaceDetailPanel
          place={panelPlace}
          citySlug={city.slug}
          onClose={closePanel}
        />
      )}

      {/* Mobile map modal */}
      {mobileMapOpen && (
        <MobileMapModal
          city={city}
          pins={mapPins}
          focusedPlace={panelPlace}
          focusedLocationId={focusedLocationId}
          userLocation={userLocation}
          onPinClick={handlePinClick}
          onDismissPlace={closePanel}
          onClose={closeMobileMap}
          categories={categories}
          activeCategories={activeCategories}
          showUnvetted={showUnvetted}
          onToggleCategory={toggleCategory}
          onToggleShowUnvetted={() => setShowUnvetted((v) => !v)}
          resetToken={mapResetToken}
          onResetView={resetMapView}
        />
      )}
    </div>
  );
}
