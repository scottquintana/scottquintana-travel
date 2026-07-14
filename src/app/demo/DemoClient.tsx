"use client";

import { useState } from "react";
import { Check, LocateFixed, ChevronDown, Map, ArrowRight, Search, Sun, Moon } from "lucide-react";
import { CityMap } from "@/components/map/CityMap";

// ─── Palettes ────────────────────────────────────────────────────────────────

type PaletteVars = Record<string, string>;

const PALETTES: Record<string, { label: string; light: PaletteVars; dark: PaletteVars }> = {
  current: {
    label: "Current",
    light: {},
    dark: {
      "--color-background": "#111110",
      "--color-surface": "#1c1b1a",
      "--color-surface-alt": "#252422",
      "--color-border": "#333230",
      "--color-border-subtle": "#2a2927",
      "--color-text-primary": "#f5f4f2",
      "--color-text-secondary": "#a8a29e",
      "--color-text-muted": "#6b6560",
      "--color-accent": "#4aa39c",
      "--color-accent-hover": "#57b3ac",
      "--color-accent-light": "#1a2f2e",
      "--color-accent-muted": "#4a9e96",
    },
  },

  mediterranean: {
    label: "Mediterranean",
    light: {
      "--color-background": "#f0efed",
      "--color-surface": "#fafaf8",
      "--color-surface-alt": "#d6cfb5",
      "--color-border": "#c4bca8",
      "--color-border-subtle": "#ddd8cc",
      "--color-text-primary": "#2e2e2e",
      "--color-text-secondary": "#584e40",
      "--color-text-muted": "#a27e69",
      "--color-accent": "#7091a8",
      "--color-accent-hover": "#587890",
      "--color-accent-light": "#dde6ee",
      "--color-accent-muted": "#8aa4b8",
    },
    dark: {
      "--color-background": "#1c1c1c",
      "--color-surface": "#2e2e2e",
      "--color-surface-alt": "#3a3a3a",
      "--color-border": "#4a4a4a",
      "--color-border-subtle": "#404040",
      "--color-text-primary": "#f0efed",
      "--color-text-secondary": "#d6cfb5",
      "--color-text-muted": "#a27e69",
      "--color-accent": "#7091a8",
      "--color-accent-hover": "#8aaabe",
      "--color-accent-light": "#182028",
      "--color-accent-muted": "#c19066",
    },
  },

  bold: {
    label: "Bold",
    light: {
      "--color-background": "#f0eeea",
      "--color-surface": "#ffffff",
      "--color-surface-alt": "#e6e3dc",
      "--color-border": "#cdc9c0",
      "--color-border-subtle": "#dbd8d0",
      "--color-text-primary": "#0c1e30",
      "--color-text-secondary": "#2a3a50",
      "--color-text-muted": "#6a7888",
      "--color-accent": "#c84420",
      "--color-accent-hover": "#a83418",
      "--color-accent-light": "#fce6de",
      "--color-accent-muted": "#d85c38",
    },
    dark: {
      "--color-background": "#08121e",
      "--color-surface": "#0e1c2c",
      "--color-surface-alt": "#162538",
      "--color-border": "#243548",
      "--color-border-subtle": "#1c2e40",
      "--color-text-primary": "#f0eeea",
      "--color-text-secondary": "#a0b0c8",
      "--color-text-muted": "#506070",
      "--color-accent": "#e04e28",
      "--color-accent-hover": "#f05e38",
      "--color-accent-light": "#280e04",
      "--color-accent-muted": "#c83e20",
    },
  },

  sage: {
    label: "Sage",
    light: {
      "--color-background": "#eceee6",
      "--color-surface": "#f8f8f2",
      "--color-surface-alt": "#e2e4da",
      "--color-border": "#c8cabb",
      "--color-border-subtle": "#d5d7cb",
      "--color-text-primary": "#1a1c18",
      "--color-text-secondary": "#3a3d30",
      "--color-text-muted": "#7a7d6e",
      "--color-accent": "#4e6040",
      "--color-accent-hover": "#3c4e30",
      "--color-accent-light": "#e4eade",
      "--color-accent-muted": "#728860",
    },
    dark: {
      "--color-background": "#1c2020",
      "--color-surface": "#262c2a",
      "--color-surface-alt": "#303830",
      "--color-border": "#3e4840",
      "--color-border-subtle": "#333c34",
      "--color-text-primary": "#f0f0e8",
      "--color-text-secondary": "#b0b8a8",
      "--color-text-muted": "#6e786a",
      "--color-accent": "#e8e090",
      "--color-accent-hover": "#f0e8a0",
      "--color-accent-light": "#242400",
      "--color-accent-muted": "#c8c070",
    },
  },

  quintana: {
    label: "Quintana",
    light: {
      "--color-background": "#c6be65",
      "--color-surface": "#d4cc78",
      "--color-surface-alt": "#b8b058",
      "--color-border": "#a09848",
      "--color-border-subtle": "#aaa040",
      "--color-text-primary": "#141115",
      "--color-text-secondary": "#2c2820",
      "--color-text-muted": "#5a5430",
      "--color-accent": "#223f57",
      "--color-accent-hover": "#1a3045",
      "--color-accent-light": "#d8e8f0",
      "--color-accent-muted": "#2e5570",
    },
    dark: {
      "--color-background": "#141115",
      "--color-surface": "#1e1a20",
      "--color-surface-alt": "#28242a",
      "--color-border": "#3a3540",
      "--color-border-subtle": "#302c35",
      "--color-text-primary": "#f0e7d8",
      "--color-text-secondary": "#b8ae9c",
      "--color-text-muted": "#78706a",
      "--color-accent": "#c6be65",
      "--color-accent-hover": "#d4cc78",
      "--color-accent-light": "#202010",
      "--color-accent-muted": "#a8a050",
    },
  },

  earthy: {
    label: "Earthy",
    light: {
      "--color-background": "#ede8da",
      "--color-surface": "#f5f0e6",
      "--color-surface-alt": "#e0d8c6",
      "--color-border": "#c8bea8",
      "--color-border-subtle": "#d8d0bc",
      "--color-text-primary": "#1c1a12",
      "--color-text-secondary": "#4a4030",
      "--color-text-muted": "#8a7a60",
      "--color-accent": "#c07010",
      "--color-accent-hover": "#a05c08",
      "--color-accent-light": "#f5e8c0",
      "--color-accent-muted": "#d88828",
    },
    dark: {
      "--color-background": "#131d17",
      "--color-surface": "#1c2d20",
      "--color-surface-alt": "#243828",
      "--color-border": "#304830",
      "--color-border-subtle": "#283c2a",
      "--color-text-primary": "#f0ebe0",
      "--color-text-secondary": "#b0a890",
      "--color-text-muted": "#6e6050",
      "--color-accent": "#e8a820",
      "--color-accent-hover": "#f0b830",
      "--color-accent-light": "#1e1800",
      "--color-accent-muted": "#c89020",
    },
  },

  graphic: {
    label: "Graphic",
    light: {
      "--color-background": "#f2efe6",
      "--color-surface": "#faf8f3",
      "--color-surface-alt": "#e8e3d8",
      "--color-border": "#ccc7b8",
      "--color-border-subtle": "#ddd8cc",
      "--color-text-primary": "#0e0d0b",
      "--color-text-secondary": "#3a3428",
      "--color-text-muted": "#8a7e6c",
      "--color-accent": "#c4a800",
      "--color-accent-hover": "#a88e00",
      "--color-accent-light": "#f5f0c8",
      "--color-accent-muted": "#d4b820",
    },
    dark: {
      "--color-background": "#0e0e0c",
      "--color-surface": "#191815",
      "--color-surface-alt": "#23221e",
      "--color-border": "#373530",
      "--color-border-subtle": "#2c2b26",
      "--color-text-primary": "#f2efe6",
      "--color-text-secondary": "#b0a898",
      "--color-text-muted": "#6e6558",
      "--color-accent": "#ecd840",
      "--color-accent-hover": "#f5e450",
      "--color-accent-light": "#252100",
      "--color-accent-muted": "#ccba30",
    },
  },

  golden: {
    label: "Golden",
    light: {
      "--color-background": "#f0e8d8",
      "--color-surface": "#faf5eb",
      "--color-surface-alt": "#e8dfc8",
      "--color-border": "#d4c9b0",
      "--color-border-subtle": "#dfd4bc",
      "--color-text-primary": "#1c1408",
      "--color-text-secondary": "#5c4e38",
      "--color-text-muted": "#9c8c72",
      "--color-accent": "#c47c2a",
      "--color-accent-hover": "#a86520",
      "--color-accent-light": "#f5e8d0",
      "--color-accent-muted": "#d8924a",
    },
    dark: {
      "--color-background": "#0f1420",
      "--color-surface": "#1a2035",
      "--color-surface-alt": "#222b42",
      "--color-border": "#2e3a52",
      "--color-border-subtle": "#253045",
      "--color-text-primary": "#f0e8d8",
      "--color-text-secondary": "#b8a898",
      "--color-text-muted": "#7a6e5e",
      "--color-accent": "#e8a84c",
      "--color-accent-hover": "#d49440",
      "--color-accent-light": "#2a2010",
      "--color-accent-muted": "#c89040",
    },
  },
};

