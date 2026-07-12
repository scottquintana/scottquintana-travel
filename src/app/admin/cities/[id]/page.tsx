import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CityForm } from "@/components/admin/CityForm";
import { Button } from "@/components/ui/Button";
import { Upload } from "lucide-react";

export default async function EditCityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: city } = await supabase.from("cities").select("*").eq("id", id).single();
  if (!city) notFound();
  return (
    <div className="p-8 max-w-xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">Edit city</h1>
        <Link href={`/admin/cities/${id}/import`}>
          <Button variant="secondary" size="sm"><Upload size={13} /> Import places</Button>
        </Link>
      </div>
      <CityForm city={city} />
    </div>
  );
}
