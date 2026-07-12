import { Check } from "lucide-react";
import type { Place } from "@/lib/types";

interface PlaceCardProps {
  place: Place;
  isSelected?: boolean;
  onHover?: (id: string | null) => void;
  onClick?: (place: Place) => void;
}

const CATEGORY_DOT: Record<string, string> = {
  food: "bg-[#e07040]",
  drink: "bg-[#7c4fc4]",
  activity: "bg-[#2d9e4a]",
};

export function PlaceCard({ place, isSelected, onHover, onClick }: PlaceCardProps) {
  const dotColor = CATEGORY_DOT[place.category] ?? "bg-gray-400";
  return (
    <button
      type="button"
      onClick={() => onClick?.(place)}
      onMouseEnter={() => onHover?.(place.id)}
      onMouseLeave={() => onHover?.(null)}
      className={`w-full text-left flex items-start gap-3 px-3 py-3 rounded-[var(--radius-md)] border transition-all duration-150 ${
        isSelected
          ? "border-[var(--color-accent)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]"
          : "border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-accent-muted)] hover:shadow-[var(--shadow-sm)]"
      }`}
    >
      <div className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${dotColor}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <span className="text-sm font-medium text-[var(--color-text-primary)] leading-snug">
            {place.name}
          </span>
          {place.vetted && (
            <Check size={13} className="shrink-0 text-emerald-500 mt-0.5" />
          )}
        </div>
        {place.description && (
          <p className="mt-0.5 text-xs text-[var(--color-text-secondary)] leading-relaxed">
            {place.description}
          </p>
        )}
      </div>
    </button>
  );
}