// ─── Map styles ───────────────────────────────────────────────────────────────


// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_PINS = [
  { place: { id: "1", name: "Canard", slug: "canard", categories: ["drink"], vetted: true, description: "Natural wine bar", recommendations: [], photos: [], socials: [] }, location: { id: "l1", place_id: "1", address: "734 E Burnside St", lat: 45.5231, lng: -122.6545, notes: null } },
  { place: { id: "2", name: "Tusk", slug: "tusk", categories: ["food"], vetted: true, description: "Veggie-forward restaurant", recommendations: [], photos: [], socials: [] }, location: { id: "l2", place_id: "2", address: "2448 E Burnside St", lat: 45.5198, lng: -122.6378, notes: null } },
  { place: { id: "3", name: "Powell's Books", slug: "powells", categories: ["activity"], vetted: true, description: "The world's largest independent bookstore", recommendations: [], photos: [], socials: [] }, location: { id: "l3", place_id: "3", address: "1005 W Burnside St", lat: 45.5231, lng: -122.6815, notes: null } },
  { place: { id: "4", name: "Bullard", slug: "bullard", categories: ["food", "drink"], vetted: false, description: "Texas-style BBQ", recommendations: [], photos: [], socials: [] }, location: { id: "l4", place_id: "4", address: "813 SW Alder St", lat: 45.5189, lng: -122.6784, notes: null } },
];

