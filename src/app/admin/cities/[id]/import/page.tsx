import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ImportForm } from "@/components/admin/ImportForm";

export default async function CityImportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: city } = await supabase.from("cities").select("*").eq("id", id).single();
  if (!city) notFound();

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <Link
          href={`/admin/cities/${id}`}
          className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-accent)] transition-colors"
        >
          ← Back to {city.name}
        </Link>
        <h1 className="text-xl font-semibold text-[var(--color-text-primary)] mt-1">
          Import places — {city.name}
        </h1>
      </div>
      <ImportForm city={city} />
    </div>
  );
}
