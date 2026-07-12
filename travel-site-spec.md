# Travel Places Site — Build Spec

## Overview

A personal travel site listing places I like across different cities (food, drinks, activities, etc.), each pinned on a map, with a lightweight admin panel to manage entries. Hosted at `travel.scottquintana.com` as a subdomain of my personal site, in its own repo.

Priorities: fast, cheap/free to run (aside from the domain), and simple enough for one person to maintain.

## Tech Stack

- **Framework:** Next.js (App Router), deployed on Vercel free tier
- **Database:** Supabase (Postgres), free tier
- **File storage:** Supabase Storage (free tier), served through its built-in CDN
- **Maps:** Google Maps JavaScript API (requires a billing account on file, but personal-site traffic should stay within the $200/mo free credit)
- **Admin auth:** Simple password gate — single password stored as an env var, checked via middleware before allowing access to `/admin`. No user accounts needed.
- **Hosting/DNS:** Vercel project connected to this repo; CNAME record on `travel.scottquintana.com` pointing at Vercel.

## Data Model

### `cities`
| field | type | notes |
|---|---|---|
| id | uuid | |
| name | text | e.g. "Los Angeles" |
| slug | text, unique | custom, set manually in admin (e.g. `losangeles`) — lets me disambiguate cities like Portland, OR vs Portland, ME |
| description | text, optional | short blurb shown on city page |
| cover_photo | text (URL), optional | |

### `places`
| field | type | notes |
|---|---|---|
| id | uuid | |
| city_id | fk → cities | |
| name | text | |
| category | text | e.g. `food`, `drink`, `activity`, `other` — keep as a flexible string, not a hard enum, so I can add categories later. Provide a default set in the admin UI. |
| description | text | |
| vetted | boolean | checked = I've actually been there; unchecked = recommended secondhand. Must display clearly on the detail view either way (e.g. "Vetted ✓" vs "Unvetted — haven't been yet"). |
| website | text (URL), optional | |
| socials | jsonb array, optional | array of `{ platform: string, url: string }` |
| recommendations | text[], optional | simple list of short tags, e.g. `["Old fashioned", "Fried chicken sandwich"]`. Only really used for food/drink but available on any place. |
| photos | text[] (URLs) | see Image Handling below |
| created_at / updated_at | timestamp | |

### `place_locations`
A place can have multiple physical locations (e.g. a coffee shop with several branches in the same city). All share the parent place's name, description, socials, etc., but each location can have its own address, pin, and notes.

| field | type | notes |
|---|---|---|
| id | uuid | |
| place_id | fk → places | |
| address | text | |
| lat | float | |
| lng | float | |
| notes | text, optional | location-specific detail, e.g. "Lunch only, closes 3pm", "This location has outdoor seating" — shown alongside this specific pin/address in the detail view |

Each location gets its own pin on the city map; clicking any pin for a place opens the same place detail view, scrolled/highlighted to that location if there are multiple.

## Routing

- `/` — homepage, lists all cities (cards with name, cover photo, place count), links to each city page
- `/[citySlug]` — city page (e.g. `/losangeles`)
- `/[citySlug]/[placeSlug]` — standalone place detail page (shareable, also reachable as an overlay from the city page — see below)

`citySlug` is set manually per city in the admin panel. `placeSlug` can be auto-generated from the place name (with a manual override field in admin in case of collisions).

## Public Site UX

### City page

