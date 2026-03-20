"use client";

import { useEffect, useRef, useState } from "react";
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';

// Global helper to update map view
function MapUpdater({ coordinates, zoom }: { coordinates: [number, number], zoom: number }) {
    const map = useMap();
    useEffect(() => {
        if (coordinates[0] !== 0 && coordinates[1] !== 0) {
            map.flyTo(coordinates, zoom, { duration: 2.5, easeLinearity: 0.25 });
        }
    }, [coordinates, zoom, map]);
    return null;
}

interface VisualMapProps {
    destination: string;
}

export function VisualMap({ destination }: VisualMapProps) {
    const [coords, setCoords] = useState<[number, number]>([20.5937, 78.9629]); // Default India
    const [zoom, setZoom] = useState(4);
    const [markers, setMarkers] = useState<{name: string, pos: [number, number]}[]>([]);

    useEffect(() => {
        if (!destination || destination === "Destination" || destination === "Unknown") return;

        // Extremely basic mock geocoding for demonstration purposes since we don't have a Maps API Key enabled
        const mockGeocode: Record<string, [number, number]> = {
            "goa": [15.2993, 74.1240],
            "mumbai": [19.0760, 72.8777],
            "delhi": [28.7041, 77.1025],
            "paris": [48.8566, 2.3522],
            "london": [51.5074, -0.1278],
            "tokyo": [35.6762, 139.6503],
            "new york": [40.7128, -74.0060],
            "rome": [41.9028, 12.4964]
        };

        const key = destination.toLowerCase().trim();
        if (mockGeocode[key]) {
            setCoords(mockGeocode[key]);
            setZoom(10);
            setMarkers([{ name: destination, pos: mockGeocode[key] }]);
        }
    }, [destination]);

    // We must ensure this only renders on the client
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
        
        // Fix Leaflet's default icon missing issue
        if (typeof window !== "undefined") {
            const L = require('leaflet');
            delete L.Icon.Default.prototype._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
                iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
            });
        }
    }, []);

    if (!mounted) return null;

    return (
        <div className="fixed inset-0 z-[-1] opacity-40 mix-blend-luminosity filter brightness-75 contrast-125 transition-opacity duration-1000 blur-[2px]">
            <MapContainer 
                center={coords} 
                zoom={zoom} 
                style={{ height: "100%", width: "100%" }}
                zoomControl={false}
                scrollWheelZoom={false}
                doubleClickZoom={false}
                dragging={false}
            >
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                />
                <MapUpdater coordinates={coords} zoom={zoom} />
                {markers.map((m, i) => (
                    <Marker key={i} position={m.pos}>
                        <Popup>{m.name}</Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
}
