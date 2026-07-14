#!/usr/bin/env python3
"""
Scrape a public Google Maps saved list into our bulk import JSON format.

USAGE
-----
Interactive (prompts for URL and filename):
    python3 scripts/scrape_maps_list.py

One-liner:
    python3 scripts/scrape_maps_list.py <list_url> [output_name] [--debug]

    output_name is a bare filename (no path, no extension) — saved to data/<name>.json.
    Defaults to "scraped_list" → data/scraped_list.json.

One-time setup (copies Google auth from your logged-in Chrome):
    python3 scripts/scrape_maps_list.py --login

FLAGS
-----
--login   Copy Google session cookies from Chrome (run once before scraping)
--debug   Open a visible browser window (useful if scraping fails silently)

DEPENDENCIES
------------
    pip install playwright requests browser-cookie3
    playwright install chromium

HOW IT WORKS (and what to fix if Google changes things)
--------------------------------------------------------
1. LIST PAGE SCRAPING
   The script opens your Google Maps list URL in a Playwright-controlled Chromium
   browser using your Chrome session cookies (so private lists are accessible).

   Place names are found via the CSS selector:
       [class*="fontHeadlineSmall"][class*="rZF81c"]
   These are the heading divs Google Maps renders for each list item as of 2026-07.

   IF THIS BREAKS: Run with --debug, open dev tools (F12) in the browser window,
   inspect a place name element, and update PLACE_NAME_SEL below with the new class.

2. PLACE URL EXTRACTION
   Clicking each name div navigates to that place's Google Maps page. The resulting
   URL (e.g. https://www.google.com/maps/place/...) is captured and used for both
   description scraping and Places API lookup.

   IF THIS BREAKS: The click may no longer trigger navigation. Try updating the
   fallback click in scrape_list_items() to target a different ancestor element.

3. PLACES API LOOKUP
   For each place, the script calls the Google Places API (findplacefromtext) with
   the place name and a location bias centered on the map coordinates in the list URL.

   Location bias is a SOFT preference — it ranks nearby results higher but does NOT
   exclude places. A place in Tokyo named "PDX Taproom" will still be found. Nothing
   is silently dropped; any unexpected match is logged.

   IF THIS BREAKS: Check that NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local has
   the Places API enabled in the Google Cloud Console.

4. DESCRIPTION SCRAPING
   Descriptions are scraped from the individual place page by looking for leaf <span>
   elements in [role="main"] with 40–1000 characters that read like prose (>5 words).
   These are usually review snippets from the first visible review on the page.
   Google's editorial_summary field is used as a fallback if page scraping finds nothing.

   IF THIS BREAKS: The span heuristic may pick up non-description text. Inspect
   the place page in --debug mode and update the evaluate() selector in
   scrape_place_description().

5. OUTPUT FORMAT
   Output is our bulk import format: { "places": [ ...ImportSinglePayload ] }
   See README.md for the full field reference. Drop the file into
   /admin/cities/[id]/import to review and save.

   Required fields per place: name, locations[].address
   Auto-geocoded on import if address starts with a street number.
"""

import asyncio
import json
import os
import re
import sys
import time
from pathlib import Path
from typing import Optional

try:
    from playwright.async_api import async_playwright, Page
except ImportError:
    print("Missing dependency: pip install playwright && playwright install chromium")
    sys.exit(1)

try:
    import requests
except ImportError:
    print("Missing dependency: pip install requests")
    sys.exit(1)


# ---------------------------------------------------------------------------
# Selectors — update these if Google changes their DOM structure
# ---------------------------------------------------------------------------

# Heading div for each place card in the list sidebar (as of 2026-07)
PLACE_NAME_SEL = '[class*="fontHeadlineSmall"][class*="rZF81c"]'

# Scrollable sidebar panel — Google Maps uses several possible containers
SIDEBAR_SEL = '[role="feed"], .m6QErb[tabindex="-1"], .m6QErb'


# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

AUTH_FILE = Path("data/google_auth.json")


