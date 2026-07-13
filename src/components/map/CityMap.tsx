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
  /** Explicitly focused pin (click only) — triggers pan + InfoWindow */
  focusedPlaceId?: string | null;
  onPinClick?: (placeId: string) => void;
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

export function CityMap({ pins, selectedPlaceId, focusedPlaceId, onPinClick, onMapClick }: CityMapProps) {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  // Refs so focus/pan effects always see fresh values without extra re-runs
  const mapRef = useRef<google.maps.Map | null>(null);
  const pinsRef = useRef(pins);
  pinsRef.current = pins;

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

  // Fit all pins once when the map first loads
  useEffect(() => {
    if (!map) return;
    fitAll(map, pinsRef.current);
  }, [map]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pan to focused pin; fitBounds when focus is cleared
  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;
    if (focusedPlaceId) {
      const pin = pinsRef.current.find((p) => p.place.id === focusedPlaceId);
      if (pin) m.panTo({ lat: pin.location.lat, lng: pin.location.lng });
    } else {
      fitAll(m, pinsRef.current);
    }
  }, [focusedPlaceId]); // intentionally excludes map/pins — using refs

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

  const focusedPin = focusedPlaceId
    ? pins.find(({ place }) => place.id === focusedPlaceId)
    : null;

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={INITIAL_CENTER}
      zoom={10}
      options={mapOptions}
      onLoad={onLoad}
      onUnmount={onUnmount}
      onClick={onMapClick}
    >
      {pins.map(({ place, location }) => {
        const isSelected = selectedPlaceId === place.id;
        const size = isSelected ? 20 : 14;
        return (
          <OverlayView
            key={location.id}
            position={{ lat: location.lat, lng: location.lng }}
            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
            getPixelPositionOffset={() => ({ x: -size / 2, y: -size / 2 })}
          >
            <div
              onClick={(e) => { e.stopPropagation(); onPinClick?.(place.id); }}
              title={place.name}
              style={{
                width: size,
                height: size,
                borderRadius: "50%",
                background: pinFill(place.category, isSelected),
                border: "2.5px solid white",
                boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
                cursor: "pointer",
                position: "relative",
                zIndex: isSelected ? 10 : 1,
              }}
            />
          </OverlayView>
        );
      })}

      {focusedPin && (
        <InfoWindow
          position={{ lat: focusedPin.location.lat, lng: focusedPin.location.lng }}
          options={{ disableAutoPan: true, pixelOffset: new google.maps.Size(0, -18) }}
          onCloseClick={() => onPinClick?.(focusedPin.place.id)}
        >
          <div style={{ padding: "6px 8px" }}>
            <p style={{ fontWeight: 600, fontSize: 13, margin: 0, whiteSpace: "nowrap" }}>
              {focusedPin.place.name}
            </p>
            {focusedPin.place.description && (
              <p style={{ fontSize: 11, color: "#666", margin: "3px 0 0", maxWidth: 200 }}>
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
