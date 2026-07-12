"use client";

import Image from "next/image";
import { Badge } from "@/components/ui/Badge";
import { formatCategory } from "@/lib/utils";
import { X, ExternalLink, MapPin, Check } from "lucide-react";
import type { Place } from "@/lib/types";

interface PlaceDetailPanelProps {
  place: Place;
  onClose: () => void;
}

const CATEGORY_DOT: Record<string, string> = {
  food: "bg-[#e07040]",
  drink: "bg-[#7c4fc4]",
  activity: "bg-[#2d9e4a]",
};

export function PlaceDetailPanel({ place, onClose }: PlaceDetailPanelProps) {
  const dotColor = CATEGORY_DOT[place.category] ?? "bg-gray-400";
  const firstLocation = place.locations?.[0];

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 md:hidden"
        onClick={onClose}
      />

      {/* Mobile: full bottom sheet / Desktop: slim bottom strip */}
      <div className="fixed z-50 bottom-0 left-0 right-0 bg-[var(--color-surface)] border-t border-[var(--color-border)] shadow-[var(--shadow-lg)]
        rounded-t-2xl md:rounded-none
        max-h-[72vh] md:max-h-none
        overflow-y-auto md:overflow-visible
        flex flex-col md:flex-row md:items-center md:gap-6 md:px-6 md:py-3.5
      ">

        {/* Mobile drag handle */}
        <div className="w-8 h-1 bg-[var(--color-border)] rounded-full mx-auto mt-3 mb-1 md:hidden" />

        {/* Photo — mobile only */}
        {place.photos && place.photos.length > 0 && (
          <div className="relative h-44 w-full md:hidden shrink-0">
            <Image src={place.photos[0]} alt={place.name} fill className="object-cover" />
          </div>
        )}

        {/* Identity */}
        <div className="flex items-center gap-2.5 px-4 pt-3 pb-1 md:p-0 md:shrink-0">
          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotColor}`} />
          <div>
            <div className="flex items-center gap-1.5">
              <p className="font-semibold text-sm text-[var(--color-text-primary)] leading-snug">{place.name}</p>
              {place.vetted && <Check size={13} className="text-emerald-500 shrink-0" />}
            </div>
            <Badge variant="category" className="mt-0.5">{formatCategory(place.category)}</Badge>
          </div>
        </div>

        {/* Divider — desktop only */}
        <div className="hidden md:block h-8 w-px bg-[var(--color-border)] shrink-0" />

        {/* Description */}
        {place.description && (
          <p className="flex-1 text-xs text-[var(--color-text-secondary)] leading-relaxed px-4 py-1 md:p-0 md:line-clamp-2 min-w-0">
            {place.description}
          </p>
        )}

        {/* Recommendations */}
        {place.recommendations && place.recommendations.length > 0 && (
          <div className="px-4 py-1 md:p-0 md:shrink-0">
            <div className="flex flex-wrap gap-1">
              {place.recommendations.map((r, i) => (
                <Badge key={i} variant="accent">{r}</Badge>
              ))}
            </div>
          </div>
        )}

        {/* Location + Website — desktop shows inline, mobile shows stacked */}
        <div className="flex flex-col gap-1 px-4 py-2 md:p-0 md:shrink-0 md:flex-row md:items-center md:gap-4">
          {firstLocation && (
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(firstLocation.address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-accent)]"
            >
              <MapPin size={11} className="shrink-0" />
              <span className="md:max-w-[180px] truncate">{firstLocation.address}</span>
            </a>
          )}
          {place.website && (
            <a
              href={place.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-[var(--color-accent)] hover:underline"
            >
              <ExternalLink size={11} />
              {place.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
            </a>
          )}
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 md:static md:shrink-0 p-1.5 rounded-[var(--radius-md)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] transition-colors"
          aria-label="Close"
        >
          <X size={15} />
        </button>
      </div>
    </>
  );
}
