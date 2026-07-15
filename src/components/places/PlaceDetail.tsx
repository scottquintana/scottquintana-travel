"use client";

import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { formatCategory, googleMapsUrl, appleMapsUrl } from "@/lib/utils";
import { useState } from "react";
import { MapPin, Globe, Share2, ExternalLink, X } from "lucide-react";
import type { Place } from "@/lib/types";
import { CATEGORY_COLORS, CATEGORY_COLOR_DEFAULT } from "@/lib/categoryColors";
import siteConfig from "@/lib/siteConfig";

interface PlaceDetailProps {
  place: Place;
  citySlug: string;
  onClose?: () => void;
  isModal?: boolean;
}


const SOCIAL_ICONS: Record<string, string> = {
  instagram: "Instagram",
  twitter: "Twitter / X",
  facebook: "Facebook",
  tiktok: "TikTok",
  yelp: "Yelp",
};

export function PlaceDetail({ place, citySlug, onClose, isModal }: PlaceDetailProps) {
  const [erroredPhotos, setErroredPhotos] = useState<Set<number>>(new Set());

  const handleShare = async () => {
    const url = `${window.location.origin}/${citySlug}/${place.slug}`;
    if (navigator.share) {
      await navigator.share({ title: place.name, url });
    } else {
      await navigator.clipboard.writeText(url);
      alert("Link copied!");
    }
  };

  return (
    <div className="relative bg-[var(--color-surface)] flex flex-col h-full overflow-y-auto">
      {/* Header actions */}
      <div className="sticky top-0 z-10 bg-[var(--color-surface)] border-b border-[var(--color-border)] px-4 py-3 flex items-center justify-between">
        <Link
          href={`/${citySlug}`}
          className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors"
        >
          ← Back to {place.city?.name ?? citySlug}
        </Link>
        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            className="p-1.5 rounded-[var(--radius-md)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-text-primary)] transition-colors"
            title="Share"
          >
            <Share2 size={16} />
          </button>
          {isModal && onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-[var(--radius-md)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-text-primary)] transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="p-4 flex flex-col gap-4">
        {/* Title + badges */}
        <div>
          <div className="flex items-start justify-between gap-2 mb-2">
            <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">{place.name}</h1>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(place.categories ?? []).map((c) => {
              const hex = CATEGORY_COLORS[c] ?? CATEGORY_COLOR_DEFAULT;
              return (
                <span
                  key={c}
                  className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-[var(--radius-full)] capitalize"
                  style={{ backgroundColor: `${hex}18`, color: hex, border: `1px solid ${hex}60` }}
                >
                  {formatCategory(c)}
                </span>
              );
            })}
            <Badge variant={place.vetted ? "vetted" : "unvetted"}>
              {place.vetted ? "Vetted ✓" : "Unvetted — haven't been yet"}
            </Badge>
          </div>
        </div>

        {/* Description */}
        {place.description && (
          <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{place.description}</p>
        )}

        {/* Recommendations */}
        {place.recommendations && place.recommendations.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-2">Recommendations</h2>
            <div className="flex flex-wrap gap-1.5">
              {place.recommendations.map((rec, i) => (
                <Badge key={i} variant="accent">{rec}</Badge>
              ))}
            </div>
          </div>
        )}

        {/* Locations */}
        {place.locations && place.locations.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-2">
              {place.locations.length > 1 ? "Locations" : "Location"}
            </h2>
            <div className="flex flex-col gap-3">
              {place.locations.map((loc) => (
                <div key={loc.id} className="rounded-[var(--radius-md)] bg-[var(--color-surface)] p-3">
                  <div className="flex items-start gap-2 mb-2">
                    <MapPin size={14} className="text-[var(--color-accent)] mt-0.5 shrink-0" />
                    <p className="text-sm text-[var(--color-text-primary)]">{loc.address}</p>
                  </div>
                  {loc.notes && (
                    <p className="text-xs text-[var(--color-text-secondary)] ml-5 mb-2">{loc.notes}</p>
                  )}
                  <div className="flex gap-2 ml-5">
                    <a
                      href={googleMapsUrl(loc.lat, loc.lng, place.name)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[var(--color-accent)] hover:underline flex items-center gap-1"
                    >
                      <ExternalLink size={11} /> Google Maps
                    </a>
                    <a
                      href={appleMapsUrl(loc.lat, loc.lng, place.name)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[var(--color-accent)] hover:underline flex items-center gap-1"
                    >
                      <ExternalLink size={11} /> Apple Maps
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Website */}
        {place.website && (
          <a
            href={place.website}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-[var(--color-accent)] hover:underline"
          >
            <Globe size={14} /> {place.website.replace(/^https?:\/\//, "")}
          </a>
        )}

        {/* Socials */}
        {place.socials && place.socials.length > 0 && (
          <div className="flex flex-col gap-1">
            {place.socials.map((social, i) => (
              <a
                key={i}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[var(--color-accent)] hover:underline flex items-center gap-1.5"
              >
                <ExternalLink size={12} />
                {SOCIAL_ICONS[social.platform.toLowerCase()] ?? social.platform}
              </a>
            ))}
          </div>
        )}

        {/* Photos */}
        {place.photos.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-3">Photos</h2>
            <div className="flex flex-col gap-3">
              {place.photos.map((photo, i) =>
                erroredPhotos.has(i) ? null : (
                  <Image
                    key={i}
                    src={photo}
                    alt={`${place.name} photo ${i + 1}`}
                    width={0}
                    height={0}
                    sizes="100vw"
                    className="w-full h-auto rounded-[var(--radius-md)]"
                    onError={() => setErroredPhotos((prev) => new Set([...prev, i]))}
                  />
                )
              )}
            </div>
          </div>
        )}

        <a
          href={`mailto:${siteConfig.contactEmail}?subject=Issue with ${encodeURIComponent(place.name)}`}
          className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors"
        >
          Report an issue
        </a>
      </div>
    </div>
  );
}
