"use client";

import { GoogleMap, useJsApiLoader, InfoWindow } from "@react-google-maps/api";
import { createPortal } from "react-dom";
import { useState, useCallback, useEffect, useRef } from "react";
import type { Place, PlaceLocation } from "@/lib/types";
import { CATEGORY_COLORS, CATEGORY_COLOR_DEFAULT } from "@/lib/categoryColors";

interface MapPin {
  place: Place;
  location: PlaceLocation;
}

interface CityMapProps {
  pins: MapPin[];
  selectedPlaceId?: string | null;
  focusedLocationId?: string | null;
  userLocation?: { lat: number; lng: number } | null;
  onPinClick?: (placeId: string, locationId: string) => void;
  onMapClick?: () => void;
  resetToken?: number;
  resizeToken?: number;
  selectedPinColor?: string;
  darkMap?: boolean;
}

const mapContainerStyle = { width: "100%", height: "100%" };
// Stable reference — library uses reference equality to decide whether to call map.setCenter()
const INITIAL_CENTER = { lat: 34.0195, lng: -118.4912 };
// Tap target and visual pin sizes — larger on touch devices for accuracy
const HIT_TOUCH = 38;
const HIT_POINTER = 28;
const PIN_SEL_TOUCH = 18;
const PIN_SEL_POINTER = 14;
const PIN_UNSEL_TOUCH = 12;
const PIN_UNSEL_POINTER = 9;

const LIGHT_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "transit", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "road.highway", elementType: "labels", stylers: [{ visibility: "off" }] },
];

