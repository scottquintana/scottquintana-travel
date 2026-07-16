"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import { slugify } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_CATEGORIES } from "@/lib/types";
import { Plus, Trash2, X, LocateFixed, Map, Check, MapPin, Loader2 } from "lucide-react";
import type { City, Place, PlaceLocation, Social } from "@/lib/types";
import { geocodeAddress, isSpecificAddress } from "@/lib/geocode";

interface PlaceFormProps {
  cities: City[];
  place?: Place & { locations?: PlaceLocation[] };
}

type LocationDraft = Omit<PlaceLocation, "id" | "place_id"> & { id?: string };

export function PlaceForm({ cities, place }: PlaceFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    city_id: place?.city_id ?? (cities[0]?.id ?? ""),  // restored from localStorage below for new places
    name: place?.name ?? "",
    slug: place?.slug ?? "",
    categories: place?.categories ?? ["food"],
    description: place?.description ?? "",
    vetted: place?.vetted ?? true,
    website: place?.website ?? "",
  });
  const [socials, setSocials] = useState<Social[]>(place?.socials ?? []);
  const [recommendations, setRecommendations] = useState<string[]>(place?.recommendations ?? []);
  const [photos, setPhotos] = useState<string[]>(place?.photos ?? []);
  const [locations, setLocations] = useState<LocationDraft[]>(
    place?.locations?.map((l) => ({ id: l.id, address: l.address, lat: l.lat, lng: l.lng, notes: l.notes ?? "" })) ?? [
      { address: "", lat: 0, lng: 0, notes: "" },
    ]
  );
  const [recInput, setRecInput] = useState("");
  const [photoInput, setPhotoInput] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [importQuery, setImportQuery] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const [importedName, setImportedName] = useState("");

  // Restore last-used city for new places; save it whenever it changes
  useEffect(() => {
    if (place) return;
    const saved = localStorage.getItem("admin_last_city_id");
    if (saved && cities.find((c) => c.id === saved)) {
      setForm((f) => ({ ...f, city_id: saved }));
    }
  }, []);

  const handleCityChange = (cityId: string) => {
    localStorage.setItem("admin_last_city_id", cityId);
    setForm((f) => ({ ...f, city_id: cityId }));
  };

  const handleGoogleImport = async () => {
    if (!importQuery.trim()) return;
    setImporting(true);
    setImportError("");
    setImportedName("");
    try {
      const res = await fetch("/api/admin/places/google-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: importQuery }),
      });
      const data = await res.json();
      if (!res.ok) {
        setImportError(data.error ?? "Import failed");
        return;
      }
      setForm((f) => ({
        ...f,
        name: data.name || f.name,
        slug: place ? f.slug : slugify(data.name || f.name),
        website: data.website || f.website,
        categories: data.categories?.length ? data.categories : f.categories,
        description: data.description || f.description,
      }));
      if (data.address) {
        setLocations([{ address: data.address, lat: data.lat ?? 0, lng: data.lng ?? 0, notes: "" }]);
      }
      if (data.photos?.length) {
        setPhotos(data.photos);
      }
      setImportedName(data.name);
      setImportQuery("");
    } catch {
      setImportError("Network error — could not reach the server");
    } finally {
      setImporting(false);
    }
  };

  const handleNameChange = (name: string) => {
    setForm((f) => ({ ...f, name, slug: place ? f.slug : slugify(name) }));
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
    if (val) {
      setPhotos((p) => [...p, val]);
      setPhotoInput("");
    }
  };

  const [geocodingIdx, setGeocodingIdx] = useState<number | null>(null);
  const [geocodeStatus, setGeocodeStatus] = useState<Record<number, "ok" | "fail">>({});

  const geocodeLocation = async (i: number) => {
    const addr = locations[i]?.address;
    if (!addr || !isSpecificAddress(addr)) return;
    setGeocodingIdx(i);
    setGeocodeStatus((s) => ({ ...s, [i]: undefined as unknown as "ok" }));
    const coords = await geocodeAddress(addr);
    if (coords) {
      updateLocation(i, "lat", coords.lat);
      updateLocation(i, "lng", coords.lng);
      setGeocodeStatus((s) => ({ ...s, [i]: "ok" }));
    } else {
      setGeocodeStatus((s) => ({ ...s, [i]: "fail" }));
    }
    setGeocodingIdx(null);
  };

  const addLocation = () => {
    setLocations((l) => [...l, { address: "", lat: 0, lng: 0, notes: "" }]);
  };

  const updateLocation = (idx: number, field: keyof LocationDraft, value: string | number) => {
    setLocations((locs) => locs.map((l, i) => (i === idx ? { ...l, [field]: value } : l)));
  };

  const removeLocation = (idx: number) => {
    setLocations((l) => l.filter((_, i) => i !== idx));
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    const supabase = createClient();
    const ext = file.name.split(".").pop();
    const path = `places/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("photos")
      .upload(path, file, { upsert: true });
    if (uploadError) {
      setError(uploadError.message);
    } else {
      const { data: urlData } = supabase.storage.from("photos").getPublicUrl(path);
      setPhotos((p) => [...p, urlData.publicUrl]);
    }
    setUploadingPhoto(false);
    e.target.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();

    const placePayload = {
      city_id: form.city_id,
      name: form.name,
      slug: form.slug,
      categories: form.categories,
      description: form.description,
      vetted: form.vetted,
      website: form.website || null,
      socials: socials.length > 0 ? socials : null,
      recommendations: recommendations.length > 0 ? recommendations : null,
      photos,
    };

    let placeId = place?.id;

    if (place) {
      const { error: err } = await supabase.from("places").update(placePayload).eq("id", place.id);
      if (err) { setError(err.message); setLoading(false); return; }
    } else {
      const { data, error: err } = await supabase.from("places").insert(placePayload).select("id").single();
      if (err) { setError(err.message); setLoading(false); return; }
      placeId = data.id;
    }

    // Sync locations
    if (placeId) {
      if (place) {
        await supabase.from("place_locations").delete().eq("place_id", placeId);
      }
      const locationPayloads = locations
        .filter((l) => l.address.trim())
        .map((l) => ({
          place_id: placeId!,
          address: l.address,
          lat: Number(l.lat),
          lng: Number(l.lng),
          notes: l.notes || null,
        }));
      if (locationPayloads.length > 0) {
        const { error: locErr } = await supabase.from("place_locations").insert(locationPayloads);
        if (locErr) { setError(locErr.message); setLoading(false); return; }
      }
    }

    router.push("/admin/places");
    router.refresh();
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!place || !confirm("Delete this place and all its locations?")) return;
    setLoading(true);
    const supabase = createClient();
    await supabase.from("place_locations").delete().eq("place_id", place.id);
    await supabase.from("places").delete().eq("id", place.id);
    router.push("/admin/places");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Google Maps import */}
      <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <p className="text-xs font-medium text-[var(--color-text-secondary)] mb-3 flex items-center gap-1.5">
          <MapPin size={12} className="text-[var(--color-accent)]" />
          Import from Google Maps
        </p>
        {importedName && (
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-2">
            Imported: <span className="font-medium">{importedName}</span>
          </p>
        )}
        <div className="flex gap-2">
          <Input
            placeholder='Search by place name, e.g. "Canard Portland"'
            value={importQuery}
            onChange={(e) => { setImportQuery(e.target.value); setImportError(""); setImportedName(""); }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleGoogleImport(); } }}
            className="text-base"
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={importing || !importQuery.trim()}
            onClick={handleGoogleImport}
            className="shrink-0"
          >
            {importing ? <Loader2 size={13} className="animate-spin" /> : "Import"}
          </Button>
        </div>
        {importError
          ? <p className="text-xs text-[var(--color-danger)] mt-2">{importError}</p>
          : <p className="text-xs text-[var(--color-text-muted)] mt-2">Search by name or paste a full Google Maps URL. Google share links (share.google/…) are not supported.</p>
        }
      </div>

      {/* City */}
      <div>
        <Label htmlFor="city">City</Label>
        <select
          id="city"
          value={form.city_id}
          onChange={(e) => handleCityChange(e.target.value)}
          className="w-full px-3 py-2 text-base bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
        >
          {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Name + slug */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input id="name" value={form.name} onChange={(e) => handleNameChange(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="slug">Slug</Label>
          <Input id="slug" value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} required placeholder="auto-generated" />
        </div>
      </div>

      {/* Category */}
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
      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.vetted}
            onChange={(e) => setForm((f) => ({ ...f, vetted: e.target.checked }))}
            className="w-4 h-4 rounded accent-[var(--color-accent)]"
          />
          <span className="text-sm text-[var(--color-text-primary)]">Vetted (I&apos;ve actually been here)</span>
        </label>
      </div>

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
          <div>
            <label className="cursor-pointer">
              <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-[var(--radius-md)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-alt)] transition-colors">
                <Plus size={12} /> {uploadingPhoto ? "Uploading…" : "Upload file"}
              </span>
              <input type="file" accept="image/*" className="sr-only" onChange={handlePhotoUpload} disabled={uploadingPhoto} />
            </label>
          </div>
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
                <button type="button" onClick={() => removeLocation(i)} className="text-[var(--color-text-muted)] hover:text-[var(--color-danger)]"><Trash2 size={13} /></button>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <Input placeholder="Address" value={loc.address} onChange={(e) => updateLocation(i, "address", e.target.value)} />
                <button
                  type="button"
                  onClick={() => geocodeLocation(i)}
                  disabled={geocodingIdx === i || !isSpecificAddress(loc.address)}
                  title={geocodeStatus[i] === "fail" ? "Geocoding failed — check console for details" : "Auto-fill coordinates from address"}
                  className={`shrink-0 px-2.5 rounded-[var(--radius-md)] border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                    geocodeStatus[i] === "fail"
                      ? "border-[var(--color-danger)] text-[var(--color-danger)]"
                      : geocodeStatus[i] === "ok"
                      ? "border-emerald-400 text-emerald-500"
                      : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)]"
                  }`}
                >
                  {geocodeStatus[i] === "fail"
                    ? <X size={14} />
                    : geocodeStatus[i] === "ok"
                    ? <Check size={14} />
                    : <LocateFixed size={14} className={geocodingIdx === i ? "animate-spin" : ""} />}
                </button>
                {loc.address && (
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(loc.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open in Google Maps — right-click the pin to get exact coordinates"
                    className="shrink-0 px-2.5 flex items-center rounded-[var(--radius-md)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-accent)] hover:border-[var(--color-accent)] transition-colors"
                  >
                    <Map size={14} />
                  </a>
                )}
              </div>
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
              <Input placeholder="Notes (optional)" value={loc.notes ?? ""} onChange={(e) => updateLocation(i, "notes", e.target.value)} />
            </div>
          </div>
        ))}
        <Button type="button" variant="ghost" size="sm" onClick={addLocation}><Plus size={13} /> Add location</Button>
      </div>

      {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={loading}>{loading ? "Saving…" : place ? "Save changes" : "Create place"}</Button>
        <Button type="button" variant="secondary" onClick={() => router.push("/admin/places")}>Cancel</Button>
        {place && <Button type="button" variant="danger" className="ml-auto" onClick={handleDelete}>Delete</Button>}
      </div>
    </form>
  );
}
