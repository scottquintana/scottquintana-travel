"use client";

import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { formatCategory, cn } from "@/lib/utils";
import { X, ExternalLink, MapPin, Check, Copy, Map } from "lucide-react";
import { useState } from "react";
import type { Place } from "@/lib/types";

interface PlaceDetailPanelProps {
  place: Place;
  citySlug: string;
  onClose: () => void;
}

const CATEGORY_HEX: Record<string, string> = {
  food: "#e07040",
  drink: "#7c4fc4",
  activity: "#2d9e4a",
};

function categoryDotStyle(categories: string[]): React.CSSProperties {
  const cats = (categories ?? []).filter(Boolean);
  if (cats.length >= 2) {
    const c1 = CATEGORY_HEX[cats[0]] ?? "#9ca3af";
    const c2 = CATEGORY_HEX[cats[1]] ?? "#9ca3af";
    return { background: `linear-gradient(135deg, ${c1} 50%, ${c2} 50%)` };
  }
  return { background: CATEGORY_HEX[cats[0]] ?? "#9ca3af" };
}

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
    <div className="flex flex-col gap-1.5 min-w-0">
      <div className="flex items-start gap-1.5">
        <MapPin size={11} className="text-[var(--color-text-muted)] shrink-0 mt-0.5" />
        <span className="text-xs text-[var(--color-text-muted)] leading-snug">{address}</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={copy}
          className="flex items-center gap-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-alt)] px-2 py-1 rounded transition-colors"
        >
          {copied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
          {copied ? "Copied" : "Copy address"}
        </button>
        <button
          onClick={openMaps}
          className="flex items-center gap-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-alt)] px-2 py-1 rounded transition-colors"
        >
          <Map size={11} />
          Open in Maps
        </button>
      </div>
    </div>
  );
}

export function PlaceDetailPanel({ place, citySlug, onClose }: PlaceDetailPanelProps) {
  const dotStyle = categoryDotStyle(place.categories ?? []);
  const firstLocation = place.locations?.[0];
  const photo = place.photos?.[0];


  return (
    <>
      {/* Mobile backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40 md:hidden" onClick={onClose} />

      <div className={cn(
        "fixed z-50 bottom-0 left-0 right-0 bg-[var(--color-surface)] border-t border-[var(--color-border)] shadow-[var(--shadow-lg)]",
        "rounded-t-2xl md:rounded-none",
        "max-h-[72vh] md:max-h-none",
        "overflow-y-auto md:overflow-visible",
        "flex flex-col md:flex-row md:gap-5 md:px-4 md:py-3 md:items-center",
      )}>

        {/* Mobile drag handle */}
        <div className="w-8 h-1 bg-[var(--color-border)] rounded-full mx-auto mt-3 mb-1 md:hidden" />

        {/* Photo */}
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
          <div className="w-2 h-2 rounded-full shrink-0" style={dotStyle} />
          <div>
            <div className="flex items-center gap-1.5">
              <p className="font-semibold text-sm text-[var(--color-text-primary)] leading-snug whitespace-nowrap">{place.name}</p>
              {place.vetted && <Check size={12} className="text-emerald-500 shrink-0" />}
            </div>
            <div className="flex flex-wrap gap-1 mt-0.5">
              {(place.categories ?? []).map((c) => (
                <Badge key={c} variant="category">{formatCategory(c)}</Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Divider — desktop only */}
        <div className="hidden md:block h-8 w-px bg-[var(--color-border)] shrink-0 mt-1" />

        {/* Description */}
        {place.description && (
          <div className="px-4 py-1 md:p-0 min-w-0 md:max-w-sm">
            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed md:line-clamp-3">
              {place.description}
            </p>
            <Link
              href={`/${citySlug}/${place.slug}`}
              className="text-xs text-[var(--color-accent)] hover:underline mt-1 inline-block"
            >
              Read more →
            </Link>
          </div>
        )}

        {/* Recommendations */}
        {place.recommendations && place.recommendations.length > 0 && (
          <div className="px-4 py-1 md:p-0 md:shrink-0 md:max-w-[160px]">
            <div className="flex flex-wrap gap-1">
              {place.recommendations.map((r, i) => (
                <Badge key={i} variant="accent">{r}</Badge>
              ))}
            </div>
          </div>
        )}

        {/* Address + website */}
        <div className="flex flex-col gap-2 px-4 py-2 md:p-0 md:shrink-0">
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
