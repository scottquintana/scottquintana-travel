import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BulkEditPlaces } from "@/components/admin/BulkEditPlaces";
import { ArrowLeft } from "lucide-react";

export default async function BulkEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: city }, { data: places }] = await Promise.all([
    supabase.from("cities").select("*").eq("id", id).single(),
    supabase.from("places").select("*").eq("city_id", id).order("name"),
  ]);

  if (!city) notFound();

  return (
    <div className="p-4 md:p-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={`/admin/cities/${id}`}
          className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">Bulk edit</h1>
          <p className="text-sm text-[var(--color-text-muted)]">{city.name}</p>
        </div>
      </div>
      <BulkEditPlaces places={places ?? []} />
    </div>
  );
}
