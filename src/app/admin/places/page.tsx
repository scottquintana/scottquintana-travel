"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Plus, Pencil, Search, Upload, Trash2 } from "lucide-react";
import { formatCategory } from "@/lib/utils";
import type { City, Place } from "@/lib/types";

export default function AdminPlacesPage() {
  const router = useRouter();
  const [places, setPlaces] = useState<Place[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [query, setQuery] = useState("");
  const [showImportPicker, setShowImportPicker] = useState(false);
  const [selectedCityId, setSelectedCityId] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("places").select("*, city:cities(name, slug)").order("name").then(({ data }) => setPlaces(data ?? []));
    supabase.from("cities").select("*").order("name").then(({ data }) => {
      setCities(data ?? []);
      if (data?.[0]) setSelectedCityId(data[0].id);
    });
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowImportPicker(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = places.filter((p) => {
    const q = query.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.city?.name?.toLowerCase().includes(q)
    );
  });

  const allFilteredSelected = filtered.length > 0 && filtered.every((p) => selected.has(p.id));

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (allFilteredSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        filtered.forEach((p) => next.delete(p.id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        filtered.forEach((p) => next.add(p.id));
        return next;
      });
    }
  };

  const handleDeleteSelected = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    if (!window.confirm(`Delete ${ids.length} place${ids.length !== 1 ? "s" : ""}? This cannot be undone.`)) return;

    setDeleting(true);
    setDeleteError("");
    const supabase = createClient();

    // Delete locations first (in case there's no cascade)
    await supabase.from("place_locations").delete().in("place_id", ids);

    const { error } = await supabase.from("places").delete().in("id", ids);
    if (error) {
      setDeleteError(`Delete failed: ${error.message}`);
      setDeleting(false);
      return;
    }

    setPlaces((prev) => prev.filter((p) => !ids.includes(p.id)));
    setSelected(new Set());
    setDeleting(false);
  };

  const handleImportGo = () => {
    if (!selectedCityId) return;
    const city = cities.find((c) => c.id === selectedCityId);
    if (city) router.push(`/admin/cities/${city.id}/import`);
  };

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">Places</h1>
        <div className="flex items-center gap-2">
          {selected.size > 0 ? (
            <Button
              variant="danger"
              size="sm"
              disabled={deleting}
              onClick={handleDeleteSelected}
            >
              <Trash2 size={13} />
              {deleting ? "Deleting…" : `Delete ${selected.size}`}
            </Button>
          ) : null}
          <div className="relative" ref={pickerRef}>
            <Button variant="secondary" size="sm" onClick={() => setShowImportPicker((v) => !v)}>
              <Upload size={13} /> Import
            </Button>
            {showImportPicker && (
              <div className="absolute right-0 top-full mt-1 z-10 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-md)] shadow-[var(--shadow-md)] p-3 w-56">
                <p className="text-xs text-[var(--color-text-muted)] mb-2">Import into which city?</p>
                <select
                  value={selectedCityId}
                  onChange={(e) => setSelectedCityId(e.target.value)}
                  className="w-full px-2 py-1.5 text-sm bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-sm)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] mb-2"
                >
                  {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <Button size="sm" className="w-full justify-center" onClick={handleImportGo}>Go</Button>
              </div>
            )}
          </div>
          <Link href="/admin/places/new"><Button size="sm"><Plus size={14} /> New place</Button></Link>
        </div>
      </div>

      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
        <Input
          placeholder="Search by name, category, or city…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-8"
        />
      </div>

      {deleteError && (
        <p className="text-sm text-[var(--color-danger)] mb-3">{deleteError}</p>
      )}

      <div className="flex flex-col gap-2">
        {filtered.length > 0 && (
          <div className="flex items-center gap-3 px-1 pb-1">
            <input
              type="checkbox"
              checked={allFilteredSelected}
              onChange={toggleAll}
              className="w-4 h-4 rounded accent-[var(--color-accent)] cursor-pointer"
            />
            <span className="text-xs text-[var(--color-text-muted)]">
              {selected.size > 0 ? `${selected.size} selected` : "Select all"}
            </span>
          </div>
        )}

        {filtered.map((place) => (
          <div
            key={place.id}
            className={`flex items-center gap-3 bg-[var(--color-surface)] border rounded-[var(--radius-md)] px-4 py-3 transition-colors ${
              selected.has(place.id)
                ? "border-[var(--color-accent)] bg-[var(--color-accent-light,#f0f4ff)]"
                : "border-[var(--color-border)]"
            }`}
          >
            <input
              type="checkbox"
              checked={selected.has(place.id)}
              onChange={() => toggleOne(place.id)}
              className="w-4 h-4 rounded accent-[var(--color-accent)] cursor-pointer shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="font-medium text-sm text-[var(--color-text-primary)]">{place.name}</p>
                <Badge variant="category">{formatCategory(place.category)}</Badge>
                <Badge variant={place.vetted ? "vetted" : "unvetted"}>{place.vetted ? "Vetted" : "Unvetted"}</Badge>
              </div>
              <p className="text-xs text-[var(--color-text-muted)]">{place.city?.name}</p>
            </div>
            <Link href={`/admin/places/${place.id}`}>
              <Button variant="ghost" size="sm"><Pencil size={13} /> Edit</Button>
            </Link>
          </div>
        ))}

        {filtered.length === 0 && (
          <p className="text-sm text-[var(--color-text-muted)]">
            {query ? "No places match your search." : "No places yet."}
          </p>
        )}
      </div>
    </div>
  );
}