const DARK_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#212121" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#212121" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#bdbdbd" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#1c1c1c" }] },
  { featureType: "road", elementType: "geometry.fill", stylers: [{ color: "#2c2c2c" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#8a8a8a" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#373737" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#484848" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#212121" }] },
  { featureType: "road.highway", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "road.local", elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#515c6d" }] },
];

const BASE_MAP_OPTIONS = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
};

function pinFill(categories: string[], isSelected: boolean, selectedColor = "#2d6a64"): string {
  if (isSelected) return selectedColor;
  const cats = categories.filter(Boolean);
  if (cats.length >= 2) {
    const c1 = CATEGORY_COLORS[cats[0]] ?? CATEGORY_COLOR_DEFAULT;
    const c2 = CATEGORY_COLORS[cats[1]] ?? CATEGORY_COLOR_DEFAULT;
    return `linear-gradient(135deg, ${c1} 50%, ${c2} 50%)`;
  }
  return CATEGORY_COLORS[cats[0]] ?? CATEGORY_COLOR_DEFAULT;
}

function fitAll(map: google.maps.Map, pins: MapPin[]) {
  if (pins.length === 0) return;
  if (pins.length === 1) {
    map.setCenter({ lat: pins[0].location.lat, lng: pins[0].location.lng });
    map.setZoom(14);
    return;
  }
  const bounds = new google.maps.LatLngBounds();
  pins.forEach(({ location }) => bounds.extend({ lat: location.lat, lng: location.lng }));
  map.fitBounds(bounds, 48);
}

/**
 * TransformOverlay — wraps a raw google.maps.OverlayView but positions via
 * transform: translate(x, y) instead of left/top. Transforms run on the
 * compositor thread and stay in sync with tile movement during pan, preventing
 * the one-frame lag that causes pins to flash to wrong intermediate positions.
 */
function TransformOverlay({
  map,
  lat,
  lng,
  offsetX = 0,
  offsetY = 0,
  children,
}: {
  map: google.maps.Map;
  lat: number;
  lng: number;
  offsetX?: number;
  offsetY?: number;
  children: React.ReactNode;
}) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const overlayRef = useRef<google.maps.OverlayView | null>(null);
  const posRef = useRef({ lat, lng, offsetX, offsetY });
  posRef.current = { lat, lng, offsetX, offsetY };

  useEffect(() => {
    const div = document.createElement("div");
    div.style.position = "absolute";
    div.style.left = "0";
    div.style.top = "0";
    div.style.willChange = "transform";

    const overlay = new google.maps.OverlayView();

    overlay.onAdd = function () {
      this.getPanes()!.overlayMouseTarget.appendChild(div);
      setContainer(div);
    };

    overlay.draw = function () {
      const proj = this.getProjection();
      if (!proj) return;
      const { lat: la, lng: ln, offsetX: ox, offsetY: oy } = posRef.current;
      const pos = proj.fromLatLngToDivPixel(new google.maps.LatLng(la, ln));
      if (pos) {
        div.style.transform = `translate(${pos.x + ox}px, ${pos.y + oy}px)`;
      }
    };

    overlay.onRemove = function () {
      div.remove();
      setContainer(null);
    };

    overlay.setMap(map);
    overlayRef.current = overlay;

    return () => {
      overlay.setMap(null);
      overlayRef.current = null;
    };
  }, [map]); // eslint-disable-line react-hooks/exhaustive-deps

  // Redraw when position changes
  useEffect(() => {
    overlayRef.current?.draw();
  }, [lat, lng]);

  if (!container) return null;
  return createPortal(children, container);
}

export function CityMap({ pins, selectedPlaceId, focusedLocationId, userLocation, onPinClick, onMapClick, resetToken, resizeToken, selectedPinColor, darkMap }: CityMapProps) {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [cssAccentColor, setCssAccentColor] = useState("#7091a8");
  const [systemDark, setSystemDark] = useState(false);
  const [isTouch, setIsTouch] = useState(true); // default true until we detect otherwise

  useEffect(() => {
    const val = getComputedStyle(document.documentElement).getPropertyValue("--color-accent").trim();
    if (val) setCssAccentColor(val);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemDark(mq.matches);
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    // Use pointer media query: "fine" = mouse, "coarse" = touch/finger
    setIsTouch(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  const [isPanning, setIsPanning] = useState(false);
  const mapRef = useRef<google.maps.Map | null>(null);
  const pinsRef = useRef(pins);
  pinsRef.current = pins;
  const focusedLocationIdRef = useRef(focusedLocationId);
  focusedLocationIdRef.current = focusedLocationId;
  // Prevents map onClick from firing when a pin was just tapped
  const pinJustClickedRef = useRef(false);
  const idleListenerRef = useRef<google.maps.MapsEventListener | null>(null);

  const isDark = darkMap ?? systemDark;
  const mapOptions = { ...BASE_MAP_OPTIONS, styles: isDark ? DARK_MAP_STYLES : LIGHT_MAP_STYLES };

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
  });

  const onLoad = useCallback((m: google.maps.Map) => {
    mapRef.current = m;
    setMap(m);
  }, []);
  const onUnmount = useCallback(() => {
    mapRef.current = null;
    setMap(null);
  }, []);

  // On load: zoom to focused location if set, otherwise fit all pins
  useEffect(() => {
    if (!map) return;
    const fid = focusedLocationIdRef.current;
    if (fid) {
      const pin = pinsRef.current.find((p) => p.location.id === fid);
      if (pin) { map.setCenter({ lat: pin.location.lat, lng: pin.location.lng }); map.setZoom(15); }
    } else {
      fitAll(map, pinsRef.current);
    }
  }, [map]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fit all pins when resetToken is incremented
  useEffect(() => {
    const m = mapRef.current;
    if (!m || resetToken === undefined) return;
    fitAll(m, pinsRef.current);
  }, [resetToken]);

  // Re-sync overlay positions after container resize
  useEffect(() => {
    const m = mapRef.current;
    if (!m || resizeToken === undefined) return;
    google.maps.event.trigger(m, "resize");
    const fid = focusedLocationIdRef.current;
    if (fid) {
      const pin = pinsRef.current.find((p) => p.location.id === fid);
      if (pin) m.setCenter({ lat: pin.location.lat, lng: pin.location.lng });
    } else {
      fitAll(m, pinsRef.current);
    }
  }, [resizeToken]);

  // Pan to focused location; briefly hide non-focused pins to avoid OverlayView jump during panTo animation
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !focusedLocationId) return;
    const pin = pinsRef.current.find((p) => p.location.id === focusedLocationId);
    if (!pin) return;
    if (idleListenerRef.current) google.maps.event.removeListener(idleListenerRef.current);
    setIsPanning(true);
    m.panTo({ lat: pin.location.lat, lng: pin.location.lng });
    if ((m.getZoom() ?? 0) < 15) m.setZoom(15);
    idleListenerRef.current = google.maps.event.addListenerOnce(m, "idle", () => {
      setIsPanning(false);
      idleListenerRef.current = null;
    });
  }, [focusedLocationId]);

  if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
    return (
      <div className="w-full h-full bg-[var(--color-surface-alt)] flex items-center justify-center text-[var(--color-text-muted)] text-sm">
        Map unavailable — add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="w-full h-full bg-[var(--color-surface-alt)] flex items-center justify-center text-[var(--color-text-muted)] text-sm">
        Loading map…
      </div>
    );
  }

  const focusedPin = focusedLocationId
    ? pins.find(({ location }) => location.id === focusedLocationId)
    : null;

  return (
    <GoogleMap
      key={isDark ? "dark" : "light"}
      mapContainerStyle={mapContainerStyle}
      center={INITIAL_CENTER}
      zoom={10}
      options={mapOptions}
      onLoad={onLoad}
      onUnmount={onUnmount}
      onClick={() => { if (!pinJustClickedRef.current) onMapClick?.(); }}
    >
      {map && pins.map(({ place, location }) => {
        const isSelected = selectedPlaceId === place.id;
        const isFocused = focusedLocationId === location.id;
        const HIT = isTouch ? HIT_TOUCH : HIT_POINTER;
        const size = isSelected
          ? (isTouch ? PIN_SEL_TOUCH : PIN_SEL_POINTER)
          : (isTouch ? PIN_UNSEL_TOUCH : PIN_UNSEL_POINTER);
        const hidden = isPanning && !isFocused;
        return (
          <TransformOverlay
            key={location.id}
            map={map}
            lat={location.lat}
            lng={location.lng}
            offsetX={-HIT / 2}
            offsetY={-HIT / 2}
          >
            <div
              onTouchStart={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                pinJustClickedRef.current = true;
                setTimeout(() => { pinJustClickedRef.current = false; }, 300);
                onPinClick?.(place.id, location.id);
              }}
              title={place.name}
              style={{
                width: HIT,
                height: HIT,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                position: "relative",
                zIndex: isSelected ? 10 : 1,
                opacity: hidden ? 0 : 1,
                transition: hidden ? "none" : "opacity 0.15s ease",
                pointerEvents: hidden ? "none" : "auto",
              }}
            >
              <div
                style={{
                  width: size,
                  height: size,
                  borderRadius: "50%",
                  background: pinFill(place.categories ?? [], isSelected, selectedPinColor ?? cssAccentColor),
                  border: "2.5px solid white",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
                }}
              />
            </div>
          </TransformOverlay>
        );
      })}

      {map && userLocation && (
        <TransformOverlay
          map={map}
          lat={userLocation.lat}
          lng={userLocation.lng}
          offsetX={-12}
          offsetY={-12}
        >
          <div style={{ width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
            <div className="animate-ping" style={{ position: "absolute", width: 20, height: 20, borderRadius: "50%", background: "rgba(66,133,244,0.35)" }} />
            <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#4285F4", border: "2.5px solid white", boxShadow: "0 1px 5px rgba(0,0,0,0.35)", position: "relative" }} />
          </div>
        </TransformOverlay>
      )}

      {focusedPin && (
        <InfoWindow
          position={{ lat: focusedPin.location.lat, lng: focusedPin.location.lng }}
          options={{ disableAutoPan: true, pixelOffset: new google.maps.Size(0, -18) }}
          onCloseClick={() => onPinClick?.(focusedPin.place.id, focusedPin.location.id)}
        >
          <div style={{ padding: "6px 8px" }}>
            <p style={{ fontWeight: 600, fontSize: 13, margin: 0, whiteSpace: "nowrap", color: "var(--color-text-primary)" }}>
              {focusedPin.place.name}
            </p>
            {focusedPin.place.description && (
              <p style={{ fontSize: 11, color: "var(--color-text-secondary)", margin: "3px 0 0", maxWidth: 200 }}>
                {focusedPin.place.description.slice(0, 80)}
                {focusedPin.place.description.length > 80 ? "…" : ""}
              </p>
            )}
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  );
}
