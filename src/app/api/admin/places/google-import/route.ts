import { NextRequest, NextResponse } from "next/server";

function extractFromMapsUrl(url: string): {
  placeId: string | null;
  name: string | null;
  lat: number | null;
  lng: number | null;
} {
  try {
    const u = new URL(url);

    const placeIdMatch = url.match(/!1s(ChIJ[^!&]+)/);
    const placeId = placeIdMatch ? decodeURIComponent(placeIdMatch[1]) : null;

    const nameMatch = u.pathname.match(/\/maps\/place\/([^/@]+)/);
    const name = nameMatch ? decodeURIComponent(nameMatch[1].replace(/\+/g, " ")) : null;

    const coordMatch = u.pathname.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    const lat = coordMatch ? parseFloat(coordMatch[1]) : null;
    const lng = coordMatch ? parseFloat(coordMatch[2]) : null;

    return { placeId, name, lat, lng };
  } catch {
    return { placeId: null, name: null, lat: null, lng: null };
  }
}

function fetchWithTimeout(url: string, options: RequestInit = {}, ms = 8000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(timer)
  );
}

async function resolveUrl(url: string): Promise<string> {
  try {
    const res = await fetchWithTimeout(url, { redirect: "follow" }, 5000);
    await res.body?.cancel();
    return res.url;
  } catch {
    return url;
  }
}

function mapGoogleTypes(types: string[]): string[] {
  const cats = new Set<string>();
  const drinkTypes = new Set(["bar", "night_club", "liquor_store", "brewery", "winery", "wine_bar", "cocktail_bar"]);
  const foodTypes = new Set([
    "restaurant", "cafe", "bakery", "food", "meal_delivery", "meal_takeaway",
    "fast_food_restaurant", "coffee_shop", "sandwich_shop", "pizza_restaurant",
    "sushi_restaurant", "seafood_restaurant", "steak_house", "hamburger_restaurant",
    "diner", "brunch_restaurant", "japanese_restaurant", "chinese_restaurant",
    "italian_restaurant", "mexican_restaurant", "thai_restaurant", "indian_restaurant",
  ]);
  const activityTypes = new Set([
    "museum", "tourist_attraction", "park", "shopping_mall", "store", "art_gallery",
    "amusement_park", "spa", "gym", "fitness_center", "movie_theater", "library", "zoo",
    "aquarium", "bowling_alley", "stadium", "landmark", "historical_place",
    "national_park", "point_of_interest", "natural_feature",
  ]);

  for (const type of types) {
    if (drinkTypes.has(type)) cats.add("drink");
    if (foodTypes.has(type)) cats.add("food");
    if (activityTypes.has(type)) cats.add("activity");
  }

  return cats.size > 0 ? Array.from(cats) : [];
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.GEOCODING_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "No API key configured" }, { status: 500 });
  }

  const body = await req.json();
  const rawQuery: string = body.query ?? "";
  if (!rawQuery.trim()) {
    return NextResponse.json({ error: "No query provided" }, { status: 400 });
  }

  if (rawQuery.includes("share.google")) {
    return NextResponse.json(
      { error: "Google share links can't be resolved. Search by place name instead, or copy the full URL from Maps on desktop (right-click a place → Copy link)." },
      { status: 400 }
    );
  }

  let searchQuery = rawQuery.trim();
  let hintLat: number | null = null;
  let hintLng: number | null = null;
  let resolvedPlaceId: string | null = null;

  const isUrl =
    rawQuery.includes("maps.app.goo.gl") ||
    rawQuery.includes("goo.gl/maps") ||
    rawQuery.includes("google.com/maps");

  if (isUrl) {
    const finalUrl = await resolveUrl(rawQuery.trim());
    const extracted = extractFromMapsUrl(finalUrl);
    resolvedPlaceId = extracted.placeId;
    if (extracted.name) {
      searchQuery = extracted.name;
      hintLat = extracted.lat;
      hintLng = extracted.lng;
    }
  }

  let placeId: string;

  if (resolvedPlaceId) {
    placeId = resolvedPlaceId;
  } else {
    const findUrl = new URL("https://maps.googleapis.com/maps/api/place/findplacefromtext/json");
    findUrl.searchParams.set("input", searchQuery);
    findUrl.searchParams.set("inputtype", "textquery");
    findUrl.searchParams.set("fields", "place_id");
    if (hintLat !== null && hintLng !== null) {
      findUrl.searchParams.set("locationbias", `circle:5000@${hintLat},${hintLng}`);
    }
    findUrl.searchParams.set("key", apiKey);

    let findData;
    try {
      const findRes = await fetchWithTimeout(findUrl.toString());
      findData = await findRes.json();
    } catch {
      return NextResponse.json({ error: "Request timed out — try again" }, { status: 504 });
    }

    if (findData.status !== "OK" || !findData.candidates?.[0]?.place_id) {
      return NextResponse.json(
        { error: `Place not found (${findData.status || "NO_RESULTS"})` },
        { status: 404 }
      );
    }

    placeId = findData.candidates[0].place_id;
  }

  const detailsUrl = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  detailsUrl.searchParams.set("place_id", placeId);
  detailsUrl.searchParams.set("fields", "name,formatted_address,geometry,website,types,editorial_summary,photos");
  detailsUrl.searchParams.set("key", apiKey);

  let detailsData;
  try {
    const detailsRes = await fetchWithTimeout(detailsUrl.toString());
    detailsData = await detailsRes.json();
  } catch {
    return NextResponse.json({ error: "Request timed out — try again" }, { status: 504 });
  }

  if (detailsData.status !== "OK" || !detailsData.result) {
    return NextResponse.json(
      { error: `Could not fetch place details (${detailsData.status})` },
      { status: 404 }
    );
  }

  const r = detailsData.result;

  // Resolve up to 3 photo references to their CDN URLs
  const photoRefs: string[] = (r.photos ?? [])
    .slice(0, 3)
    .map((p: { photo_reference: string }) => p.photo_reference)
    .filter(Boolean);

  const photos = (
    await Promise.all(
      photoRefs.map(async (ref) => {
        const photoApiUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=1200&photo_reference=${ref}&key=${apiKey}`;
        try {
          const res = await fetchWithTimeout(photoApiUrl, { redirect: "follow" }, 5000);
          await res.body?.cancel();
          return res.url !== photoApiUrl ? res.url : null;
        } catch {
          return null;
        }
      })
    )
  ).filter((u): u is string => Boolean(u));

  return NextResponse.json({
    name: r.name ?? "",
    address: r.formatted_address ?? "",
    lat: r.geometry?.location?.lat ?? 0,
    lng: r.geometry?.location?.lng ?? 0,
    website: r.website ?? "",
    categories: mapGoogleTypes(r.types ?? []),
    description: r.editorial_summary?.overview ?? "",
    photos,
  });
}
