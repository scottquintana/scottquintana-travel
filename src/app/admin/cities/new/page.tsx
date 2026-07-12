import { CityForm } from "@/components/admin/CityForm";

export default function NewCityPage() {
  return (
    <div className="p-8 max-w-xl">
      <h1 className="text-xl font-semibold text-[var(--color-text-primary)] mb-6">New city</h1>
      <CityForm />
    </div>
  );
}
