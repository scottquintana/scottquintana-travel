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
| categories | no | array — `["food"]`, `["food", "drink"]`, etc. Also accepts legacy `category` string |
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

## Google Maps list scraper

`scripts/scrape_maps_list.py` scrapes a Google Maps saved list and outputs a bulk JSON file ready to paste into the import panel.

### How it works

1. Opens the list URL in a headless Playwright browser using your saved Google auth cookies
2. Scrolls the sidebar until no new place cards appear
3. Clicks each place card, captures the resulting place URL, and goes back
4. For each place, calls the Google Places API (text search with location bias) to get the address, coordinates, website, and category
5. Optionally visits each place page to scrape a description
6. Writes a `{ "places": [...] }` bulk JSON file to `data/<name>.json`

### Dependencies

```bash
pip install playwright browser-cookie3 requests
playwright install chromium
```

- **playwright** — headless browser for scraping the Maps list
- **browser-cookie3** — reads your existing Chrome Google session so the script can access private lists without automating sign-in (Google blocks that)
- **requests** — Places API calls

### API keys

The script uses two environment variables:

```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=   # already required for the app — used for Places API lookups
GEOCODING_API_KEY=                 # optional — if set, used instead of the above for Places API calls
```

The Places API must have the **Places API** enabled in Google Cloud Console. The same key used for the Maps JavaScript API should work.

### First-time auth setup

The script reads cookies from your local Chrome profile. You need to be logged into Google in Chrome first. Then run:

```bash
python3 scripts/scrape_maps_list.py --login
```

This saves your session to `data/google_auth.json` (gitignored). Re-run `--login` any time you see a "Choose an account" screen in the debug screenshot — it means the saved session expired.

### Usage

```bash
# Interactive (prompts for URL and filename)
python3 scripts/scrape_maps_list.py

# Non-interactive
python3 scripts/scrape_maps_list.py 'https://www.google.com/maps/...' data/output.json

# Watch the browser while it runs (useful for debugging)
python3 scripts/scrape_maps_list.py --debug
```

The URL should be copied directly from the address bar while viewing a Google Maps saved list. The script will clean up any shell-escaping artifacts automatically.

Output is written to `data/<name>.json` and is ready to paste or drop into `/admin/cities/[id]/import`.

### If Google changes the DOM

The script is fragile by nature — Google Maps is a React app with generated class names that can change without notice. Two things are most likely to break:

**Place name selector** (`PLACE_NAME_SEL` at the top of the file): Run with `--debug`, open browser DevTools, inspect a place name in the sidebar, and update the selector to match the new class names.

**Description scraping**: Run with `--debug` and inspect the place page markup. Update the `evaluate()` block in `scrape_place_description()` to target the right element.

When either breaks, the script logs an error with instructions and saves a screenshot to `data/debug_list.png`.

## Deployment

Hosted on Vercel, auto-deploys on push to `main`. Custom domain `travel.scottquintana.com` — DNS via Netlify CNAME to `cname.vercel-dns.com`.
