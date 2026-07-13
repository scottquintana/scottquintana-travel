"use client";

import { GoogleMap, useJsApiLoader, OverlayView, InfoWindow } from "@react-google-maps/api";
import { useState, useCallback, useEffect, useRef } from "react";
import type { Place, PlaceLocation } from "@/lib/types";

interface MapPin {
  place: Place;
  location: PlaceLocation;
}

interface CityMapProps {
  pins: MapPin[];
  /** Highlighted pin (hover or click) — controls color/size only */
  selectedPlaceId?: string | null;
  /** Explicitly focused location (click only) — triggers pan + InfoWindow */
  focusedLocationId?: string | null;
  userLocation?: { lat: number; lng: number } | null;
  onPinClick?: (placeId: string, locationId: string) => void;
  onMapClick?: () => void;
}

const mapContainerStyle = { width: "100%", height: "100%" };
// Stable reference — @react-google-maps/api compares center by reference (===)
// and calls map.setCenter() on every render if it's a new object literal.
const INITIAL_CENTER = { lat: 34.0195, lng: -118.4912 };

const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
  styles: [
    { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
    { featureType: "transit", elementType: "labels", stylers: [{ visibility: "off" }] },
  ],
};

const CATEGORY_COLORS: Record<string, string> = {
  food: "#e07040",
  drink: "#7c4fc4",
  activity: "#2d9e4a",
};

function pinFill(category: string, isSelected: boolean): string {
  if (isSelected) return "#2d6a64";
  return CATEGORY_COLORS[category] ?? "#6b7280";
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

export function CityMap({ pins, selectedPlaceId, focusedLocationId, userLocation, onPinClick, onMapClick }: CityMapProps) {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  // Refs so focus/pan effects always see fresh values without extra re-runs
  const mapRef = useRef<google.maps.Map | null>(null);
  const pinsRef = useRef(pins);
  pinsRef.current = pins;
  const focusedLocationIdRef = useRef(focusedLocationId);
  focusedLocationIdRef.current = focusedLocationId;
  // Prevents map onClick from firing when a pin was just tapped
  const pinJustClickedRef = useRef(false);

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

  // On load: zoom to focused location if one is already set, otherwise fit all pins.
  // Uses setCenter/setZoom (instant, no animation) to avoid OverlayView misalignment
  // during animated pan on first render.
  useEffect(() => {
    if (!map) return;
    const fid = focusedLocationIdRef.current;
    if (fid) {
      const pin = pinsRef.current.find((p) => p.location.id === fid);
      if (pin) {
        map.setCenter({ lat: pin.location.lat, lng: pin.location.lng });
        map.setZoom(15);
      }
    } else {
      fitAll(map, pinsRef.current);
    }
  }, [map]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pan to focused location on selection; do nothing on deselect (keep current view)
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !focusedLocationId) return;
    const pin = pinsRef.current.find((p) => p.location.id === focusedLocationId);
    if (pin) {
      m.panTo({ lat: pin.location.lat, lng: pin.location.lng });
      if ((m.getZoom() ?? 0) < 15) m.setZoom(15);
    }
  }, [focusedLocationId]); // intentionally excludes map/pins — using refs

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
      mapContainerStyle={mapContainerStyle}
      center={INITIAL_CENTER}
      zoom={10}
      options={mapOptions}
      onLoad={onLoad}
      onUnmount={onUnmount}
      onClick={() => { if (!pinJustClickedRef.current) onMapClick?.(); }}
    >
      {pins.map(({ place, location }) => {
        const isSelected = selectedPlaceId === place.id;
        const size = isSelected ? 20 : 14;
        const HIT = 44;
        return (
          <OverlayView
            key={location.id}
            position={{ lat: location.lat, lng: location.lng }}
            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
            getPixelPositionOffset={() => ({ x: -HIT / 2, y: -HIT / 2 })}
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
              }}
            >
              <div
                style={{
                  width: size,
                  height: size,
                  borderRadius: "50%",
                  background: pinFill(place.category, isSelected),
                  border: "2.5px solid white",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
                }}
              />
            </div>
          </OverlayView>
        );
      })}

      {userLocation && (
        <OverlayView
          position={{ lat: userLocation.lat, lng: userLocation.lng }}
          mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
          getPixelPositionOffset={() => ({ x: -12, y: -12 })}
        >
          <div style={{ width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
            <div className="animate-ping" style={{ position: "absolute", width: 20, height: 20, borderRadius: "50%", background: "rgba(66,133,244,0.35)" }} />
            <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#4285F4", border: "2.5px solid white", boxShadow: "0 1px 5px rgba(0,0,0,0.35)", position: "relative" }} />
          </div>
        </OverlayView>
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
