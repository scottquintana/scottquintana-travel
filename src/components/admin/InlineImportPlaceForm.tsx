"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import { slugify } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_CATEGORIES } from "@/lib/types";
import { Plus, Trash2, X, LocateFixed, Check } from "lucide-react";
import type { City, ImportSinglePayload, Social } from "@/lib/types";
import { geocodeAddress } from "@/lib/geocode";

interface InlineImportPlaceFormProps {
  city: City;
  prefill: ImportSinglePayload;
  onSaved: () => void;
}

type LocationDraft = { address: string; lat: number; lng: number; notes: string };

export function InlineImportPlaceForm({ city, prefill, onSaved }: InlineImportPlaceFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: prefill.name ?? "",
    slug: slugify(prefill.name ?? ""),
    categories: prefill.categories ?? (prefill.category ? [prefill.category] : ["food"]),
    description: prefill.description ?? "",
    vetted: prefill.vetted ?? false,
    website: prefill.website ?? "",
  });
  const [socials, setSocials] = useState<Social[]>(prefill.socials ?? []);
  const [recommendations, setRecommendations] = useState<string[]>(prefill.recommendations ?? []);
  const [photos, setPhotos] = useState<string[]>(prefill.photos ?? []);
  const [locations, setLocations] = useState<LocationDraft[]>(
    prefill.locations?.map((l) => ({
      address: l.address,
      lat: l.lat,
      lng: l.lng,
      notes: l.notes ?? "",
    })) ?? [{ address: "", lat: 0, lng: 0, notes: "" }]
  );
  const [geocodingIdx, setGeocodingIdx] = useState<number | null>(null);
  const [geocodeStatus, setGeocodeStatus] = useState<Record<number, "ok" | "fail">>({});
  const [recInput, setRecInput] = useState("");
  const [photoInput, setPhotoInput] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    const autoGeocode = async () => {
      for (let i = 0; i < locations.length; i++) {
        const loc = locations[i];
        if (loc.address && loc.lat === 0 && loc.lng === 0) {
          await geocodeLocation(i);
        }
      }
    };
    autoGeocode();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const geocodeLocation = async (i: number) => {
    const addr = locations[i]?.address;
    if (!addr) return;
    setGeocodingIdx(i);
    const coords = await geocodeAddress(addr);
    setGeocodingIdx(null);
    if (coords) {
      updateLocation(i, "lat", coords.lat);
      updateLocation(i, "lng", coords.lng);
      setGeocodeStatus((s) => ({ ...s, [i]: "ok" }));
    } else {
      setGeocodeStatus((s) => ({ ...s, [i]: "fail" }));
    }
  };

  const handleNameChange = (name: string) => {
    setForm((f) => ({ ...f, name, slug: slugify(name) }));
  };

  const addRecommendation = () => {
    const val = recInput.trim();
    if (val && !recommendations.includes(val)) {
      setRecommendations((r) => [...r, val]);
      setRecInput("");
    }
  };

  const addPhotoUrl = () => {
    const val = photoInput.trim();
    if (val) { setPhotos((p) => [...p, val]); setPhotoInput(""); }
  };

  const updateLocation = (idx: number, field: keyof LocationDraft, value: string | number) => {
    setLocations((locs) => locs.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    const supabase = createClient();
    const ext = file.name.split(".").pop();
    const path = `places/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("photos").upload(path, file, { upsert: true });
    if (uploadError) { setError(uploadError.message); } else {
      const { data } = supabase.storage.from("photos").getPublicUrl(path);
      setPhotos((p) => [...p, data.publicUrl]);
    }
    setUploadingPhoto(false);
    e.target.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();

    const { data: place, error: placeErr } = await supabase
      .from("places")
      .insert({
        city_id: city.id,
        name: form.name,
        slug: form.slug,
        categories: form.categories,
        description: form.description,
        vetted: form.vetted,
        website: form.website || null,
        socials: socials.length > 0 ? socials : null,
        recommendations: recommendations.length > 0 ? recommendations : null,
        photos,
      })
      .select("id")
      .single();

    if (placeErr || !place) { setError(placeErr?.message ?? "Failed to save"); setLoading(false); return; }

    const locationPayloads = locations
      .filter((l) => l.address.trim())
      .map((l) => ({ place_id: place.id, address: l.address, lat: Number(l.lat), lng: Number(l.lng), notes: l.notes || null }));

    if (locationPayloads.length > 0) {
      const { error: locErr } = await supabase.from("place_locations").insert(locationPayloads);
      if (locErr) { setError(locErr.message); setLoading(false); return; }
    }

    setLoading(false);
    onSaved();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Name + slug */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" value={form.name} onChange={(e) => handleNameChange(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="slug">Slug</Label>
          <Input id="slug" value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} required />
        </div>
      </div>

      {/* Categories */}
      <div>
        <Label>Categories</Label>
        <div className="flex flex-wrap gap-2 mt-1">
          {DEFAULT_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setForm((f) => {
                const has = f.categories.includes(cat);
                return { ...f, categories: has ? f.categories.filter((c) => c !== cat) : [...f.categories, cat] };
              })}
              className={`px-3 py-1 text-sm rounded-[var(--radius-full)] border transition-colors capitalize ${
                form.categories.includes(cat)
                  ? "bg-[var(--color-accent)] text-white border-[var(--color-accent)]"
                  : "border-[var(--color-border)] text-[var(--color-text-secondary)]"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Vetted */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={form.vetted}
          onChange={(e) => setForm((f) => ({ ...f, vetted: e.target.checked }))}
          className="w-4 h-4 rounded accent-[var(--color-accent)]"
        />
        <span className="text-sm text-[var(--color-text-primary)]">Vetted (I&apos;ve actually been here)</span>
      </label>

      {/* Description */}
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
      </div>

      {/* Website */}
      <div>
        <Label htmlFor="website">Website (optional)</Label>
        <Input id="website" type="url" value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} placeholder="https://..." />
      </div>

      {/* Socials */}
      <div>
        <Label>Socials</Label>
        {socials.map((s, i) => (
          <div key={i} className="flex gap-2 mb-2">
            <Input placeholder="platform" value={s.platform} onChange={(e) => setSocials((ss) => ss.map((x, j) => j === i ? { ...x, platform: e.target.value } : x))} className="w-28" />
            <Input placeholder="https://..." value={s.url} onChange={(e) => setSocials((ss) => ss.map((x, j) => j === i ? { ...x, url: e.target.value } : x))} />
            <button type="button" onClick={() => setSocials((ss) => ss.filter((_, j) => j !== i))} className="text-[var(--color-text-muted)] hover:text-[var(--color-danger)]"><Trash2 size={14} /></button>
          </div>
        ))}
        <Button type="button" variant="ghost" size="sm" onClick={() => setSocials((s) => [...s, { platform: "", url: "" }])}>
          <Plus size={13} /> Add social
        </Button>
      </div>

      {/* Recommendations */}
      <div>
        <Label>Recommendations</Label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {recommendations.map((r, i) => (
            <Badge key={i} variant="accent" className="gap-1 cursor-pointer" onClick={() => setRecommendations((rs) => rs.filter((_, j) => j !== i))}>
              {r} <X size={10} />
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input placeholder="e.g. Old fashioned" value={recInput} onChange={(e) => setRecInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addRecommendation(); } }} />
          <Button type="button" variant="secondary" size="sm" onClick={addRecommendation}>Add</Button>
        </div>
      </div>

      {/* Photos */}
      <div>
        <Label>Photos</Label>
        <div className="flex flex-col gap-2">
          {photos.map((p, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs text-[var(--color-text-muted)] truncate flex-1">{p}</span>
              <button type="button" onClick={() => setPhotos((ps) => ps.filter((_, j) => j !== i))} className="text-[var(--color-text-muted)] hover:text-[var(--color-danger)] shrink-0"><Trash2 size={13} /></button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input placeholder="Paste URL" value={photoInput} onChange={(e) => setPhotoInput(e.target.value)} />
            <Button type="button" variant="secondary" size="sm" onClick={addPhotoUrl}>Add URL</Button>
          </div>
          <label className="cursor-pointer">
            <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-alt)] transition-colors">
              <Plus size={12} /> {uploadingPhoto ? "Uploading…" : "Upload file"}
            </span>
            <input type="file" accept="image/*" className="sr-only" onChange={handlePhotoUpload} disabled={uploadingPhoto} />
          </label>
        </div>
      </div>

      {/* Locations */}
      <div>
        <Label>Locations</Label>
        {locations.map((loc, i) => (
          <div key={i} className="border border-[var(--color-border)] rounded-[var(--radius-md)] p-3 mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-[var(--color-text-muted)]">Location {i + 1}</span>
              {locations.length > 1 && (
                <button type="button" onClick={() => setLocations((l) => l.filter((_, j) => j !== i))} className="text-[var(--color-text-muted)] hover:text-[var(--color-danger)]"><Trash2 size={13} /></button>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Input placeholder="Address" value={loc.address} onChange={(e) => updateLocation(i, "address", e.target.value)} />
              <div className="flex gap-2">
                <Input
                  placeholder="Coordinates — paste from Google Maps, e.g. 34.2709, -119.1711"
                  value={loc.lat && loc.lng ? `${loc.lat}, ${loc.lng}` : ""}
                  onChange={(e) => {
                    const [latStr, lngStr] = e.target.value.split(",");
                    const lat = parseFloat(latStr);
                    const lng = parseFloat(lngStr);
                    if (!isNaN(lat)) updateLocation(i, "lat", lat);
                    if (!isNaN(lng)) updateLocation(i, "lng", lng);
                  }}
                />
                <button
                  type="button"
                  onClick={() => geocodeLocation(i)}
                  disabled={geocodingIdx === i}
                  title="Auto-fill coordinates from address"
                  className="shrink-0 p-2 rounded-[var(--radius-md)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)] transition-colors disabled:opacity-50"
                >
                  {geocodingIdx === i
                    ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin block" />
                    : geocodeStatus[i] === "ok"
                    ? <Check size={14} className="text-emerald-500" />
                    : <LocateFixed size={14} />}
                </button>
              </div>
              <Input placeholder="Notes (optional)" value={loc.notes} onChange={(e) => updateLocation(i, "notes", e.target.value)} />
            </div>
          </div>
        ))}
        <Button type="button" variant="ghost" size="sm" onClick={() => setLocations((l) => [...l, { address: "", lat: 0, lng: 0, notes: "" }])}>
          <Plus size={13} /> Add location
        </Button>
      </div>

      {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={loading}>{loading ? "Saving…" : "Save place"}</Button>
      </div>
    </form>
  );
}