- Shows all places in that city, grouped/filterable by category (Food, Drink, Activity, etc.)
- **Desktop:** split view — list on one side, map on the other, in sync. Hovering/clicking a list item highlights its pin; clicking a pin highlights/scrolls to its list entry.
- **Mobile:** tab toggle between List view and Map view (screen real estate doesn't support split).
- Optional filter to show/hide unvetted places.

### Place detail view

Triggered by clicking a place in the list or a pin on the map. Should feel like an overlay/drawer on top of the city page — the underlying list/map state isn't lost, and closing it returns you right where you were. Use Next.js intercepting/parallel routes (or equivalent) so:
- Navigating to a place *from within* the city page opens it as a modal/drawer over the current view.
- Navigating to `/[citySlug]/[placeSlug]` *directly* (e.g. from a shared link) renders it as a full standalone page, with a clear link back to its city page.

Detail view shows: name, category, vetted/unvetted status, description, all locations (address + any location-specific notes), socials, website, photos, recommendations (if any).

Each location includes:
- "Open in Google Maps" link (deep link using lat/lng, opens the actual Google Maps app/site — not the in-page map)
- "Open in Apple Maps" link (same, via Apple Maps URL scheme)

Also include a **share button** — use the Web Share API where available (mobile), falling back to "copy link" on desktop.

## Admin Panel

Behind the password gate (`/admin`).

- **Cities:** create/edit — name, slug, description, cover photo
- **Places:** create/edit/delete — all fields above, including adding/removing multiple locations per place, uploading photos, toggling vetted/unvetted
- **Manual entry:** a normal form for adding one place at a time
- **Bulk/paste import:** a text box where I can paste a JSON payload (generated ahead of time in a separate Claude conversation — see below) and have it pre-fill the form fields for review before saving. Support both:
  - **Single-place payload** — pre-fills the manual entry form
  - **Multi-place payload** — pre-fills a review list where I can check/edit each place before confirming a bulk add

### Import payload format

This is the format I'll ask Claude to produce when I hand it a place's website, or a Google Maps list of saved places, to scrape/summarize into something this admin panel can ingest. Document this schema clearly enough that any future Claude conversation can produce a valid payload from it. It should also be documented in this repo (e.g. in a `README` or `/admin/import` help text) since I'll reference it when prompting Claude later.

Single place:
```json
{
  "city_slug": "losangeles",
  "name": "Bestia",
  "category": "food",
  "description": "Modern Italian in the Arts District, known for house-made pastas and wood-fired dishes.",
  "vetted": true,
  "website": "https://bestiala.com",
  "socials": [
    { "platform": "instagram", "url": "https://instagram.com/bestiala" }
  ],
  "recommendations": ["Bavette", "Guanciale pizza", "Little gem salad"],
  "photos": ["https://example.com/photo1.jpg"],
  "locations": [
    {
      "address": "2121 E 7th Pl, Los Angeles, CA 90021",
      "lat": 34.0234,
      "lng": -118.2345,
      "notes": "Dinner only, reservations recommended"
    }
  ]
}
```

Bulk (multiple places):
```json
{ "places": [ { ...same shape as above... }, { ... } ] }
```

Notes for the import UI:
- `photos` in an imported payload will typically be external URLs scraped from the source site — the admin form should accept these as-is initially (simplest, no extra cost), while still allowing me to replace/add photos via direct upload to Supabase Storage.
- All fields except `city_slug`, `name`, and at least one location should be treated as optional, since scraped data will be incomplete sometimes.
- The import screen should validate the payload and clearly flag missing/invalid required fields before I can save.

## Image Handling

Goal: fast and cheap, not overkill.

- Store uploaded photos in Supabase Storage (public bucket), served via its built-in CDN.
- Resize images client-side (or on upload) to a reasonable max dimension (e.g. 1600px wide) before storing, to keep storage and bandwidth down.
- Use Next.js `<Image>` for responsive rendering, pointed at the Supabase public URLs.
- Keep an eye on Supabase's free-tier storage/bandwidth limits (currently ~1GB storage / limited monthly bandwidth) — fine for a personal project, but worth a note in the repo so it's not forgotten if the photo count grows a lot.

## Styling / Theming

UI should be built so the overall look can be changed from one central place rather than hunting through individual components.

- Define colors, fonts, spacing, and border-radius as design tokens (e.g. Tailwind theme config, or CSS variables in a single global stylesheet) — components should reference tokens, not hardcoded values.
- Shared UI primitives (buttons, cards, badges, tags, inputs) should live as reusable components used everywhere, not re-implemented per page, so a style change to a primitive updates the whole site.
- Goal: swapping the color palette, font, or general look/feel should mean editing one config/theme file, not touching every component.

## Suggested Build Order

1. Data model + Supabase setup (tables above, storage bucket)
2. Public pages: homepage (city list) → city page (list + map, no admin yet, seed data manually) → place detail view (modal + standalone)
3. Admin panel: password gate → manual CRUD for cities/places/locations → photo upload
4. Import tooling: paste-JSON box → validation → review/edit → save (single, then bulk)
5. Polish: share button, Google/Apple Maps deep links, mobile tab view, vetted/unvetted styling

## Final Deliverable: Import Format Blip for CLAUDE.md

Once the site is built, produce a short standalone Markdown snippet documenting the final import payload format (single + bulk), matching whatever the schema actually ends up being after implementation (field names, required vs optional, category values, etc. — this may drift slightly from the draft schema above). This snippet will be pasted into a personal CLAUDE.md file so that future Claude conversations know exactly how to format a payload when I ask them to look up a place (from a website or a Google Maps list) and generate an import-ready JSON blob for this admin panel. Keep it terse and example-driven — it just needs the schema, field meanings, and one or two sample payloads.

## Out of Scope (for now)

- User accounts / comments / likes from visitors
- Full-text search (unless trivially easy to add later)
- Multi-admin support (just me)
