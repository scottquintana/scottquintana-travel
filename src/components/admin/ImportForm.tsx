"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Badge } from "@/components/ui/Badge";
import { AlertCircle, CheckCircle, ChevronDown, ChevronUp, Upload, Trash2 } from "lucide-react";
import { InlineImportPlaceForm } from "@/components/admin/InlineImportPlaceForm";
import { slugify } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { geocodeAddress, isSpecificAddress } from "@/lib/geocode";
import type { City, ImportSinglePayload, ImportBulkPayload } from "@/lib/types";

interface ImportFormProps {
  city: City;
}

type ImportItem = ImportSinglePayload & {
  _valid: boolean;
  _errors: string[];
  _state: "pending" | "reviewing" | "saved";
};

function validatePayload(payload: ImportSinglePayload): string[] {
  const errors: string[] = [];
  if (!payload.name) errors.push("name is required");
  if (!payload.locations || payload.locations.length === 0) errors.push("At least one location is required");
  return errors;
}

export function ImportForm({ city }: ImportFormProps) {
  const [json, setJson] = useState("");
  const [items, setItems] = useState<ImportItem[]>([]);
  const [parseError, setParseError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [saveAllLoading, setSaveAllLoading] = useState(false);
  const [saveAllError, setSaveAllError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadFile = (file: File) => {
    if (!file.name.endsWith(".json")) {
      setParseError("Please drop a .json file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => setJson(e.target?.result as string ?? "");
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) loadFile(file);
  };

  const handleParse = () => {
    setParseError("");
    setItems([]);
    try {
      const parsed = JSON.parse(json);
      let payloads: ImportSinglePayload[];
      if ("places" in parsed && Array.isArray(parsed.places)) {
        payloads = (parsed as ImportBulkPayload).places;
      } else {
        payloads = [parsed as ImportSinglePayload];
      }
      const validated = payloads.map((p) => {
        const errors = validatePayload(p);
        return { ...p, _valid: errors.length === 0, _errors: errors, _state: "pending" as const };
      });
      setItems(validated);
    } catch {
      setParseError("Invalid JSON — check the format and try again.");
    }
  };

  const setItemState = (i: number, state: ImportItem["_state"]) => {
    setItems((is) => is.map((x, j) => j === i ? { ...x, _state: state } : x));
  };

  const removeItem = (i: number) => {
    setItems((is) => is.filter((_, j) => j !== i));
  };

  const saveAll = async () => {
    setSaveAllLoading(true);
    setSaveAllError("");
    const supabase = createClient();
    const toSave = items
      .map((item, idx) => ({ item, idx }))
      .filter(({ item }) => item._valid && item._state === "pending");

    for (const { item, idx } of toSave) {
      const { data: place, error: placeErr } = await supabase
        .from("places")
        .insert({
          city_id: city.id,
          name: item.name,
          slug: slugify(item.name ?? ""),
          category: item.category ?? "food",
          description: item.description ?? null,
          vetted: item.vetted ?? false,
          website: item.website ?? null,
          socials: item.socials?.length ? item.socials : null,
          recommendations: item.recommendations?.length ? item.recommendations : null,
          photos: item.photos ?? [],
        })
        .select("id")
        .single();

      if (placeErr || !place) {
        setSaveAllError(`Failed to save "${item.name}": ${placeErr?.message ?? "unknown error"}`);
        setSaveAllLoading(false);
        return;
      }

      const rawLocs = item.locations?.filter((l) => l.address?.trim()) ?? [];
      const locs = await Promise.all(rawLocs.map(async (l) => {
        let lat = Number(l.lat);
        let lng = Number(l.lng);
        // Only geocode if no explicit coords were provided in the payload
        if (isSpecificAddress(l.address) && !(lat && lng)) {
          const coords = await geocodeAddress(l.address);
          if (coords) { lat = coords.lat; lng = coords.lng; }
        }
        return { place_id: place.id, address: l.address, lat, lng, notes: l.notes ?? null };
      }));

      if (locs.length > 0) {
        const { error: locErr } = await supabase.from("place_locations").insert(locs);
        if (locErr) {
          setSaveAllError(`Saved "${item.name}" but locations failed: ${locErr.message}`);
          setSaveAllLoading(false);
          return;
        }
      }

      setItemState(idx, "saved");
    }

    setSaveAllLoading(false);
  };

  const pendingCount = items.filter((i) => i._state === "pending" && i._valid).length;
  const savedCount = items.filter((i) => i._state === "saved").length;

  return (
    <div className="flex flex-col gap-5">
      {/* Schema reference */}
      <details className="border border-[var(--color-border)] rounded-[var(--radius-md)] overflow-hidden">
        <summary className="px-4 py-2.5 text-sm font-medium cursor-pointer bg-[var(--color-surface-alt)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
          Import format reference
        </summary>
        <pre className="p-4 text-xs text-[var(--color-text-secondary)] overflow-x-auto bg-[var(--color-surface)] font-mono leading-relaxed">{IMPORT_FORMAT_DOCS}</pre>
      </details>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`relative rounded-[var(--radius-md)] border-2 border-dashed transition-colors ${
          dragging
            ? "border-[var(--color-accent)] bg-[var(--color-accent-light)]"
            : "border-[var(--color-border)]"
        }`}
      >
        <Textarea
          placeholder={`Paste JSON here — or drag & drop a .json file`}
          value={json}
          onChange={(e) => setJson(e.target.value)}
          className="min-h-[180px] font-mono text-xs border-0 bg-transparent focus:ring-0"
        />
        {dragging && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none rounded-[var(--radius-md)] bg-[var(--color-accent-light)]">
            <div className="flex flex-col items-center gap-2 text-[var(--color-accent)]">
              <Upload size={24} />
              <span className="text-sm font-medium">Drop to load</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Button type="button" variant="secondary" onClick={handleParse}>Parse JSON</Button>
        <span className="text-xs text-[var(--color-text-muted)]">or</span>
        <label className="cursor-pointer">
          <span className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-alt)] transition-colors">
            <Upload size={13} /> Load file
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="sr-only"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) loadFile(f); e.target.value = ""; }}
          />
        </label>
        {parseError && <p className="text-sm text-[var(--color-danger)]">{parseError}</p>}
      </div>

      {items.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-[var(--color-text-primary)]">
              {items.length} place{items.length !== 1 ? "s" : ""} found
            </p>
            <div className="flex items-center gap-3">
              {savedCount > 0 && (
                <span className="flex items-center gap-1 text-sm text-[var(--color-success)]">
                  <CheckCircle size={14} /> {savedCount} saved
                </span>
              )}
              {pendingCount > 0 && (
                <Button
                  type="button"
                  size="sm"
                  disabled={saveAllLoading}
                  onClick={saveAll}
                >
                  {saveAllLoading ? "Saving…" : `Save all (${pendingCount})`}
                </Button>
              )}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => { setItems([]); setJson(""); setSaveAllError(""); }}
              >
                Cancel all
              </Button>
            </div>
          </div>
          {saveAllError && <p className="text-sm text-[var(--color-danger)] mb-3">{saveAllError}</p>}

          <div className="flex flex-col gap-3">
            {items.map((item, i) => (
              <div
                key={i}
                className={`border rounded-[var(--radius-md)] overflow-hidden transition-colors ${
                  item._state === "saved"
                    ? "border-emerald-200 bg-emerald-50"
                    : item._valid
                    ? "border-[var(--color-border)]"
                    : "border-[var(--color-danger)] bg-[var(--color-danger-light)]"
                }`}
              >
                {/* Item header */}
                <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    {item._state === "saved" ? (
                      <CheckCircle size={15} className="text-[var(--color-success)] shrink-0" />
                    ) : !item._valid ? (
                      <AlertCircle size={15} className="text-[var(--color-danger)] shrink-0" />
                    ) : null}
                    <div>
                      <p className="text-sm font-medium text-[var(--color-text-primary)]">{item.name || "(unnamed)"}</p>
                      <p className="text-xs text-[var(--color-text-muted)] capitalize">{item.category ?? "—"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item._state === "saved" && (
                      <Badge variant="vetted">Saved</Badge>
                    )}
                    {item._valid && item._state !== "saved" && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setItemState(i, item._state === "reviewing" ? "pending" : "reviewing")}
                      >
                        {item._state === "reviewing" ? (
                          <><ChevronUp size={13} /> Collapse</>
                        ) : (
                          <><ChevronDown size={13} /> Review & edit</>
                        )}
                      </Button>
                    )}
                    {item._state !== "saved" && (
                      <button
                        type="button"
                        onClick={() => removeItem(i)}
                        className="text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-colors"
                        title="Remove from import"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Validation errors */}
                {item._errors.length > 0 && (
                  <ul className="px-3 pb-2 text-xs text-[var(--color-danger)] list-disc list-inside">
                    {item._errors.map((err, j) => <li key={j}>{err}</li>)}
                  </ul>
                )}

                {/* Inline form */}
                {item._state === "reviewing" && (
                  <div className="border-t border-[var(--color-border)] p-4 bg-[var(--color-surface)]">
                    <InlineImportPlaceForm
                      city={city}
                      prefill={item}
                      onSaved={() => setItemState(i, "saved")}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const IMPORT_FORMAT_DOCS = `// Single place
{
  "name": "Bestia",                  // required
  "category": "food",                // optional — food | drink | activity | other | custom
  "description": "...",              // optional
  "vetted": true,                    // optional, default false
  "website": "https://...",          // optional
  "socials": [                       // optional
    { "platform": "instagram", "url": "https://..." }
  ],
  "recommendations": ["Dish 1"],    // optional
  "photos": ["https://..."],        // optional
  "locations": [                     // required — at least one
    {
      "address": "123 Main St, City, CA",
      "lat": 34.0234,
      "lng": -118.2345,
      "notes": "Dinner only"         // optional
    }
  ]
}

// Bulk: wrap in { "places": [ ...same shape... ] }`;
