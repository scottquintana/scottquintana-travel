"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Plus, Pencil, Search } from "lucide-react";
import type { City } from "@/lib/types";

export default function AdminCitiesPage() {
  const [cities, setCities] = useState<City[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    createClient().from("cities").select("*").order("name").then(({ data }) => setCities(data ?? []));
  }, []);

  const filtered = cities.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase()) ||
    c.slug.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="p-4 md:p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-[var(--color-text-primary)]">Cities</h1>
        <Link href="/admin/cities/new"><Button size="sm"><Plus size={14} /> New city</Button></Link>
      </div>
      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
        <Input
          placeholder="Search cities…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-8"
        />
      </div>
      <div className="flex flex-col gap-2">
        {filtered.map((city) => (
          <div key={city.id} className="flex items-center justify-between bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-md)] px-4 py-3">
            <div>
              <p className="font-medium text-sm text-[var(--color-text-primary)]">{city.name}</p>
              <p className="text-xs text-[var(--color-text-muted)]">/{city.slug}</p>
            </div>
            <Link href={`/admin/cities/${city.id}`}><Button variant="ghost" size="sm"><Pencil size={13} /> Edit</Button></Link>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-sm text-[var(--color-text-muted)]">
            {query ? "No cities match your search." : "No cities yet."}
          </p>
        )}
      </div>
    </div>
  );
}
