export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  if (!address.trim()) return null;
  try {
    const res = await fetch(`/api/admin/geocode?address=${encodeURIComponent(address)}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.lat !== undefined && data.lng !== undefined) return { lat: data.lat, lng: data.lng };
  } catch (err) {
    console.warn("Geocode request failed:", err);
  }
  return null;
}

export function isSpecificAddress(address: string): boolean {
  return /^\d/.test(address.trim());
}
