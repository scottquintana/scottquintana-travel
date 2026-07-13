"use client";

import Image from "next/image";
import { Badge } from "@/components/ui/Badge";
import { formatCategory } from "@/lib/utils";
import { X, ExternalLink, MapPin, Check, Copy, Map } from "lucide-react";
import { useState } from "react";
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
    window.open(`https://maps.google.com/?q=${encodeURIComponent(address)}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="flex items-start gap-1.5 min-w-0">
      <MapPin size={11} className="text-[var(--color-text-muted)] shrink-0 mt-0.5" />
      <span className="text-xs text-[var(--color-text-muted)] leading-snug">{address}</span>
      <div className="flex items-center gap-1 shrink-0 ml-1">
        <button
          onClick={copy}
          title="Copy address"
          className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-alt)] transition-colors"
        >
          {copied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
        </button>
        <button
          onClick={openMaps}
          title="Open in Google Maps"
          className="p-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-alt)] transition-colors"
        >
          <Map size={11} />
        </button>
      </div>
    </div>
  );
}

export function PlaceDetailPanel({ place, onClose }: PlaceDetailPanelProps) {
  const dotColor = CATEGORY_DOT[place.category] ?? "bg-gray-400";
  const firstLocation = place.locations?.[0];
  const photo = place.photos?.[0];

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 md:hidden"
        onClick={onClose}
      />

      {/* Mobile: bottom sheet / Desktop: slim bottom strip */}
      <div className="fixed z-50 bottom-0 left-0 right-0 bg-[var(--color-surface)] border-t border-[var(--color-border)] shadow-[var(--shadow-lg)]
        rounded-t-2xl md:rounded-none
        max-h-[72vh] md:max-h-none
        overflow-y-auto md:overflow-visible
        flex flex-col md:flex-row md:items-center md:gap-5 md:px-4 md:py-2.5
      ">

        {/* Mobile drag handle */}
        <div className="w-8 h-1 bg-[var(--color-border)] rounded-full mx-auto mt-3 mb-1 md:hidden" />

        {/* Photo — full width on mobile, small thumbnail on desktop */}
        {photo && (
          <>
            <div className="relative h-44 w-full md:hidden shrink-0">
              <Image src={photo} alt={place.name} fill className="object-cover" />
            </div>
            <div className="hidden md:block relative w-12 h-12 shrink-0 rounded-[var(--radius-md)] overflow-hidden border border-[var(--color-border)]">
              <Image src={photo} alt={place.name} fill className="object-cover" />
            </div>
          </>
        )}

        {/* Identity */}
        <div className="flex items-center gap-2.5 px-4 pt-3 pb-1 md:p-0 md:shrink-0">
          <div className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
          <div>
            <div className="flex items-center gap-1.5">
              <p className="font-semibold text-sm text-[var(--color-text-primary)] leading-snug whitespace-nowrap">{place.name}</p>
              {place.vetted && <Check size={12} className="text-emerald-500 shrink-0" />}
            </div>
            <Badge variant="category" className="mt-0.5">{formatCategory(place.category)}</Badge>
          </div>
        </div>

        {/* Divider — desktop only */}
        <div className="hidden md:block h-8 w-px bg-[var(--color-border)] shrink-0" />

        {/* Description */}
        {place.description && (
          <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed px-4 py-1 md:p-0 md:line-clamp-2 md:max-w-xs min-w-0">
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

        {/* Address + website */}
        <div className="flex flex-col gap-2 px-4 py-2 md:p-0 md:shrink-0 md:max-w-[260px]">
          {firstLocation && <AddressActions address={firstLocation.address} />}
          {place.website && (
            <a
              href={place.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-[var(--color-accent)] hover:underline"
            >
              <ExternalLink size={11} className="shrink-0" />
              <span className="truncate">{place.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}</span>
            </a>
          )}
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 md:static md:ml-auto md:shrink-0 p-1.5 rounded-[var(--radius-md)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] transition-colors"
          aria-label="Close"
        >
          <X size={15} />
        </button>
      </div>
    </>
  );
}
