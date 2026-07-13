# scottquintana-travel

Personal travel site at travel.scottquintana.com. A city-by-city guide to places worth visiting, with list and map views and a lightweight admin panel.

## Stack

- Next.js 16 (App Router + Turbopack)
- Tailwind CSS v4
- Supabase (Postgres + Storage)
- Google Maps JavaScript API

## Getting started

```bash
npm install
npm run dev
```

### Environment variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
ADMIN_PASSWORD=
GEOCODING_API_KEY=        # optional — separate key without referrer restrictions for server-side geocoding
```

## Features

- **Cities page** — searchable grid with place count per city
- **City page** — split list + map on desktop; list-only with full-screen map modal on mobile
- **Place cards** — category color, vetted indicator, distance from set location
- **Multi-location places** — one DB entry, separate list card per location; each sorts by distance independently
- **Distance** — set location via GPS or typed address; haversine distance shown per card, sorts the list
- **Full place page** — `/{citySlug}/{placeSlug}` with description, recommendations, location + map links, website, socials, photos
- **Dark mode** — automatic via `prefers-color-scheme`
- **Admin** — city/place CRUD, bulk JSON import with auto-geocoding

## Project structure

```
src/
  app/
    page.tsx                  # Cities home (server)
    [citySlug]/page.tsx       # City page (server)
    [citySlug]/[placeSlug]/   # Full place detail page
    admin/                    # Admin panel
    api/admin/                # login / logout / geocode routes
  components/
    city/
      CitiesClient            # Searchable cities grid
      CityPageClient          # List + map, all interaction state
    map/
      CityMap                 # Google Maps wrapper
      MobileMapModal          # Full-screen map modal + detail sheet (mobile only)
    places/
      PlaceCard               # List row card
      PlaceDetailPanel        # Desktop bottom strip
      PlaceDetail             # Full place page layout
    admin/
      ImportForm              # Bulk JSON import
      InlineImportPlaceForm   # Per-item review before saving
    ui/                       # Button, Input, Badge, Label, Textarea
  lib/
    types.ts
    utils.ts                  # cn, slugify, haversineDistanceMi, formatDistanceMi, etc.
    geocode.ts                # geocodeAddress() — calls server-side route
data/                         # Local JSON import files (gitignored)
```

## Admin

The admin panel lives at `/admin` (password-protected). From there you can create cities, manage places, and import places from JSON.

## Importing places

Paste or drop a JSON file at `/admin/cities/[id]/import`. Addresses starting with a street number are auto-geocoded on save. The import form also auto-geocodes on load, so coordinates are filled in before you review each entry.

### Single place

```json
{
  "name": "Bestia",
  "category": "food",
  "description": "...",
  "vetted": true,
  "website": "https://...",
  "socials": [
    { "platform": "instagram", "url": "https://..." }
  ],
  "recommendations": ["Pasta", "Cocktails"],
  "photos": ["https://..."],
  "locations": [
    {
      "address": "2121 E 7th Pl, Los Angeles, CA 90021",
      "lat": 0,
      "lng": 0,
      "notes": "Dinner only"
    }
  ]
}
```

### Bulk

```json
{
  "places": [
    { "name": "...", "locations": [...] },
    { "name": "...", "locations": [...] }
  ]
}
```

### Field reference

| Field | Required | Notes |
|---|---|---|
| name | yes | |
| category | no | `food`, `drink`, `activity`, `other` |
| description | no | |
| vetted | no | boolean, default false |
| website | no | |
| socials | no | `[{ platform, url }]` |
| recommendations | no | array of strings |
| photos | no | array of URLs |
| locations | yes | one list card rendered per location |
| locations[].address | yes | |
| locations[].lat | no | auto-geocoded if address starts with a street number |
| locations[].lng | no | auto-geocoded if address starts with a street number |
| locations[].notes | no | shown on list card between name and description |

### Notes on coordinates

If an address starts with a street number, coordinates are looked up automatically and override whatever lat/lng is in the JSON. For a generic address like "Los Angeles, CA", the provided lat/lng is used as-is — make sure it's accurate or the pin will be wrong.

## Deployment

Hosted on Vercel, auto-deploys on push to `main`. Custom domain `travel.scottquintana.com` — DNS via Netlify CNAME to `cname.vercel-dns.com`.
