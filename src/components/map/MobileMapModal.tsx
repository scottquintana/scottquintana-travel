"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, MapPin, Copy, Check, ExternalLink, Maximize2 } from "lucide-react";
import Link from "next/link";
import { CityMap } from "@/components/map/CityMap";
import { formatCategory, cn } from "@/lib/utils";
import type { City, Place, PlaceLocation } from "@/lib/types";

interface MapPin {
  place: Place;
  location: PlaceLocation;
}

const CATEGORY_COLORS: Record<string, string> = {
  food: "#e07040",
  drink: "#7c4fc4",
  activity: "#2d9e4a",
};

function categoryDotStyle(categories: string[]): React.CSSProperties {
  const cats = (categories ?? []).filter(Boolean);
  if (cats.length >= 2) {
    const c1 = CATEGORY_COLORS[cats[0]] ?? "#9ca3af";
    const c2 = CATEGORY_COLORS[cats[1]] ?? "#9ca3af";
    return { background: `linear-gradient(135deg, ${c1} 50%, ${c2} 50%)` };
  }
  return { background: CATEGORY_COLORS[cats[0]] ?? "#9ca3af" };
}

const CATEGORY_TEXT_COLOR: Record<string, string> = {
  food: "#e07040",
  drink: "#7c4fc4",
  activity: "#2d9e4a",
};

function AddressActions({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openMaps = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.location.href = `https://maps.google.com/?q=${encodeURIComponent(address)}`;
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-start gap-2">
        <MapPin size={14} className="text-[var(--color-text-muted)] shrink-0 mt-0.5" />
        <span className="text-sm text-[var(--color-text-secondary)]">{address}</span>
      </div>
      <div className="flex gap-2">
        <button
          onClick={copy}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-alt)] transition-colors"
        >
          {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
          {copied ? "Copied" : "Copy address"}
        </button>
        <button
          onClick={openMaps}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-alt)] transition-colors"
        >
          <ExternalLink size={12} />
          Open in Maps
        </button>
      </div>
    </div>
  );
}

const PEEK_H = "38vh";
const EXPANDED_H = "68vh";
const DRAG_THRESHOLD = 60;

