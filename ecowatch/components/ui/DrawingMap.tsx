"use client";

import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, FeatureGroup, Popup, Polygon } from "react-leaflet";
import { EditControl } from "react-leaflet-draw";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import "leaflet-draw"; // Ensure L.Draw is attached to L
import L from "leaflet";
import { Zone, ZoneBBox, ZoneCoordinates } from "@/types/zone.types";
import { SquareSquare } from "lucide-react";
import { toast } from "sonner";

interface DrawingMapProps {
  zones: Zone[];
  onZoneDrawn: (bbox: ZoneBBox, center: ZoneCoordinates) => void;
  selectedZone: Zone | null;
}

// Fix Leaflet icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Force Leaflet Draw tooltip to show km² instead of ha/m²
if (typeof window !== "undefined") {
  // @ts-ignore
  if (L.GeometryUtil && L.GeometryUtil.readableArea) {
    // @ts-ignore
    L.GeometryUtil.readableArea = function (area: number, isMetric: boolean) {
      if (isMetric) {
        const areaSqKm = area / 1000000;
        return areaSqKm.toFixed(2) + ' km²';
      }
      return area.toFixed(2) + ' sq yd';
    };
  }
}

export default function DrawingMap({ zones, onZoneDrawn, selectedZone }: DrawingMapProps) {
  const mapRef = useRef<L.Map>(null!);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fly to selected zone
  useEffect(() => {
    if (selectedZone && mapRef.current) {
      mapRef.current.flyTo(
        [selectedZone.coordinates.lat, selectedZone.coordinates.lng], 
        12, 
        { duration: 1.5 }
      );
    }
  }, [selectedZone]);

  const onCreated = (e: any) => {
    const layer = e.layer;
    const bounds = layer.getBounds();
    
    // Calculate approximate area in sq km
    const nw = bounds.getNorthWest();
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    const areaSqKm = (nw.distanceTo(ne) * nw.distanceTo(sw)) / 1000000;

    if (areaSqKm > 100) {
      toast.error(`Zone Area Too Large: ${areaSqKm.toFixed(0)} km²`, {
        description: "Please restrict monitoring zones to under 100 km² for optimal ML processing.",
      });
      if (layer._map) {
        layer._map.removeLayer(layer);
      }
      return;
    }
    
    const bbox: ZoneBBox = {
      lat_min: bounds.getSouth(),
      lat_max: bounds.getNorth(),
      lng_min: bounds.getWest(),
      lng_max: bounds.getEast(),
    };
    
    const center = bounds.getCenter();
    const coords: ZoneCoordinates = { lat: center.lat, lng: center.lng };
    
    onZoneDrawn(bbox, coords);
    
    // Keep the layer on the map so the user can see what they drew
    // if (layer._map) {
    //    layer._map.removeLayer(layer);
    // }
  };

  const startDrawing = () => {
    if (mapRef.current) {
      // @ts-ignore - L.Draw is added by leaflet-draw
      const rectangle = new L.Draw.Rectangle(mapRef.current, {
        shapeOptions: {
          color: "#06b6d4",
          weight: 2,
        },
        metric: true
      });
      rectangle.enable();
    }
  };

  if (!mounted) return null;

  return (
    <div className="w-full h-full relative z-0">
      <MapContainer
        center={[20, 0]}
        zoom={3}
        style={{ height: "100%", width: "100%", background: "#020617" }}
        zoomControl={false}
        ref={mapRef}
      >
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community"
        />

        <FeatureGroup>
          {/* We use EditControl to register the onCreated listener but we hide its toolbar */}
          <div className="hidden">
            <EditControl
              position="topleft"
              onCreated={onCreated}
              draw={{
                rectangle: true,
                polygon: false,
                circle: false,
                circlemarker: false,
                marker: false,
                polyline: false,
              }}
              edit={{ edit: false, remove: false }}
            />
          </div>
        </FeatureGroup>

        {/* Render existing zones as polygons based on bbox */}
        {zones.map((zone) => {
          // Convert BBox back to Polygon coordinates
          const bounds: L.LatLngTuple[] = [
            [zone.bbox.lat_max, zone.bbox.lng_min], // Top Left
            [zone.bbox.lat_max, zone.bbox.lng_max], // Top Right
            [zone.bbox.lat_min, zone.bbox.lng_max], // Bottom Right
            [zone.bbox.lat_min, zone.bbox.lng_min], // Bottom Left
          ];
          
          const isSelected = selectedZone?._id === zone._id;

          return (
            <Polygon 
              key={zone._id} 
              positions={bounds} 
              pathOptions={{ 
                color: isSelected ? "#ef4444" : "#10b981", 
                fillColor: isSelected ? "#ef4444" : "#10b981",
                fillOpacity: isSelected ? 0.4 : 0.1,
                weight: isSelected ? 3 : 1
              }}
            >
              <Popup className="custom-popup">
                <div className="flex flex-col gap-1 p-1">
                  <span className="text-[10px] uppercase font-mono tracking-widest text-emerald-500">Protected Zone</span>
                  <strong className="text-zinc-800">{zone.name}</strong>
                  <span className="text-xs text-zinc-500">{zone.area_km2.toFixed(2)} km²</span>
                </div>
              </Popup>
            </Polygon>
          );
        })}
      </MapContainer>

      {/* Custom High-Tech Draw Button (OUTSIDE MapContainer so it renders properly) */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[1000] pointer-events-auto">
        <button 
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); startDrawing(); }}
          className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-black px-6 py-3 rounded-full shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all font-mono text-sm uppercase font-bold tracking-widest"
        >
          <SquareSquare size={18} />
          Draw New Zone
        </button>
      </div>
    </div>
  );
}
