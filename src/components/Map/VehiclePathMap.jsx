// src/components/Map/VehiclePathMap.jsx
// To install Leaflet, run: npm install leaflet
import React, { useEffect, useRef } from 'react';

const VehiclePathMap = ({ passThrough }) => {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null); // To keep track of the map instance
    const errorRef = useRef(null);

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

    // Effect to clean up map when component unmounts
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
        // Clear any previous error
        if (errorRef.current) {
            errorRef.current.style.display = 'none';
            errorRef.current = null;
        }

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
            // Show error message
            const errorDiv = document.createElement('div');
            errorDiv.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #6b7280;">
                    <p>No valid GPS coordinates found in the pass-through data.</p>
                    <p style="font-size: 14px; margin-top: 8px;">
                        Make sure the pass-through contains valid GPS coordinates.
                    </p>
                </div>
            `;
            errorDiv.style.display = 'flex';
            errorDiv.style.justifyContent = 'center';
            errorDiv.style.alignItems = 'center';
            errorDiv.style.backgroundColor = '#f9fafb';
            errorDiv.style.height = '100%';
            errorDiv.style.width = '100%';
            errorRef.current = errorDiv;

            // Clear map container first
            mapRef.current.innerHTML = '';
            mapRef.current.appendChild(errorDiv);
            return;
        }

        // Now we're sure we have coordinates, clear the container
        mapRef.current.innerHTML = '';

        // Load and initialize the map
        const loadLeaflet = async () => {
            try {
                // Import Leaflet
                const L = await import('leaflet');

                // Import CSS for Leaflet
                await import('leaflet/dist/leaflet.css');

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

                // Add intermediate markers for significant points (e.g., every few points)
                const markEvery = Math.max(1, Math.floor(pathCoordinates.length / 5)); // At most 5 markers
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
                    map.invalidateSize();
                }, 100);

            } catch (err) {
                console.error("Error loading map:", err);

                // Show error in the map container
                const errorDiv = document.createElement('div');
                errorDiv.innerHTML = `
                    <div style="text-align: center; padding: 20px; color: #6b7280;">
                        <p>Failed to load map: ${err.message}</p>
                    </div>
                `;
                errorDiv.style.display = 'flex';
                errorDiv.style.justifyContent = 'center';
                errorDiv.style.alignItems = 'center';
                errorDiv.style.backgroundColor = '#f9fafb';
                errorDiv.style.height = '100%';
                errorDiv.style.width = '100%';
                errorRef.current = errorDiv;

                // Clear map container first
                mapRef.current.innerHTML = '';
                mapRef.current.appendChild(errorDiv);
            }
        };

        loadLeaflet();
    }, [passThrough]); // Re-run when passThrough changes

    // Map container styles
    const mapContainerStyle = {
        height: '400px',
        width: '100%',
        borderRadius: '8px',
        border: '1px solid #e5e7eb',
        position: 'relative'
    };

    return <div ref={mapRef} style={mapContainerStyle} />;
};

export default VehiclePathMap;