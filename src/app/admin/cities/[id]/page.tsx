import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CityForm } from "@/components/admin/CityForm";
import { ExportButton } from "@/components/admin/ExportButton";
import { FetchPhotosSection } from "@/components/admin/FetchPhotosButton";
import { DeleteAllPlacesButton } from "@/components/admin/DeleteAllPlacesButton";
import { Button } from "@/components/ui/Button";
import { Upload, ListChecks } from "lucide-react";

export default async function EditCityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: city } = await supabase.from("cities").select("*").eq("id", id).single();
  if (!city) notFound();
  return (
    <div className="p-4 md:p-8 max-w-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">Edit city</h1>
        <div className="flex flex-wrap items-center gap-2">
          <DeleteAllPlacesButton cityId={id} cityName={city.name} />
          <ExportButton cityId={id} cityName={city.name} />
          <Link href={`/admin/cities/${id}/bulk-edit`}>
            <Button variant="secondary" size="sm"><ListChecks size={13} /> Bulk edit</Button>
          </Link>
          <Link href={`/admin/cities/${id}/import`}>
            <Button variant="secondary" size="sm"><Upload size={13} /> Import places</Button>
          </Link>
        </div>
      </div>
      <CityForm city={city} />
      <FetchPhotosSection cityId={id} />
    </div>
  );
}