const CATEGORY_HEX: Record<string, string> = {
  food: "#e07040",
  drink: "#7c4fc4",
  activity: "#2d9e4a",
};

function categoryDotStyle(categories: string[]): React.CSSProperties {
  const cats = categories.filter(Boolean);
  if (cats.length >= 2) {
    const c1 = CATEGORY_HEX[cats[0]] ?? "#9ca3af";
    const c2 = CATEGORY_HEX[cats[1]] ?? "#9ca3af";
    return { background: `linear-gradient(135deg, ${c1} 50%, ${c2} 50%)` };
  }
  return { background: CATEGORY_HEX[cats[0]] ?? "#9ca3af" };
}

// ─── Demo ─────────────────────────────────────────────────────────────────────

export function DemoClient({ cityName, coverPhoto }: { cityName: string; coverPhoto: string | null }) {
  const [activePalette, setActivePalette] = useState("current");
  const [isDark, setIsDark] = useState(false);

  const palette = PALETTES[activePalette] ?? PALETTES.current;
  const vars = isDark ? palette.dark : palette.light;

  return (
    <div style={vars as React.CSSProperties} className="min-h-screen bg-[var(--color-background)]">
      {/* Switcher bar */}
      <div className="sticky top-0 z-50 flex items-center gap-2 px-4 py-2 bg-black/80 backdrop-blur-sm border-b border-white/10 overflow-x-auto">
        <span className="text-white/50 text-xs shrink-0">Palette:</span>
        {Object.entries(PALETTES).map(([key, { label }]) => (
          <button
            key={key}
            onClick={() => setActivePalette(key)}
            className={`shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors ${
              activePalette === key
                ? "bg-white text-black border-white"
                : "border-white/30 text-white/70 hover:border-white/60 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}

        <div className="ml-auto shrink-0 flex items-center gap-1 border border-white/20 rounded-full p-0.5">
          <button
            onClick={() => setIsDark(false)}
            className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full transition-colors ${
              !isDark ? "bg-white text-black" : "text-white/60 hover:text-white"
            }`}
          >
            <Sun size={11} /> Light
          </button>
          <button
            onClick={() => setIsDark(true)}
            className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full transition-colors ${
              isDark ? "bg-white text-black" : "text-white/60 hover:text-white"
            }`}
          >
            <Moon size={11} /> Dark
          </button>
        </div>
      </div>

      {/* ── City header ── */}
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)] relative overflow-hidden">
        {coverPhoto ? (
          <div className="absolute inset-0" aria-hidden="true">
            <img src={coverPhoto} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/55" />
          </div>
        ) : (
          <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-hover) 100%)", opacity: 0.85 }} aria-hidden="true" />
        )}
        <div className="relative z-10 flex items-center justify-between gap-3 px-4 py-3">
          <button className="inline-flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full border border-white/25 bg-black/25 text-white backdrop-blur-sm">
            ← All cities
          </button>
          <h1 className="text-lg font-semibold text-white [font-family:var(--font-display)]" style={{ textShadow: "0 1px 4px rgba(0,0,0,0.5)" }}>
            {cityName}
          </h1>
        </div>
      </header>

      {/* ── Filter bar ── */}
      <div className="border-b border-[var(--color-border-subtle)] bg-[var(--color-surface)] px-4 py-2">
        <div className="flex items-center gap-2 overflow-x-auto">
          {["food", "drink", "activity"].map((cat, i) => (
            <button
              key={cat}
              className={`shrink-0 flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border capitalize transition-colors ${
                i === 0
                  ? "bg-[var(--color-surface-alt)] text-[var(--color-text-primary)] border-[var(--color-border)] font-medium"
                  : "border-[var(--color-border)] text-[var(--color-text-secondary)]"
              }`}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_HEX[cat], opacity: i === 0 ? 1 : 0.45 }} />
              {cat}
            </button>
          ))}
          <label className="ml-auto shrink-0 flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" defaultChecked className="w-3.5 h-3.5 rounded accent-[var(--color-accent)]" />
            <span className="text-xs text-[var(--color-text-muted)]">Vetted only</span>
          </label>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="flex h-[calc(100vh-130px)]">
        {/* List panel */}
        <div className="w-72 shrink-0 overflow-y-auto p-3 border-r border-[var(--color-border)]">
          {/* Count / location / sort */}
          <div className="flex items-center gap-2 mb-2">
            <p className="text-xs text-[var(--color-text-muted)] shrink-0">4 places</p>
            <button className="flex-1 flex items-center justify-center gap-0.5 text-xs text-[var(--color-accent)]">
              Edit location <ChevronDown size={10} className="shrink-0" />
            </button>
            <div className="shrink-0 relative flex items-center">
              <select className="appearance-none text-xs text-[var(--color-text-muted)] bg-transparent border-none outline-none pr-3">
                <option>Distance</option>
                <option>A–Z</option>
              </select>
              <ChevronDown size={10} className="absolute right-0 pointer-events-none text-[var(--color-text-muted)]" />
            </div>
          </div>

          {/* Place cards */}
          <div className="flex flex-col gap-1.5">
            {MOCK_PINS.map(({ place, location }, i) => (
              <button
                key={place.id}
                className={`w-full text-left flex items-start gap-3 px-3 py-3 rounded-[var(--radius-md)] border transition-all ${
                  i === 1
                    ? "border-[var(--color-accent)] bg-[var(--color-surface)]"
                    : "border-transparent bg-[var(--color-surface)]"
                }`}
              >
                <div className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={categoryDotStyle(place.categories)} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-medium text-[var(--color-text-primary)] leading-snug">{place.name}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs text-[var(--color-text-muted)]">0.4 mi</span>
                      {place.vetted && <Check size={13} className="text-emerald-500" />}
                    </div>
                  </div>
                  <p className="mt-0.5 text-xs text-[var(--color-text-secondary)] leading-relaxed">{place.description}</p>
                </div>
              </button>
            ))}
          </div>

          {/* UI elements */}
          <div className="mt-6 flex flex-col gap-3">
            <p className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide">Buttons</p>
            <button className="flex items-center justify-center gap-1.5 w-full py-2 rounded-[var(--radius-md)] bg-[var(--color-accent)] text-white text-sm font-medium">
              <ArrowRight size={13} /> Primary action
            </button>
            <button className="flex items-center justify-center gap-1.5 w-full py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] text-sm text-[var(--color-text-secondary)] bg-[var(--color-surface)]">
              <LocateFixed size={13} /> Secondary action
            </button>
            <button className="flex items-center justify-center gap-2 w-full py-3 rounded-full bg-[var(--color-accent)] text-white text-sm font-medium shadow-lg">
              <Map size={15} /> Floating Map button
            </button>

            <p className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide mt-2">Badges</p>
            <div className="flex flex-wrap gap-1.5">
              {["Ramen", "Natural wine", "Kid-friendly"].map((r) => (
                <span key={r} className="text-xs px-2.5 py-1 bg-[var(--color-accent-light)] text-[var(--color-accent)] rounded-full">{r}</span>
              ))}
            </div>

            <p className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide mt-2">Search</p>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none" />
              <input
                type="search"
                placeholder="Search cities…"
                defaultValue="Port"
                className="w-full text-sm pl-9 pr-4 py-2.5 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none focus:border-[var(--color-accent)] transition-colors"
              />
            </div>

            <p className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wide mt-2">Color swatches</p>
            <div className="grid grid-cols-4 gap-2">
              {[
                ["Bg", "var(--color-background)"],
                ["Surface", "var(--color-surface)"],
                ["Alt", "var(--color-surface-alt)"],
                ["Border", "var(--color-border)"],
                ["Accent", "var(--color-accent)"],
                ["Accent lt", "var(--color-accent-light)"],
                ["Text", "var(--color-text-primary)"],
                ["Muted", "var(--color-text-muted)"],
              ].map(([name, color]) => (
                <div key={name} className="flex flex-col gap-1">
                  <div className="h-8 rounded-[var(--radius-md)] border border-[var(--color-border)]" style={{ background: color }} />
                  <p className="text-[10px] text-[var(--color-text-muted)] leading-tight">{name}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          <CityMap
            key={isDark ? "dark" : "light"}
            pins={MOCK_PINS as any}
            selectedPlaceId="2"
            focusedLocationId={null}
            userLocation={null}
            selectedPinColor={vars["--color-accent"] as string}
            darkMap={isDark}
          />
        </div>
      </div>
    </div>
  );
}
