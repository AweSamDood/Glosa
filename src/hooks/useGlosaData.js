// src/hooks/useGlosaData.js
import { useState, useEffect } from 'react';
import { processRawData } from '../utils/dataProcessing';
// Assuming your data files are in public/data
// const DATA_URL = './data/TrafficLightStatus-VIENNATEST-1.json';
const DATA_URL = './data/output800-time-limit.json'; // Adjust the path as necessary

export const useGlosaData = () => {
    const [intersections, setIntersections] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                setError(null);
                const response = await fetch(DATA_URL);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const jsonData = await response.json();

                // Process and organize data by intersection
                const processed = processRawData(jsonData); // Pass the raw JSON object
                setIntersections(processed);

            } catch (err) {
                console.error("Error loading or processing data:", err);
                setError(`Failed to load data from ${DATA_URL}. Check console for details.`);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []); // Empty dependency array means this runs once on mount

    return { intersections, loading, error };
};