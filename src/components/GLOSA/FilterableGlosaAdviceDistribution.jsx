{/* Enhanced GLOSA Advice Distribution Component */}
import React, { useState, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { getAdviceColor } from '../../utils/chartUtils';

const FilterableGlosaAdviceDistribution = ({ intersections, instanceId = 1 }) => {
    // Filter state
    const [distanceFilter, setDistanceFilter] = useState({ min: 0, max: 200 });
    const [timeFilter, setTimeFilter] = useState({ min: 0, max: 60 });

    // Prepare all GLOSA advice data with metadata
    const allAdviceData = useMemo(() => {
        const data = [];

        Object.values(intersections).forEach(intersection => {
            // Process each pass-through
            (intersection.passThroughs || []).forEach(passThrough => {
                const passTimestamp = passThrough.timestamp;

                // Process each signal group
                Object.values(passThrough.signalGroups || {}).forEach(sg => {
                    // Process each metric with distance and time information
                    (sg.metrics || []).forEach(metric => {
                        // Skip if no GLOSA advice
                        if (!metric.glosaAdvice) return;

                        // Only consider metrics before passing the intersection
                        // (when distance is positive)
                        if (metric.distance <= 0) return;

                        // Calculate time before passing intersection
                        const timeBeforePassing =
                            (passTimestamp - metric.timestamp) / 1000; // seconds

                        // Only include events that happened before passing
                        if (timeBeforePassing < 0) return;

                        data.push({
                            intersectionId: intersection.id,
                            intersectionName: intersection.name,
                            passIndex: passThrough.passIndex,
                            signalGroup: sg.name,
                            timestamp: metric.timestamp,
                            timeBeforePassing,
                            distance: metric.distance,
                            advice: metric.glosaAdvice,
                            speed: metric.speed
                        });
                    });
                });
            });
        });

        return data;
    }, [intersections]);

    // Apply filters and aggregate data
    const filteredAdviceData = useMemo(() => {
        // Filter by distance and time
        const filtered = allAdviceData.filter(item =>
            item.distance >= distanceFilter.min &&
            item.distance <= distanceFilter.max &&
            item.timeBeforePassing >= timeFilter.min &&
            item.timeBeforePassing <= timeFilter.max
        );

        // Aggregate by advice type
        const aggregated = filtered.reduce((acc, item) => {
            if (!acc[item.advice]) {
                acc[item.advice] = 0;
            }
            acc[item.advice]++;
            return acc;
        }, {});

        // Convert to array format for chart
        return Object.entries(aggregated)
            .map(([advice, count]) => ({ advice, count }))
            .sort((a, b) => b.count - a.count);
    }, [allAdviceData, distanceFilter, timeFilter]);

    // Helper function to get min/max distance across all data
    const getDistanceRange = () => {
        if (allAdviceData.length === 0) return { min: 0, max: 200 };

        const min = Math.floor(Math.min(...allAdviceData.map(d => d.distance)));
        const max = Math.ceil(Math.max(...allAdviceData.map(d => d.distance)));

        return { min, max };
    };

    // Helper function to get min/max time before passing across all data
    const getTimeRange = () => {
        if (allAdviceData.length === 0) return { min: 0, max: 60 };

        const min = 0; // Always start at 0 seconds
        const max = Math.ceil(Math.max(...allAdviceData.map(d => d.timeBeforePassing)));

        return { min, max: Math.min(max, 300) }; // Cap at 5 minutes (300s) for usability
    };

    // Get the actual ranges from data
    const distanceRange = useMemo(getDistanceRange, [allAdviceData]);
    const timeRange = useMemo(getTimeRange, [allAdviceData]);

    // Handle distance filter changes
    const handleDistanceMinChange = (e) => {
        const value = Number(e.target.value);
        if (!isNaN(value) && value >= 0 && value <= distanceFilter.max) {
            setDistanceFilter(prev => ({ ...prev, min: value }));
        }
    };

    const handleDistanceMaxChange = (e) => {
        const value = Number(e.target.value);
        if (!isNaN(value) && value >= distanceFilter.min) {
            setDistanceFilter(prev => ({ ...prev, max: value }));
        }
    };

    // Handle time filter changes
    const handleTimeMinChange = (e) => {
        const value = Number(e.target.value);
        if (!isNaN(value) && value >= 0 && value <= timeFilter.max) {
            setTimeFilter(prev => ({ ...prev, min: value }));
        }
    };

    const handleTimeMaxChange = (e) => {
        const value = Number(e.target.value);
        if (!isNaN(value) && value >= timeFilter.min) {
            setTimeFilter(prev => ({ ...prev, max: value }));
        }
    };

    // Reset filters to defaults
    const handleResetFilters = () => {
        setDistanceFilter({ min: 0, max: distanceRange.max });
        setTimeFilter({ min: 0, max: timeRange.max });
    };

    return (
        <div style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
                GLOSA Advice Distribution {instanceId > 1 ? `#${instanceId}` : ''}
            </h3>

            {/* Filters Section */}
            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '16px',
                marginBottom: '16px',
                backgroundColor: 'white',
                padding: '12px',
                borderRadius: '6px'
            }}>
                {/* Distance Filter */}
                <div style={{ flex: '1', minWidth: '200px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>Distance from Intersection (m)</h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                            type="number"
                            value={distanceFilter.min}
                            onChange={handleDistanceMinChange}
                            style={{
                                width: '70px',
                                padding: '6px 8px',
                                borderRadius: '4px',
                                border: '1px solid #d1d5db'
                            }}
                            min={0}
                            max={distanceFilter.max}
                        />
                        <span>to</span>
                        <input
                            type="number"
                            value={distanceFilter.max}
                            onChange={handleDistanceMaxChange}
                            style={{
                                width: '70px',
                                padding: '6px 8px',
                                borderRadius: '4px',
                                border: '1px solid #d1d5db'
                            }}
                            min={distanceFilter.min}
                        />
                        <span style={{ fontSize: '12px', color: '#6b7280' }}>
                            (Range: 0-{distanceRange.max}m)
                        </span>
                    </div>
                </div>

                {/* Time Filter */}
                <div style={{ flex: '1', minWidth: '200px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>Time Before Passing (seconds)</h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input
                            type="number"
                            value={timeFilter.min}
                            onChange={handleTimeMinChange}
                            style={{
                                width: '70px',
                                padding: '6px 8px',
                                borderRadius: '4px',
                                border: '1px solid #d1d5db'
                            }}
                            min={0}
                            max={timeFilter.max}
                        />
                        <span>to</span>
                        <input
                            type="number"
                            value={timeFilter.max}
                            onChange={handleTimeMaxChange}
                            style={{
                                width: '70px',
                                padding: '6px 8px',
                                borderRadius: '4px',
                                border: '1px solid #d1d5db'
                            }}
                            min={timeFilter.min}
                        />
                        <span style={{ fontSize: '12px', color: '#6b7280' }}>
                            (Range: 0-{timeRange.max}s)
                        </span>
                    </div>
                </div>

                {/* Reset Button */}
                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <button
                        onClick={handleResetFilters}
                        style={{
                            backgroundColor: '#e5e7eb',
                            color: '#4b5563',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '6px 12px',
                            cursor: 'pointer',
                            fontWeight: '500',
                            fontSize: '14px'
                        }}
                    >
                        Reset Filters
                    </button>
                </div>
            </div>

            {/* Filter Summary */}
            <div style={{
                marginBottom: '16px',
                fontSize: '14px',
                color: '#4b5563',
                backgroundColor: 'white',
                padding: '8px 12px',
                borderRadius: '6px',
                display: 'flex',
                justifyContent: 'space-between'
            }}>
                <div>
                    Showing GLOSA advice when vehicle is {distanceFilter.min}-{distanceFilter.max}m from intersection,
                    {timeFilter.min}-{timeFilter.max}s before passing
                </div>
                <div style={{ fontWeight: '500' }}>
                    {filteredAdviceData.reduce((sum, item) => sum + item.count, 0)} advice instances
                </div>
            </div>

            {/* The Chart */}
            {filteredAdviceData.length > 0 ? (
                <div style={{ height: '400px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={filteredAdviceData}
                            margin={{ top: 20, right: 30, bottom: 70, left: 20 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                dataKey="advice"
                                angle={-45}
                                textAnchor="end"
                                height={70}
                                interval={0}
                            />
                            <YAxis label={{ value: 'Count', angle: -90, position: 'insideLeft' }} />
                            <Tooltip />
                            <Legend />
                            <Bar
                                dataKey="count"
                                name="Count"
                                // Use a function to color bars based on advice type
                                fill="#3b82f6"
                                shape={(props) => {
                                    // Get color for this advice
                                    const advice = props.payload.advice;
                                    const color = getAdviceColor(advice);
                                    return (
                                        <rect
                                            x={props.x}
                                            y={props.y}
                                            width={props.width}
                                            height={props.height}
                                            fill={color}
                                            strokeWidth={0}
                                        />
                                    );
                                }}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <div style={{
                    padding: '48px 24px',
                    textAlign: 'center',
                    backgroundColor: 'white',
                    borderRadius: '6px'
                }}>
                    <p style={{ color: '#6b7280' }}>No GLOSA advice data found matching the current filters.</p>
                </div>
            )}
        </div>
    );
};

export default FilterableGlosaAdviceDistribution;