"use client";

import { useCallback, useRef } from "react";
import { GoogleMap, useJsApiLoader, Marker } from "@react-google-maps/api";
import type { Restaurant } from "@/lib/types";

const CENTER = { lat: 38.95, lng: -77.1 };

const MAP_STYLE = [
  { featureType: "poi",        stylers: [{ visibility: "off" }] },
  { featureType: "poi.park",   stylers: [{ visibility: "simplified" }] },
  { featureType: "transit",    stylers: [{ visibility: "off" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "road.arterial", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "road.highway",  elementType: "labels", stylers: [{ visibility: "simplified" }] },
  { featureType: "water",     elementType: "geometry", stylers: [{ color: "#d4e6f1" }] },
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#f5f5f0" }] },
];

interface Props {
  restaurants: Restaurant[];
  selected?: string | null;
  onSelect: (placeId: string) => void;
}

function markerIcon(selected: boolean, score: number) {
  const high  = score >= 60;
  const color = selected ? "#1c1c1e" : high ? "#f97316" : "#fb923c";
  const size  = selected ? 42 : 34;
  const r     = size / 2 - 2;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="${color}" stroke="white" stroke-width="2.5"/>
    <text x="${size / 2}" y="${size / 2 + 5}" text-anchor="middle" font-size="14" font-family="system-ui,sans-serif">🍛</text>
  </svg>`;

  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new window.google.maps.Size(size, size),
    anchor:     new window.google.maps.Point(size / 2, size / 2),
  };
}

export function RestaurantMap({ restaurants, selected, onSelect }: Props) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "",
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const onLoad = useCallback((map: google.maps.Map) => { mapRef.current = map; }, []);

  if (loadError) {
    return (
      <div className="map-container flex items-center justify-center bg-[#f5f5f0]">
        <div className="text-center px-6">
          <p className="text-2xl mb-2">🗺️</p>
          <p className="font-semibold text-sm text-gray-700">Map unavailable</p>
          <p className="text-xs text-gray-400 mt-1">
            Enable <strong>Maps JavaScript API</strong> in Google Cloud Console
          </p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="map-container flex items-center justify-center bg-[#f5f5f0]">
        <div className="text-2xl animate-pulse">🗺️</div>
      </div>
    );
  }

  return (
    <div className="map-container">
      <GoogleMap
        mapContainerStyle={{ width: "100%", height: "100%" }}
        center={CENTER}
        zoom={10}
        onLoad={onLoad}
        options={{
          styles: MAP_STYLE,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: "greedy",
          clickableIcons: false,
        }}
      >
        {restaurants.map(r =>
          r.lat && r.lng ? (
            <Marker
              key={r.place_id}
              position={{ lat: r.lat, lng: r.lng }}
              icon={markerIcon(selected === r.place_id, r.buffet_score)}
              onClick={() => {
                onSelect(r.place_id);
                mapRef.current?.panTo({ lat: r.lat, lng: r.lng });
              }}
              zIndex={selected === r.place_id ? 10 : 1}
            />
          ) : null
        )}
      </GoogleMap>
    </div>
  );
}
