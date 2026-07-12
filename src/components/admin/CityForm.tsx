"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Label } from "@/components/ui/Label";
import { slugify } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Plus } from "lucide-react";
import Image from "next/image";
import type { City } from "@/lib/types";

interface CityFormProps {
  city?: City;
}

export function CityForm({ city }: CityFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: city?.name ?? "",
    slug: city?.slug ?? "",
    description: city?.description ?? "",
    cover_photo: city?.cover_photo ?? "",
  });

  const handleNameChange = (name: string) => {
    setForm((f) => ({
      ...f,
      name,
      slug: city ? f.slug : slugify(name),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const payload = {
      name: form.name,
      slug: form.slug,
      description: form.description || null,
      cover_photo: form.cover_photo || null,
    };
    const { error: err } = city
      ? await supabase.from("cities").update(payload).eq("id", city.id)
      : await supabase.from("cities").insert(payload);
    if (err) {
      setError(err.message);
    } else {
      router.push("/admin/cities");
      router.refresh();
    }
    setLoading(false);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const supabase = createClient();
    const ext = file.name.split(".").pop();
    const path = `cities/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("photos").upload(path, file, { upsert: true });
    if (uploadError) {
      setError(uploadError.message);
    } else {
      const { data } = supabase.storage.from("photos").getPublicUrl(path);
      setForm((f) => ({ ...f, cover_photo: data.publicUrl }));
    }
    setUploading(false);
    e.target.value = "";
  };

  const handleDelete = async () => {
    if (!city || !confirm("Delete this city?")) return;
    setLoading(true);
    const supabase = createClient();
    await supabase.from("cities").delete().eq("id", city.id);
    router.push("/admin/cities");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" value={form.name} onChange={(e) => handleNameChange(e.target.value)} required />
      </div>
      <div>
        <Label htmlFor="slug">Slug</Label>
        <Input id="slug" value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} required placeholder="e.g. losangeles" />
        <p className="text-xs text-[var(--color-text-muted)] mt-1">Used in the URL: /{form.slug}</p>
      </div>
      <div>
        <Label htmlFor="description">Description (optional)</Label>
        <Textarea id="description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Short blurb about the city" />
      </div>
      <div>
        <Label>Cover photo (optional)</Label>
        {form.cover_photo && (
          <div className="relative w-full h-40 rounded-[var(--radius-md)] overflow-hidden mb-2 bg-[var(--color-surface-alt)]">
            <Image src={form.cover_photo} alt="Cover preview" fill className="object-cover" />
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, cover_photo: "" }))}
              className="absolute top-2 right-2 bg-black/50 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-black/70 transition-colors"
            >
              ✕
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <Input
            placeholder="Paste URL or upload a file"
            value={form.cover_photo}
            onChange={(e) => setForm((f) => ({ ...f, cover_photo: e.target.value }))}
          />
          <label className="cursor-pointer shrink-0">
            <span className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-alt)] transition-colors whitespace-nowrap">
              <Plus size={13} /> {uploading ? "Uploading…" : "Upload"}
            </span>
            <input type="file" accept="image/*" className="sr-only" onChange={handlePhotoUpload} disabled={uploading} />
          </label>
        </div>
      </div>
      {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={loading}>{loading ? "Saving…" : city ? "Save changes" : "Create city"}</Button>
        <Button type="button" variant="secondary" onClick={() => router.push("/admin/cities")}>Cancel</Button>
        {city && <Button type="button" variant="danger" className="ml-auto" onClick={handleDelete}>Delete</Button>}
      </div>
    </form>
  );
}