function MobileDetailSheet({ place, citySlug, focusedLocationId, visible, onDismiss }: { place: Place; citySlug: string; focusedLocationId: string | null; visible: boolean; onDismiss: () => void }) {
  const [snap, setSnap] = useState<"peek" | "expanded">("peek");
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef(0);
  const snapRef = useRef(snap);
  snapRef.current = snap;

  useEffect(() => {
    setSnap("peek");
    setDragOffset(0);
  }, [place.id]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    startY.current = e.clientY;
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const delta = e.clientY - startY.current;
    if (delta < -DRAG_THRESHOLD && snapRef.current === "peek") {
      setSnap("expanded");
      setIsDragging(false);
      setDragOffset(0);
      e.currentTarget.releasePointerCapture(e.pointerId);
    } else {
      setDragOffset(Math.max(0, delta));
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    setIsDragging(false);
    setDragOffset((prev) => {
      if (prev > DRAG_THRESHOLD) {
        if (snapRef.current === "expanded") setSnap("peek");
        else onDismiss();
      }
      return 0;
    });
  };

  const firstLocation = (focusedLocationId
    ? place.locations?.find((l) => l.id === focusedLocationId)
    : null) ?? place.locations?.[0];
  const dotStyle = categoryDotStyle(place.categories ?? []);

  const translateY = isDragging && dragOffset > 0
    ? `translateY(${dragOffset}px)`
    : !visible
    ? "translateY(100%)"
    : "translateY(0)";

  return (
    <div
      style={{
        height: snap === "expanded" ? EXPANDED_H : PEEK_H,
        transform: translateY,
        transition: isDragging ? "none" : "height 0.25s ease, transform 0.28s ease",
      }}
      className="bg-[var(--color-surface)] border-t border-[var(--color-border)] shadow-[var(--shadow-lg)] flex flex-col overflow-hidden"
    >
      {/* Drag handle */}
      <div
        className="relative flex items-center justify-center py-2.5 shrink-0 select-none touch-none cursor-grab active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div className="w-8 h-1 bg-[var(--color-border)] rounded-full" />
      </div>

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-10">
        {/* Identity */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={dotStyle} />
          <span className="font-semibold text-base text-[var(--color-text-primary)]">{place.name}</span>
          {place.vetted && <Check size={14} className="text-emerald-500 shrink-0" />}
          <span className="ml-auto flex items-center gap-1 text-xs font-medium">
            {(place.categories ?? []).map((cat, i) => (
              <span key={cat}>
                {i > 0 && <span className="text-[var(--color-text-muted)] mx-0.5">·</span>}
                <span style={{ color: CATEGORY_TEXT_COLOR[cat] ?? "var(--color-text-muted)" }} className="capitalize">
                  {formatCategory(cat)}
                </span>
              </span>
            ))}
          </span>
        </div>

        {/* Address */}
        {firstLocation?.address && (
          <div className="mb-3">
            <AddressActions address={firstLocation.address} />
          </div>
        )}

        {/* Website */}
        {place.website && (
          <a
            href={place.website}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-[var(--color-accent)] hover:underline mb-4"
          >
            <ExternalLink size={13} className="shrink-0" />
            <span className="truncate">{place.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}</span>
          </a>
        )}

        <div className="h-px bg-[var(--color-border-subtle)] mb-4" />

        {/* Description */}
        {place.description && (
          <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed mb-4">{place.description}</p>
        )}

        {/* Recommendations */}
        {place.recommendations && place.recommendations.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-medium text-[var(--color-text-muted)] mb-2">Recommendations:</p>
            <div className="flex flex-wrap gap-1.5">
              {place.recommendations.map((r, i) => (
                <span key={i} className="text-xs px-2.5 py-1 bg-[var(--color-accent-light)] text-[var(--color-accent)] rounded-[var(--radius-full)]">
                  {r}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Socials */}
        {place.socials && place.socials.length > 0 && (
          <div className="flex flex-wrap gap-3 mb-4">
            {place.socials.map((s, i) => (
              <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
                className="text-sm text-[var(--color-accent)] hover:underline capitalize">
                {s.platform}
              </a>
            ))}
          </div>
        )}

        {/* Full details link */}
        <Link
          href={`/${citySlug}/${place.slug}`}
          className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-[var(--radius-md)] border border-[var(--color-border)] text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-alt)] transition-colors"
        >
          View full details
          <ExternalLink size={13} className="shrink-0" />
        </Link>
      </div>
    </div>
  );
}

export interface MobileMapModalProps {
  city: City;
  pins: MapPin[];
  focusedPlace: Place | null;
  focusedLocationId: string | null;
  userLocation: { lat: number; lng: number } | null;
  onPinClick: (placeId: string, locationId: string) => void;
  onDismissPlace: () => void;
  onClose: () => void;
  categories: string[];
  activeCategories: Set<string>;
  showUnvetted: boolean;
  onToggleCategory: (cat: string) => void;
  onToggleShowUnvetted: () => void;
  resetToken?: number;
  onResetView?: () => void;
}

export function MobileMapModal({
  city, pins, focusedPlace, focusedLocationId, userLocation, onPinClick, onDismissPlace, onClose,
  categories, activeCategories, showUnvetted, onToggleCategory, onToggleShowUnvetted,
  resetToken, onResetView,
}: MobileMapModalProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [mapResizeToken, setMapResizeToken] = useState(0);
  // Keep the last place in state so the sheet can animate out before unmounting
  const [displayedPlace, setDisplayedPlace] = useState<Place | null>(focusedPlace);
  const [sheetVisible, setSheetVisible] = useState(!!focusedPlace);

  // Modal slide-up on mount; trigger a map resize after animation so OverlayViews position correctly
  useEffect(() => {
    const id = requestAnimationFrame(() => setModalVisible(true));
    const resizeId = setTimeout(() => setMapResizeToken((t) => t + 1), 320);
    return () => { cancelAnimationFrame(id); clearTimeout(resizeId); };
  }, []);

  // Animate sheet in/out as focusedPlace changes
  useEffect(() => {
    if (focusedPlace) {
      setDisplayedPlace(focusedPlace);
      requestAnimationFrame(() => setSheetVisible(true));
    } else {
      setSheetVisible(false);
      const t = setTimeout(() => setDisplayedPlace(null), 300);
      return () => clearTimeout(t);
    }
  }, [focusedPlace]);

  const handleClose = useCallback(() => {
    setModalVisible(false);
    setTimeout(onClose, 280);
  }, [onClose]);

  const filtersHidden = !!focusedPlace;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex flex-col bg-[var(--color-background)] transition-transform duration-300 ease-out",
        modalVisible ? "translate-y-0" : "translate-y-full"
      )}
    >
      {/* Top bar */}
      <div className="shrink-0 flex items-center justify-end px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <button
          onClick={handleClose}
          aria-label="Close map"
          className="p-1.5 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* Map */}
      <div className="flex-1 relative min-h-0">
        <CityMap
          pins={pins}
          selectedPlaceId={focusedPlace?.id ?? null}
          focusedLocationId={focusedLocationId}
          userLocation={userLocation}
          onPinClick={onPinClick}
          onMapClick={focusedPlace ? onDismissPlace : undefined}
          resetToken={resetToken}
          resizeToken={mapResizeToken}
        />

        {/* Floating filter bar + reset button row */}
        <div className={cn(
          "absolute top-3 left-3 right-3 z-10 flex items-center justify-between gap-2",
          filtersHidden ? "pointer-events-none" : ""
        )}>
          <div className={cn(
            "transition-opacity duration-200",
            filtersHidden ? "opacity-0" : "opacity-100"
          )}>
          <div className="flex items-center gap-1.5 bg-[var(--color-surface)] rounded-[var(--radius-full)] shadow-[var(--shadow-md)] px-3 py-2 overflow-x-auto">
            {categories.map((cat) => {
              const active = activeCategories.has(cat);
              const color = CATEGORY_COLORS[cat] ?? "#6b7280";
              return (
                <button
                  key={cat}
                  onClick={() => onToggleCategory(cat)}
                  className={cn(
                    "shrink-0 flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-[var(--radius-full)] border transition-colors capitalize",
                    active
                      ? "bg-[var(--color-surface-alt)] text-[var(--color-text-primary)] border-[var(--color-border)] font-medium"
                      : "border-transparent text-[var(--color-text-secondary)]"
                  )}
                >
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color, opacity: active ? 1 : 0.5 }} />
                  {cat}
                </button>
              );
            })}
          </div>
          </div>

          <button
            onClick={onResetView}
            title="Reset map view"
            className="shrink-0 pointer-events-auto flex items-center gap-1 px-2.5 py-1.5 rounded-[var(--radius-md)] bg-[var(--color-surface)] border border-[var(--color-border)] shadow-[var(--shadow-sm)] text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-alt)] transition-colors"
          >
            <Maximize2 size={12} />
            Reset
          </button>
        </div>

        {/* Tap hint — fades out when a place is selected */}
        <div className={cn(
          "absolute bottom-0 left-0 right-0 py-3 flex items-center justify-center bg-[var(--color-surface)]/80 backdrop-blur-sm transition-opacity duration-200",
          filtersHidden ? "opacity-0 pointer-events-none" : "opacity-100"
        )}>
          <p className="text-xs text-[var(--color-text-secondary)]">Tap a pin for more info</p>
        </div>
      </div>

      {/* Detail sheet — always rendered while displayedPlace is set, visibility controlled by sheetVisible */}
      {displayedPlace && (
        <MobileDetailSheet
          place={displayedPlace}
          citySlug={city.slug}
          focusedLocationId={focusedLocationId}
          visible={sheetVisible}
          onDismiss={onDismissPlace}
        />
      )}
    </div>
  );
}
