import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get("address");
  if (!address) return NextResponse.json({ error: "address required" }, { status: 400 });

  const key = process.env.GEOCODING_API_KEY ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) return NextResponse.json({ error: "no api key" }, { status: 500 });

  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${key}`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.status === "OK" && data.results?.[0]) {
    const { lat, lng } = data.results[0].geometry.location;
    return NextResponse.json({ lat, lng });
  }

  return NextResponse.json({ error: data.status }, { status: 422 });
}