def load_api_key() -> str:
    env_file = Path(__file__).parent.parent / ".env.local"
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            if line.startswith("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    return os.environ.get("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY", "")


API_KEY = load_api_key()

GOOGLE_TYPE_TO_CATEGORY = {
    "restaurant": "food", "food": "food", "cafe": "food", "bakery": "food",
    "meal_takeaway": "food", "meal_delivery": "food",
    "bar": "drink", "night_club": "drink", "brewery": "drink",
    "winery": "drink", "liquor_store": "drink",
    "park": "activity", "museum": "activity", "art_gallery": "activity",
    "tourist_attraction": "activity", "amusement_park": "activity",
    "gym": "activity", "spa": "activity", "campground": "activity",
    "natural_feature": "activity", "hiking_area": "activity",
}


# ---------------------------------------------------------------------------
# URL cleaning
# ---------------------------------------------------------------------------

def clean_maps_url(raw: str) -> str:
    """
    Normalize a Google Maps URL pasted from the browser or terminal.
    Handles shell-escape backslashes (\\!, \\=, \\?, \\&) and extra whitespace.
    """
    url = raw.strip()
    # Strip any backslash escaping that zsh / bash may have added
    url = url.replace("\\", "")
    # Collapse any accidental double-encoded spaces
    url = url.strip()
    return url


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def extract_latlng_from_url(url: str) -> tuple:
    """Pull @lat,lng from a Google Maps URL for use as location bias."""
    m = re.search(r'@(-?\d+\.\d+),(-?\d+\.\d+)', url)
    if m:
        return float(m.group(1)), float(m.group(2))
    return None, None


def guess_category(types: list) -> str:
    for t in types:
        if t in GOOGLE_TYPE_TO_CATEGORY:
            return GOOGLE_TYPE_TO_CATEGORY[t]
    return "other"


def places_api_details(place_id: str) -> Optional[dict]:
    resp = requests.get(
        "https://maps.googleapis.com/maps/api/place/details/json",
        params={
            "place_id": place_id,
            "fields": "name,formatted_address,geometry,website,editorial_summary,photos,types",
            "key": API_KEY,
        },
        timeout=10,
    )
    data = resp.json()
    if data.get("status") == "OK":
        return data["result"]
    print(f"    Places API error: {data.get('status')} — {data.get('error_message', '')}")
    return None


def find_place_by_name(
    search_name: str,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
) -> Optional[dict]:
    """
    Text-search the Places API for a place by name.
    lat/lng adds a soft location bias (does NOT filter — a place anywhere can still
    match if it's the best text result). The found place name is always logged so
    unexpected matches are visible.
    """
    params = {
        "input": search_name,
        "inputtype": "textquery",
        "fields": "place_id,name",
        "key": API_KEY,
    }
    if lat is not None and lng is not None:
        params["locationbias"] = f"circle:50000@{lat},{lng}"

    resp = requests.get(
        "https://maps.googleapis.com/maps/api/place/findplacefromtext/json",
        params=params,
        timeout=10,
    )
    data = resp.json()
    if data.get("status") == "OK" and data.get("candidates"):
        candidate = data["candidates"][0]
        found_name = candidate.get("name", "?")
        if found_name.lower() != search_name.lower():
            print(f"    Note: searched '{search_name}' → matched '{found_name}'")
        return places_api_details(candidate["place_id"])
    return None


def photo_url(photo_reference: str, max_width: int = 1200) -> str:
    return (
        f"https://maps.googleapis.com/maps/api/place/photo"
        f"?maxwidth={max_width}&photo_reference={photo_reference}&key={API_KEY}"
    )


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

def load_chrome_cookies() -> list:
    """Extract Google cookies from the user's logged-in Chrome profile."""
    try:
        import browser_cookie3
        jar = browser_cookie3.chrome(domain_name=".google.com")
        cookies = []
        for c in jar:
            cookies.append({
                "name": c.name,
                "value": c.value,
                "domain": c.domain,
                "path": c.path,
                "secure": bool(c.secure),
                "httpOnly": False,
                "sameSite": "Lax",
            })
        return cookies
    except Exception as e:
        print(f"  Warning: could not read Chrome cookies: {e}")
        return []


async def do_login():
    """Copy Google session cookies from Chrome and save for scraping."""
    print("Reading Google cookies from your Chrome profile…")
    cookies = load_chrome_cookies()
    if not cookies:
        print("No Google cookies found. Make sure you're logged into Google in Chrome.")
        sys.exit(1)
    AUTH_FILE.parent.mkdir(exist_ok=True)
    AUTH_FILE.write_text(json.dumps({"cookies": cookies}))
    print(f"Saved {len(cookies)} cookie(s) to {AUTH_FILE}")
    print("You're ready to scrape. Run the script again with a list URL.")


# ---------------------------------------------------------------------------
# Scraping
# ---------------------------------------------------------------------------

async def scroll_to_bottom(page: Page):
    """
    Scroll the Maps sidebar until no new place cards appear.
    Google Maps lazy-loads list items as you scroll, so we keep scrolling
    until the count is stable for two consecutive checks.
    """
    last_count = 0
    stable_rounds = 0
    for attempt in range(30):  # hard cap: 30 * 1.5s = 45s max
        # Scroll the last visible item into view (most reliable trigger for lazy load)
        els = await page.query_selector_all(PLACE_NAME_SEL)
        if els:
            await els[-1].scroll_into_view_if_needed()

        # Also push the sidebar container to its bottom
        sidebar_found = await page.evaluate(f"""() => {{
            const s = document.querySelector('{SIDEBAR_SEL}');
            if (s) {{ s.scrollTop = s.scrollHeight; return true; }}
            window.scrollTo(0, document.body.scrollHeight);
            return false;
        }}""")

        await page.wait_for_timeout(1500)
        count = len(await page.query_selector_all(PLACE_NAME_SEL))
        print(f"    scroll {attempt+1}: {count} items ({'sidebar' if sidebar_found else 'page scroll'})")

        if count == last_count:
            stable_rounds += 1
            if stable_rounds >= 2:
                break
        else:
            stable_rounds = 0
        last_count = count


async def scrape_list_items(page: Page, list_url: str) -> list:
    """
    Open the list page and return [{name, url}, ...] for each place.

    Google Maps list items are rendered as non-link divs (no <a href>).
    We find them by their heading class (PLACE_NAME_SEL), click each one,
    and capture the resulting Google Maps place URL.

    If items are visible in --debug mode but none are found here, PLACE_NAME_SEL
    needs updating — inspect the heading element in the browser dev tools.
    """
    print("Loading list page…")
    try:
        await page.goto(list_url, wait_until="domcontentloaded", timeout=30000)
    except Exception as e:
        print(f"  Warning: page load error ({e}), continuing with what loaded…")

    # Maps renders the sidebar via JS after initial load
    await page.wait_for_timeout(5000)
    await scroll_to_bottom(page)
    await page.wait_for_timeout(1000)

    name_els = await page.query_selector_all(PLACE_NAME_SEL)
    if not name_els:
        print(f"  ERROR: No elements matched PLACE_NAME_SEL = '{PLACE_NAME_SEL}'")
        print("  This selector may be outdated. Run with --debug, open dev tools,")
        print("  inspect a place name element, and update PLACE_NAME_SEL at the top of this file.")
        await page.screenshot(path="data/debug_list.png")
        print("  Screenshot saved to data/debug_list.png")
        return []

    # Collect names before clicking anything
    names = []
    for el in name_els:
        text = await el.evaluate("el => el.textContent.trim()")
        if text:
            names.append(text)

    print(f"  Found {len(names)} place(s): {names[:5]}{'…' if len(names) > 5 else ''}")

    async def find_el_by_name(target: str) -> Optional[object]:
        """Find a place name element by text, scrolling to load more if needed."""
        for _ in range(8):
            els = await page.query_selector_all(PLACE_NAME_SEL)
            for e in els:
                text = await e.evaluate("el => el.textContent.trim()")
                if text == target:
                    return e
            # Not found yet — scroll sidebar to load more items
            await page.evaluate(f"""() => {{
                const s = document.querySelector('{SIDEBAR_SEL}');
                if (s) s.scrollTop += 1500;
                else window.scrollBy(0, 1500);
            }}""")
            await page.wait_for_timeout(1200)
        return None

    results = []
    for i, name in enumerate(names):
        try:
            el = await find_el_by_name(name)
            if not el:
                print(f"  [{i+1}/{len(names)}] Could not find '{name}' after scrolling — skipping")
                continue

            await el.scroll_into_view_if_needed()
            prev_url = page.url
            await el.click()
            await page.wait_for_timeout(2500)
            url = page.url

            # Fallback: click nearest ancestor with a jsaction if direct click didn't navigate
            if url == prev_url or "maps/place" not in url:
                await el.evaluate("el => el.closest('a, [jsaction]')?.click()")
                await page.wait_for_timeout(2000)
                url = page.url

            if "maps/place" in url or "!1s" in url:
                results.append({"name": name, "url": url})
                print(f"  [{i+1}/{len(names)}] {name}")
            else:
                print(f"  [{i+1}/{len(names)}] '{name}' — click didn't navigate to a place page, skipping")
                print(f"    Current URL: {url[:100]}")

            await page.go_back(wait_until="domcontentloaded", timeout=10000)
            await page.wait_for_timeout(2000)

        except Exception as e:
            print(f"  [{i+1}] Error processing '{name[:40]}': {e}")
            # Recover by reloading the list
            try:
                await page.goto(list_url, wait_until="domcontentloaded", timeout=15000)
                await page.wait_for_timeout(3000)
            except Exception:
                pass

    return results


async def scrape_place_description(page: Page, place_url: str) -> Optional[str]:
    """
    Visit a place page and scrape a description.
    Looks for leaf <span> elements in [role="main"] with prose-like text (>5 words,
    40–1000 chars). Usually finds a review snippet or editorial summary.

    If this consistently returns garbage text, inspect the place page in --debug mode
    and update the evaluate() logic below.
    """
    try:
        await page.goto(place_url, wait_until="domcontentloaded", timeout=20000)
    except Exception as e:
        print(f"    Warning: could not load place page ({e})")
        return None
    await page.wait_for_timeout(2000)

    description = await page.evaluate("""() => {
        // Review-like patterns that indicate we grabbed a user review, not a description
        const reviewPatterns = [
            /^(I|We|My|Our|The|This|Their|It)\\b/,
            /^["']/,
            /\\b(I (love|hate|tried|came|went|had|ordered|visited|found|really))\\b/i,
            /\\b(the (staff|service|food|place) (was|is|were|are))\\b/i,
        ];
        const candidates = [];
        const spans = document.querySelectorAll('[role="main"] span, [role="region"] span');
        for (const span of spans) {
            if (span.children.length > 0) continue;
            if (span.closest('button')) continue;
            if (span.closest('[role="listitem"]')) continue;
            const text = span.textContent.trim();
            if (text.length > 40 && text.length < 1000 && text.split(' ').length > 5) {
                candidates.push(text);
            }
        }
        for (const c of candidates) {
            if (!reviewPatterns.some((re) => re.test(c))) return c;
        }
        return null;
    }""")

    return description


# ---------------------------------------------------------------------------
# Build output payload
# ---------------------------------------------------------------------------

def build_payload(item: dict, details: Optional[dict], description: Optional[str]) -> dict:
    """
    Assemble an ImportSinglePayload dict from scraped data + Places API result.
    See README.md for the full field reference.
    If details is None (API lookup failed), a skeleton entry is created so the
    place isn't silently dropped — it will show up in the importer with empty fields.
    """
    if details:
        name = details.get("name", item["name"])
        address = details.get("formatted_address", "")
        geo = details.get("geometry", {}).get("location", {})
        lat, lng = geo.get("lat", 0), geo.get("lng", 0)
        website = details.get("website") or None
        category = guess_category(details.get("types", []))
        api_desc = (details.get("editorial_summary") or {}).get("overview", "")
        photos = [
            photo_url(p["photo_reference"])
            for p in (details.get("photos") or [])[:3]
            if "photo_reference" in p
        ]
    else:
        # API lookup failed — keep the name from the list, leave other fields empty
        print(f"    No API data for '{item['name']}' — placeholder entry created")
        name = item["name"]
        address, lat, lng = "", 0, 0
        website, category, api_desc, photos = None, "other", "", []

    desc = description or api_desc or ""

    return {
        "name": name,
        "categories": [category],
        "description": desc,
        "vetted": True,
        "website": website,
        "recommendations": [],
        "photos": photos,
        "locations": [
            {
                "address": address,
                "lat": lat,
                "lng": lng,
                "notes": "",
            }
        ],
    }


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

async def main():
    flags = [a for a in sys.argv[1:] if a.startswith("--")]
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    debug = "--debug" in flags
    login = "--login" in flags

    if login:
        await do_login()
        return

    # Interactive mode when no URL provided
    if not args:
        print("Google Maps List Scraper")
        print("─" * 40)
        raw_url = input("Paste your Google Maps list URL: ").strip()
        if not raw_url:
            print("No URL provided.")
            sys.exit(1)
        name_input = input("Output filename (saved to data/<name>.json) [scraped_list]: ").strip()
        if not name_input:
            name_input = "scraped_list"
        # Strip .json if they included it
        name_input = name_input.removesuffix(".json")
        list_url = clean_maps_url(raw_url)
        output_path = Path("data") / f"{name_input}.json"
    else:
        list_url = clean_maps_url(args[0])
        name_input = args[1].removesuffix(".json") if len(args) > 1 else "scraped_list"
        output_path = Path("data") / f"{name_input}.json"
        # If they passed a full path, respect it
        if len(args) > 1 and "/" in args[1]:
            output_path = Path(args[1])

    center_lat, center_lng = extract_latlng_from_url(list_url)
    print(f"\nURL: {list_url}")
    if center_lat:
        print(f"Location bias: {center_lat}, {center_lng} (biases text search, does not filter)")
    print(f"Output: {output_path}\n")

    if not API_KEY:
        print(
            "Error: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY not found.\n"
            "Add it to .env.local or set it as an environment variable."
        )
        sys.exit(1)

    if not AUTH_FILE.exists():
        print(f"No saved Google session. Run first:\n  python3 {sys.argv[0]} --login")
        sys.exit(1)

    saved = json.loads(AUTH_FILE.read_text())
    cookies = saved.get("cookies", saved) if isinstance(saved, dict) else saved

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(
            headless=not debug,
            args=["--disable-blink-features=AutomationControlled"],
        )
        context = await browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            viewport={"width": 1280, "height": 900},
            locale="en-US",
        )
        await context.add_cookies(cookies)
        await context.add_init_script(
            "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
        )
        page = await context.new_page()

        items = await scrape_list_items(page, list_url)
        if not items:
            print("\nNo places found. Run with --debug to watch the browser.")
            await browser.close()
            sys.exit(1)

        print(f"\nFound {len(items)} place(s). Fetching details…\n")

        places = []
        for i, item in enumerate(items, 1):
            print(f"[{i}/{len(items)}] {item['name']}")

            details = find_place_by_name(item["name"], center_lat, center_lng)
            if not details:
                print(f"  Warning: Places API returned no result for '{item['name']}'")

            description = await scrape_place_description(page, item["url"])
            if description:
                print(f"  description: \"{description[:70]}{'…' if len(description) > 70 else ''}\"")
            else:
                api_desc = (details or {}).get("editorial_summary", {}).get("overview", "")
                description = api_desc or None
                src = "API" if description else "none"
                preview = f'"{description[:70]}"' if description else "—"
                print(f"  description ({src}): {preview}")

            payload = build_payload(item, details, description)
            places.append(payload)

            addr = payload["locations"][0]["address"] or "(no address)"
            print(f"  → {payload['name']} · {', '.join(payload['categories'])} · {addr}\n")

            time.sleep(0.4)

        await browser.close()

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output = {"places": places}
    output_path.write_text(json.dumps(output, indent=2, ensure_ascii=False))

    print(f"Done. Wrote {len(places)} place(s) to {output_path}")
    print(f"Drop it into /admin/cities/[id]/import to review and save.")


if __name__ == "__main__":
    asyncio.run(main())
