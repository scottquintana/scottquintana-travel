import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Frosted-glass overlay buttons — for use over cover photos
export const OVERLAY_CAPSULE = "inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full border border-white/25 bg-black/25 text-white backdrop-blur-sm hover:bg-black/40 transition-colors shrink-0";
export const OVERLAY_CIRCLE = "inline-flex items-center justify-center w-8 h-8 rounded-full border border-white/25 bg-black/25 text-white backdrop-blur-sm hover:bg-black/40 transition-colors shrink-0";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function formatCategory(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1);
}

export function googleMapsUrl(lat: number, lng: number, label?: string): string {
  const query = label ? `${label}@${lat},${lng}` : `${lat},${lng}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function haversineDistanceMi(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistanceMi(mi: number): string {
  if (mi < 0.1) return "< 0.1 mi";
  if (mi < 10) return `${mi.toFixed(1)} mi`;
  return `${Math.round(mi)} mi`;
}

export function appleMapsUrl(lat: number, lng: number, label?: string): string {
  const params = new URLSearchParams({ ll: `${lat},${lng}`, q: label || "" });
  return `https://maps.apple.com/?${params}`;
}
