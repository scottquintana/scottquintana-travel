# scottquintana-travel

Personal travel site at travel.scottquintana.com. A city-by-city guide to places worth visiting, with a map view and a lightweight admin panel.

## Stack

- Next.js (App Router)
- Tailwind CSS v4
- Supabase (Postgres + Storage)
- Google Maps JavaScript API

## Getting started

```bash
npm install
npm run dev
```

### Required environment variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
```

## Project structure

```
src/
  app/
    (public)/         # City and place pages
    admin/            # Admin panel (cities, places, import)
  components/
    city/             # CityPageClient (list + map layout)
    map/              # CityMap (Google Maps wrapper)
    places/           # PlaceCard, PlaceDetailPanel
    admin/            # ImportForm, InlineImportPlaceForm
  lib/
    supabase/         # Client and server Supabase instances
    types.ts          # Shared types
    utils.ts          # slugify, formatCategory, cn
    geocode.ts        # Google geocoding helper
data/                 # Local JSON files for import (gitignored)
```

## Admin

The admin panel lives at `/admin`. From there you can create cities, manage places, and import places from JSON.

## Importing places

Places are imported through the admin panel at `/admin/cities/[id]/import`. Paste or drop a JSON file in either single-place or bulk format.

On save, addresses that start with a street number are automatically geocoded via the Google Maps API to get accurate coordinates.

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
      "lat": 34.0403,
      "lng": -118.2305,
      "notes": "Dinner only"
    }
  ]
}
```

### Bulk

```json
{
  "places": [
    { ...same shape as above... },
    { ...same shape as above... }
  ]
}
```

### Field reference

| Field | Required | Notes |
|---|---|---|
| name | yes | |
| category | no | food, drink, activity, other |
| description | no | |
| vetted | no | boolean, default false |
| website | no | |
| socials | no | array of `{ platform, url }` |
| recommendations | no | array of strings (dishes, items to order, etc.) |
| photos | no | array of URLs |
| locations | yes | at least one required |
| locations[].address | yes | street address |
| locations[].lat | yes | used as fallback if geocoding fails |
| locations[].lng | yes | used as fallback if geocoding fails |
| locations[].notes | no | e.g. "parking in rear", "dinner only" |

Categories `food` and `drink` show recommendations under "Order". Category `activity` shows them under "Don't miss".

### Notes on coordinates

If an address starts with a street number, coordinates are looked up automatically on save and override whatever lat/lng is in the JSON. For entries with a generic address like "Los Angeles, CA", the provided lat/lng is used as-is, so make sure it is accurate or the pin will be wrong on the map.
