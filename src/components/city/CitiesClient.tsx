"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, ChevronDown, ChevronUp } from "lucide-react";
import Markdown from "react-markdown";

interface CityWithCount {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  cover_photo: string | null;
  places: { count: number }[];
}

function CityCard({ city }: { city: CityWithCount }) {
  const count = city.places?.[0]?.count ?? 0;
  const [expanded, setExpanded] = useState(false);
  const [isClampable, setIsClampable] = useState(false);
  const descRef = useRef<HTMLParagraphElement>(null);
  const expandedRef = useRef(expanded);
  expandedRef.current = expanded;

  useEffect(() => {
    const el = descRef.current;
    if (!el) return;
    const check = () => {
      if (expandedRef.current) {
        const lh = parseFloat(getComputedStyle(el).lineHeight) || 20;
        setIsClampable(el.scrollHeight > lh * 2 + 1);
      } else {
        setIsClampable(el.scrollHeight > el.clientHeight + 1);
      }
    };
    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [city.description]);

  return (
    <div className="group block rounded-[var(--radius-xl)] overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] hover:border-[var(--color-accent-muted)] transition-all duration-200">
      <Link
        href={`/${city.slug}`}
        className="block active:opacity-80 touch-manipulation"
      >
        <div className="relative h-48 bg-[var(--color-surface-alt)]">
          {city.cover_photo ? (
            <Image
              src={city.cover_photo}
              alt={city.name}
              fill
              className="object-cover group-hover:scale-[1.02] transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[var(--color-accent)] text-sm">
              No photo
            </div>
          )}
        </div>
        <div className="px-4 pt-4 pb-1">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="font-semibold text-[var(--color-text-primary)] [font-family:var(--font-display)]">{city.name}</h2>
            <span className="text-xs text-[var(--color-accent)] shrink-0">
              {count} {count === 1 ? "place" : "places"}
            </span>
          </div>
        </div>
      </Link>

      {city.description && (
        <div className="px-4 pb-4">
          <div
            ref={descRef}
            className={`text-sm text-[var(--color-text-secondary)] ${expanded ? "" : "line-clamp-2"}`}
          >
            <Markdown
              components={{
                p: ({ children }) => <p className="my-1 first:mt-0">{children}</p>,
                a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-[var(--color-accent)] hover:underline">{children}</a>,
                strong: ({ children }) => <strong className="font-semibold text-[var(--color-text-primary)]">{children}</strong>,
                ul: ({ children }) => <ul className="my-1 ml-4 list-disc">{children}</ul>,
                ol: ({ children }) => <ol className="my-1 ml-4 list-decimal">{children}</ol>,
                li: ({ children }) => <li className="my-0">{children}</li>,
              }}
            >
              {city.description}
            </Markdown>
          </div>
          {isClampable && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="mt-1 flex items-center gap-0.5 text-xs text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-colors"
            >
              {expanded ? <><ChevronUp size={11} /> Show less</> : <><ChevronDown size={11} /> Show more</>}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function CitiesClient({ cities }: { cities: CityWithCount[] }) {
  const [query, setQuery] = useState("");

  const filtered = query.trim()
    ? cities.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
    : cities;

  return (
    <>
      <div className="relative mb-8">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-primary)] pointer-events-none" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search cities…"
          className="w-full text-base pl-9 pr-4 py-2.5 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent)] transition-colors"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-[var(--color-accent)] text-sm">No cities match "{query}".</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 items-start">
          {filtered.map((city) => (
            <CityCard key={city.id} city={city} />
          ))}
        </div>
      )}
    </>
  );
}
