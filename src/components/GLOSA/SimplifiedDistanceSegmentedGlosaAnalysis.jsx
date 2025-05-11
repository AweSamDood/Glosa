import React, { useState, useMemo, useEffect } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { getAdviceColor } from '../../utils/chartUtils';

const SimplifiedDistanceSegmentedGlosaAnalysis = ({ intersections }) => {
    // State for number of segments
    const [segmentCount, setSegmentCount] = useState(5);

    // Calculate the full distance range from data
    const distanceRange = useMemo(() => {
        let min = Infinity;
        let max = 0;

        // Iterate through all intersections, passes, and metrics
        Object.values(intersections).forEach(intersection => {
            (intersection.passThroughs || []).forEach(pass => {
                Object.values(pass.signalGroups || {}).forEach(sg => {
                    (sg.metrics || []).forEach(metric => {
                        if (metric.distance > 0) { // Only consider positive distances
                            min = Math.min(min, metric.distance);
                            max = Math.max(max, metric.distance);
                        }
                    });
                });
            });
        });

        // Default range if no data
        if (min === Infinity) return { min: 0, max: 200 };

        // Round for cleaner boundaries
        return {
            min: Math.max(0, Math.floor(min)),
            max: Math.ceil(max)
        };
    }, [intersections]);

    // State for segment boundaries
    const [segments, setSegments] = useState([]);

    // Initialize segments with specified default values
    useEffect(() => {
        // Create custom segments as specified
        const defaultSegments = [
            { id: 0, min: 0, max: 20 },
            { id: 1, min: 20, max: 50 },
            { id: 2, min: 50, max: 100 },
            { id: 3, min: 100, max: 150 },
            { id: 4, min: 150, max: Math.max(distanceRange.max, 200) } // Use max from data or at least 200
        ];

        setSegments(defaultSegments);
    }, [distanceRange]);

    // Generate data for the chart
    const segmentedData = useMemo(() => {
        // First, collect all advice instances and associate them with segments
        const adviceBySegment = segments.map(segment => {
            const segmentAdvice = {};

            // Iterate through all intersections, passes, and metrics
            Object.values(intersections).forEach(intersection => {
                (intersection.passThroughs || []).forEach(pass => {
                    Object.values(pass.signalGroups || {}).forEach(sg => {
                        (sg.metrics || []).forEach(metric => {
                            // Check if this metric falls within this segment
                            if (
                                metric.distance >= segment.min &&
                                metric.distance <= segment.max &&
                                metric.glosaAdvice // Only include if there's advice
                            ) {
                                segmentAdvice[metric.glosaAdvice] = (segmentAdvice[metric.glosaAdvice] || 0) + 1;
                            }
                        });
                    });
                });
            });

            return {
                segment: `${segment.min}-${segment.max}m`,
                segmentId: segment.id,
                min: segment.min,
                max: segment.max,
                totalCount: Object.values(segmentAdvice).reduce((sum, count) => sum + count, 0),
                ...segmentAdvice // Add each advice type as a property
            };
        });

        return adviceBySegment;
    }, [intersections, segments]);

    // Get all unique advice types across all segments
    const allAdviceTypes = useMemo(() => {
        const types = new Set();

        segmentedData.forEach(segment => {
            Object.keys(segment).forEach(key => {
                // Only consider properties that are advice types (not segment metadata)
                if (
                    key !== 'segment' &&
                    key !== 'segmentId' &&
                    key !== 'min' &&
                    key !== 'max' &&
                    key !== 'totalCount'
                ) {
                    types.add(key);
                }
            });
        });

        return Array.from(types);
    }, [segmentedData]);

    // Sort segments by min distance for consistent display
    const sortedSegmentedData = useMemo(() => {
        return [...segmentedData].sort((a, b) => a.min - b.min);
    }, [segmentedData]);

    // Create stacked bar chart configuration
    const stackedBars = allAdviceTypes.map(adviceType => (
        <Bar
            key={adviceType}
            dataKey={adviceType}
            name={adviceType}
            stackId="a"
            fill={getAdviceColor(adviceType)}
        />
    ));

    // For the percentage view
    const percentageData = useMemo(() => {
        return sortedSegmentedData.map(segment => {
            const result = {
                segment: segment.segment,
                segmentId: segment.segmentId,
                min: segment.min,
                max: segment.max,
                totalCount: segment.totalCount
            };

            if (segment.totalCount > 0) {
                allAdviceTypes.forEach(adviceType => {
                    if (segment[adviceType]) {
                        result[adviceType] = (segment[adviceType] / segment.totalCount) * 100;
                    } else {
                        result[adviceType] = 0;
                    }
                });
            } else {
                allAdviceTypes.forEach(adviceType => {
                    result[adviceType] = 0;
                });
            }

            return result;
        });
    }, [sortedSegmentedData, allAdviceTypes]);

    // Toggle between count and percentage views
    const [showPercentages, setShowPercentages] = useState(false);

    // Custom tooltip for clarity
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div style={{
                    backgroundColor: 'white',
                    padding: '10px',
                    border: '1px solid #ccc',
                    borderRadius: '4px'
                }}>
                    <p style={{ fontWeight: 'bold', margin: '0 0 5px 0' }}>{label}</p>
                    {payload.map((entry, index) => (
                        <p key={index} style={{
                            margin: '0 0 3px 0',
                            color: entry.color
                        }}>
                            {entry.name}: {showPercentages
                            ? `${entry.value.toFixed(1)}%`
                            : entry.value}
                        </p>
                    ))}
                    <p style={{
                        marginTop: '6px',
                        fontWeight: '600',
                        borderTop: '1px solid #eee',
                        paddingTop: '3px'
                    }}>
                        Total: {payload[0].payload.totalCount}
                    </p>
                </div>
            );
        }

        return null;
    };

    return (
        <div style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
                Distance-Segmented GLOSA Analysis
            </h3>

            {/* Configuration Controls - simplified */}
            <div style={{
                backgroundColor: 'white',
                padding: '16px',
                borderRadius: '6px',
                marginBottom: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                {/* Display Type Toggle */}
                <div>
                    <label style={{
                        display: 'block',
                        fontSize: '14px',
                        fontWeight: '500',
                        marginBottom: '6px',
                        color: '#4b5563'
                    }}>
                        Display Type:
                    </label>
                    <div style={{ display: 'flex', borderRadius: '4px', overflow: 'hidden' }}>
                        <button
                            onClick={() => setShowPercentages(false)}
                            style={{
                                backgroundColor: !showPercentages ? '#3b82f6' : '#e5e7eb',
                                color: !showPercentages ? 'white' : '#4b5563',
                                border: 'none',
                                padding: '6px 12px',
                                cursor: 'pointer',
                                fontWeight: '500',
                                fontSize: '14px'
                            }}
                        >
                            Counts
                        </button>
                        <button
                            onClick={() => setShowPercentages(true)}
                            style={{
                                backgroundColor: showPercentages ? '#3b82f6' : '#e5e7eb',
                                color: showPercentages ? 'white' : '#4b5563',
                                border: 'none',
                                padding: '6px 12px',
                                cursor: 'pointer',
                                fontWeight: '500',
                                fontSize: '14px'
                            }}
                        >
                            Percentages
                        </button>
                    </div>
                </div>

                {/* Stats Summary */}
                <div>
                    <div style={{ textAlign: 'right', color: '#4b5563', fontSize: '14px' }}>
                        <div>
                            <span style={{ fontWeight: '500' }}>Total Data Points:</span>{' '}
                            {sortedSegmentedData.reduce((sum, segment) => sum + segment.totalCount, 0)}
                        </div>
                        <div>
                            <span style={{ fontWeight: '500' }}>Distance Range:</span>{' '}
                            {distanceRange.min}-{distanceRange.max}m
                        </div>
                    </div>
                </div>
            </div>

            {/* The Chart */}
            <div style={{
                backgroundColor: 'white',
                padding: '16px',
                borderRadius: '6px',
                marginBottom: '16px'
            }}>
                <div style={{ height: '500px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={showPercentages ? percentageData : sortedSegmentedData}
                            margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                dataKey="segment"
                                angle={-45}
                                textAnchor="end"
                                height={80}
                                interval={0}
                                label={{
                                    value: 'Distance Segment (m)',
                                    position: 'insideBottom',
                                    offset: -5
                                }}
                            />
                            <YAxis
                                label={{
                                    value: showPercentages ? 'Percentage (%)' : 'Count',
                                    angle: -90,
                                    position: 'insideLeft'
                                }}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            {stackedBars}
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default SimplifiedDistanceSegmentedGlosaAnalysis;