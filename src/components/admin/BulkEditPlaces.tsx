"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { formatCategory } from "@/lib/utils";
import { DEFAULT_CATEGORIES } from "@/lib/types";
import { Pencil, Loader2, CheckCircle } from "lucide-react";
import type { Place } from "@/lib/types";

interface Draft {
  description: string;
  vetted: boolean;
  website: string;
  categories: string[];
}

function toDraft(p: Place): Draft {
  return {
    description: p.description ?? "",
    vetted: p.vetted ?? false,
    website: p.website ?? "",
    categories: p.categories ?? [],
  };
}

function isDirty(baseline: Draft, draft: Draft): boolean {
  return (
    draft.description !== baseline.description ||
    draft.vetted !== baseline.vetted ||
    draft.website !== baseline.website ||
    JSON.stringify([...draft.categories].sort()) !== JSON.stringify([...baseline.categories].sort())
  );
}

export function BulkEditPlaces({ places }: { places: Place[] }) {
  const initial = useMemo(
    () => Object.fromEntries(places.map((p) => [p.id, toDraft(p)])),
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const [drafts, setDrafts] = useState<Record<string, Draft>>(initial);
  // baseline tracks what's actually committed to the DB
  const [baselines, setBaselines] = useState<Record<string, Draft>>(initial);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [savingAll, setSavingAll] = useState(false);

  const dirtyIds = useMemo(
    () => places.filter((p) => isDirty(baselines[p.id], drafts[p.id])).map((p) => p.id),
    [places, baselines, drafts]
  );

  const updateDraft = (id: string, field: keyof Draft, value: string | boolean | string[]) => {
    setSaved((prev) => { const next = new Set(prev); next.delete(id); return next; });
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const toggleCategory = (id: string, cat: string) => {
    const current = drafts[id].categories;
    const next = current.includes(cat) ? current.filter((c) => c !== cat) : [...current, cat];
    updateDraft(id, "categories", next);
  };

  const commitOne = (id: string) => {
    setBaselines((prev) => ({ ...prev, [id]: drafts[id] }));
    setSaved((prev) => new Set(prev).add(id));
  };

  const saveOne = async (place: Place) => {
    const draft = drafts[place.id];
    setSaving((prev) => new Set(prev).add(place.id));
    setError("");
    const supabase = createClient();
    const { error: err } = await supabase
      .from("places")
      .update({
        description: draft.description,
        vetted: draft.vetted,
        website: draft.website || null,
        categories: draft.categories,
      })
      .eq("id", place.id);
    setSaving((prev) => { const next = new Set(prev); next.delete(place.id); return next; });
    if (err) { setError(`Failed to save "${place.name}": ${err.message}`); return; }
    commitOne(place.id);
  };

  const saveAll = async () => {
    setSavingAll(true);
    setError("");
    const supabase = createClient();
    const dirty = places.filter((p) => isDirty(baselines[p.id], drafts[p.id]));
    for (const place of dirty) {
      const draft = drafts[place.id];
      const { error: err } = await supabase
        .from("places")
        .update({
          description: draft.description,
          vetted: draft.vetted,
          website: draft.website || null,
          categories: draft.categories,
        })
        .eq("id", place.id);
      if (err) { setError(`Failed to save "${place.name}": ${err.message}`); setSavingAll(false); return; }
      commitOne(place.id);
    }
    setSavingAll(false);
  };

  return (
    <div>
      {/* Sticky save bar */}
      <div className="sticky top-0 z-10 flex items-center justify-between gap-3 py-3 mb-4 bg-[var(--color-bg)] border-b border-[var(--color-border)]">
        <span className="text-sm text-[var(--color-text-muted)]">
          {dirtyIds.length > 0
            ? `${dirtyIds.length} unsaved change${dirtyIds.length !== 1 ? "s" : ""}`
            : "No unsaved changes"}
        </span>
        <Button
          size="sm"
          onClick={saveAll}
          disabled={savingAll || dirtyIds.length === 0}
        >
          {savingAll ? <Loader2 size={13} className="animate-spin" /> : null}
          {savingAll ? "Saving…" : `Save all changes${dirtyIds.length > 0 ? ` (${dirtyIds.length})` : ""}`}
        </Button>
      </div>

      {error && <p className="text-sm text-[var(--color-danger)] mb-4">{error}</p>}

      <div className="flex flex-col gap-4">
        {places.map((place) => {
          const draft = drafts[place.id];
          const dirty = isDirty(baselines[place.id], draft);
          const isSaving = saving.has(place.id);
          const isSaved = saved.has(place.id) && !dirty;

          return (
            <div
              key={place.id}
              className={`border rounded-[var(--radius-lg)] p-4 transition-colors ${
                dirty
                  ? "border-[var(--color-accent)] bg-[var(--color-accent-light,#f0f4ff)]"
                  : isSaved
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-[var(--color-border)] bg-[var(--color-surface)]"
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <p className="font-medium text-sm text-[var(--color-text-primary)]">{place.name}</p>
                <div className="flex items-center gap-2 shrink-0">
                  {isSaved && <CheckCircle size={15} className="text-emerald-500" />}
                  {dirty && (
                    <Button size="sm" variant="secondary" onClick={() => saveOne(place)} disabled={isSaving}>
                      {isSaving ? <Loader2 size={13} className="animate-spin" /> : null}
                      {isSaving ? "Saving…" : "Save"}
                    </Button>
                  )}
                  <Link href={`/admin/places/${place.id}`}>
                    <Button variant="ghost" size="sm"><Pencil size={13} /></Button>
                  </Link>
                </div>
              </div>

              {/* Categories */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {DEFAULT_CATEGORIES.map((cat) => {
                  const active = draft.categories.includes(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleCategory(place.id, cat)}
                      className={`px-2.5 py-0.5 text-xs rounded-[var(--radius-full)] border transition-colors capitalize ${
                        active
                          ? "bg-[var(--color-accent)] text-white border-[var(--color-accent)]"
                          : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)]"
                      }`}
                    >
                      {formatCategory(cat)}
                    </button>
                  );
                })}
              </div>

              {/* Description */}
              <Textarea
                placeholder="Description (optional)"
                value={draft.description}
                onChange={(e) => updateDraft(place.id, "description", e.target.value)}
                className="text-sm min-h-[72px] mb-2"
              />

              {/* Website + Vetted */}
              <div className="flex items-center gap-4">
                <Input
                  placeholder="Website (optional)"
                  value={draft.website}
                  onChange={(e) => updateDraft(place.id, "website", e.target.value)}
                  className="text-sm"
                />
                <label className="flex items-center gap-2 cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={draft.vetted}
                    onChange={(e) => updateDraft(place.id, "vetted", e.target.checked)}
                    className="w-4 h-4 rounded accent-[var(--color-accent)]"
                  />
                  <span className="text-sm text-[var(--color-text-secondary)] whitespace-nowrap">Vetted</span>
                </label>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
