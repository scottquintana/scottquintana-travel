import Link from "next/link";
import { Building2, MapPin } from "lucide-react";

function QuickLink({ href, icon, label, description }: { href: string; icon: React.ReactNode; label: string; description: string }) {
  return (
    <Link
      href={href}
      className="block p-5 bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] hover:border-[var(--color-accent-muted)] hover:shadow-[var(--shadow-sm)] transition-all"
    >
      <div className="text-[var(--color-accent)] mb-3">{icon}</div>
      <p className="font-medium text-[var(--color-text-primary)] text-sm">{label}</p>
      <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{description}</p>
    </Link>
  );
}

export default function AdminDashboard() {
  return (
    <div className="p-4 md:p-8 max-w-2xl">
      <h1 className="text-2xl font-semibold text-[var(--color-text-primary)] mb-8">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <QuickLink href="/admin/cities" icon={<Building2 size={20} />} label="Cities" description="Manage cities and import places" />
        <QuickLink href="/admin/places" icon={<MapPin size={20} />} label="Places" description="Add & edit places" />
      </div>
    </div>
  );
}
