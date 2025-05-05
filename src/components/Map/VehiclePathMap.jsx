// src/components/Map/VehiclePathMap.jsx
import React, { useEffect, useRef, useState } from 'react';

const VehiclePathMap = ({ passThrough }) => {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null); // To keep track of the map instance
    const [errorMessage, setErrorMessage] = useState(null);

    // Extract all position data from the metrics of all signal groups
    const extractPathCoordinates = () => {
        if (!passThrough || !passThrough.signalGroups) return [];

        // Collect all metrics with valid coordinates
        const allMetrics = Object.values(passThrough.signalGroups)
            .flatMap(sg => sg.metrics)
            .filter(metric => metric.lat && metric.lng && metric.lat !== 0 && metric.lng !== 0);

        // Sort by timestamp to ensure correct path order
        allMetrics.sort((a, b) => a.timestamp - b.timestamp);

        // Return coordinates in [lat, lng] format for Leaflet
        return allMetrics.map(metric => ({
            lat: metric.lat,
            lng: metric.lng,
            timestamp: metric.timestamp,
            speed: metric.speed
        }));
    };

    // Effect to clean up map when component unmounts or before re-initializing
    useEffect(() => {
        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, []);

    // Effect to initialize/update map whenever passThrough changes
    useEffect(() => {
        // Reset error message
        setErrorMessage(null);

        // Always clean up previous map instance if it exists
        if (mapInstanceRef.current) {
            mapInstanceRef.current.remove();
            mapInstanceRef.current = null;
        }

        // Don't proceed if there's no ref element
        if (!mapRef.current) return;

        // Extract the path coordinates
        const pathCoordinates = extractPathCoordinates();

        if (pathCoordinates.length === 0) {
            setErrorMessage("No valid GPS coordinates found in the pass-through data.");
            return;
        }

        // Now we're sure we have coordinates, clear the container for safety
        if (mapRef.current) {
            mapRef.current.innerHTML = '';
        }

        // Load and initialize the map
        const loadLeaflet = async () => {
            try {
                // Import Leaflet
                const L = await import('leaflet');

                // Import CSS for Leaflet
                await import('leaflet/dist/leaflet.css');

                // Make sure map is not already initialized and container exists
                if (mapInstanceRef.current || !mapRef.current) {
                    return;
                }

                // Initialize the map
                const map = L.map(mapRef.current);
                mapInstanceRef.current = map; // Store map instance for later cleanup

                // Add OpenStreetMap tile layer
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                    maxZoom: 19
                }).addTo(map);

                // Create a polyline for the vehicle path
                const path = L.polyline(pathCoordinates, {
                    color: '#3b82f6', // Blue color
                    weight: 5, // Line thickness
                    opacity: 0.8
                }).addTo(map);

                // Add start marker (first position)
                const startPoint = pathCoordinates[0];
                L.marker([startPoint.lat, startPoint.lng], {
                    title: `Start - ${startPoint.timestamp.toLocaleTimeString()}`,
                    icon: L.divIcon({
                        html: `<div style="background-color: #10b981; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>`,
                        className: '',
                        iconSize: [16, 16]
                    })
                }).addTo(map)
                    .bindPopup(`Start: ${startPoint.timestamp.toLocaleTimeString()}<br>Speed: ${startPoint.speed.toFixed(1)} km/h`);

                // Add end marker (last position)
                const endPoint = pathCoordinates[pathCoordinates.length - 1];
                L.marker([endPoint.lat, endPoint.lng], {
                    title: `End - ${endPoint.timestamp.toLocaleTimeString()}`,
                    icon: L.divIcon({
                        html: `<div style="background-color: #ef4444; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white;"></div>`,
                        className: '',
                        iconSize: [18, 18]
                    })
                }).addTo(map)
                    .bindPopup(`Intersection: ${endPoint.timestamp.toLocaleTimeString()}<br>Speed: ${endPoint.speed.toFixed(1)} km/h`);

                // Add intermediate markers for every point
                const markEvery = 1;
                for (let i = 1; i < pathCoordinates.length - 1; i += markEvery) {
                    const point = pathCoordinates[i];
                    L.circleMarker([point.lat, point.lng], {
                        radius: 4,
                        color: '#6366f1',
                        fill: true,
                        fillColor: '#6366f1',
                        fillOpacity: 0.8
                    }).addTo(map)
                        .bindPopup(`Time: ${point.timestamp.toLocaleTimeString()}<br>Speed: ${point.speed.toFixed(1)} km/h`);
                }

                // Fit the map to the path bounds with some padding
                map.fitBounds(path.getBounds(), { padding: [30, 30] });

                // Force map to check its size and redraw
                setTimeout(() => {
                    if (map && !map._isDestroyed) {
                        map.invalidateSize();
                    }
                }, 100);

            } catch (err) {
                console.error("Error loading map:", err);
                setErrorMessage(`Failed to load map: ${err.message}`);
            }
        };

        // Small timeout to ensure clean initialization
        const timer = setTimeout(() => {
            loadLeaflet();
        }, 50);

        return () => {
            clearTimeout(timer);
        };
    }, [passThrough]); // Re-run when passThrough changes

    // Map container styles
    const mapContainerStyle = {
        height: '400px',
        width: '100%',
        borderRadius: '8px',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: '#e5e7eb',
        position: 'relative'
    };

    // Error message display
    if (errorMessage) {
        return (
            <div style={mapContainerStyle}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100%',
                    backgroundColor: '#f9fafb',
                    color: '#6b7280',
                    textAlign: 'center',
                    padding: '20px'
                }}>
                    <p>{errorMessage}</p>
                </div>
            </div>
        );
    }

    return <div ref={mapRef} style={mapContainerStyle} />;
};

export default VehiclePathMap;