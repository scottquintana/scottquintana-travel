import { Check } from "lucide-react";
import type { Place } from "@/lib/types";
import { CATEGORY_COLORS, CATEGORY_COLOR_DEFAULT } from "@/lib/categoryColors";

interface PlaceCardProps {
  place: Place;
  locationNote?: string;
  isSelected?: boolean;
  distanceLabel?: string;
  onHover?: (id: string | null) => void;
  onClick?: (place: Place) => void;
}

function categoryDotStyle(categories: string[]): React.CSSProperties {
  const cats = (categories ?? []).filter(Boolean);
  if (cats.length >= 2) {
    const c1 = CATEGORY_COLORS[cats[0]] ?? CATEGORY_COLOR_DEFAULT;
    const c2 = CATEGORY_COLORS[cats[1]] ?? CATEGORY_COLOR_DEFAULT;
    return { background: `linear-gradient(135deg, ${c1} 50%, ${c2} 50%)` };
  }
  return { background: CATEGORY_COLORS[cats[0]] ?? CATEGORY_COLOR_DEFAULT };
}

export function PlaceCard({ place, locationNote, isSelected, distanceLabel, onHover, onClick }: PlaceCardProps) {
  return (
    <button
      type="button"
      onClick={() => onClick?.(place)}
      onMouseEnter={() => onHover?.(place.id)}
      onMouseLeave={() => onHover?.(null)}
      className={`w-full text-left flex items-start gap-3 px-3 py-3 rounded-[var(--radius-md)] border transition-all duration-150 ${
        isSelected
          ? "border-[var(--color-accent)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]"
          : "border-transparent bg-[var(--color-surface)] hover:border-[var(--color-accent-muted)] hover:shadow-[var(--shadow-sm)]"
      }`}
    >
      <div className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={categoryDotStyle(place.categories ?? [])} />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <span className="text-sm font-medium text-[var(--color-text-primary)] leading-snug">
            {place.name}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            {distanceLabel && (
              <span className="text-xs text-[var(--color-text-muted)]">{distanceLabel}</span>
            )}
            {place.vetted && (
              <Check size={13} className="text-[var(--color-success)]" />
            )}
          </div>
        </div>
        {locationNote && (
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)] italic leading-snug">
            {locationNote}
          </p>
        )}
        {place.description && (
          <p className="mt-0.5 text-xs text-[var(--color-text-secondary)] leading-relaxed">
            {place.description}
          </p>
        )}
      </div>
    </button>
  );
}
