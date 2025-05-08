// src/hooks/useGlosaData.js
import { useState, useEffect } from 'react';
import { processRawData } from '../utils/dataProcessing';

export const useGlosaData = () => {
    const [intersections, setIntersections] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Get data URL from environment variable or use default
    const DATA_URL = import.meta.env.VITE_DATA_URL || './data/output800-time-limit.json';

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                setError(null);
                console.log(`Loading data from: ${DATA_URL}`);

                const response = await fetch(DATA_URL);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const jsonData = await response.json();

                // Process and organize data by intersection
                const processed = processRawData(jsonData); // Pass the raw JSON object
                setIntersections(processed);
                console.log(`Successfully loaded data from ${DATA_URL}`);

            } catch (err) {
                console.error("Error loading or processing data:", err);
                setError(`Failed to load data from ${DATA_URL}. Check console for details.`);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [DATA_URL]); // Add DATA_URL as dependency to re-run if it changes

    return { intersections, loading, error, dataSource: DATA_URL };
};