import React, { useState, useMemo, useEffect } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { getAdviceColor } from '../../utils/chartUtils';

const DistanceSegmentedGlosaAnalysis = ({ intersections, filteredData }) => {
    // State for number of segments
    const [segmentCount, setSegmentCount] = useState(5);
    const [tempSegmentCount, setTempSegmentCount] = useState(5); // For input field

    // Calculate the full distance range from data
    const distanceRange = useMemo(() => {
        let min = Infinity;
        let max = 0;

        // Use filtered data if provided, otherwise use all intersections
        const dataToUse = filteredData || intersections;

        // Iterate through all intersections, passes, and metrics
        Object.values(dataToUse).forEach(intersection => {
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
    }, [intersections, filteredData]);

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

    // Regenerate default segments when segment count changes
    useEffect(() => {
        if (segmentCount === 5) {
            // Use our custom default segments
            const defaultSegments = [
                { id: 0, min: 0, max: 20 },
                { id: 1, min: 20, max: 50 },
                { id: 2, min: 50, max: 100 },
                { id: 3, min: 100, max: 150 },
                { id: 4, min: 150, max: Math.max(distanceRange.max, 200) }
            ];
            setSegments(defaultSegments);
        } else {
            // For other segment counts, distribute evenly
            const range = distanceRange.max - distanceRange.min;
            const segmentSize = range / segmentCount;

            const newSegments = Array.from({ length: segmentCount }, (_, i) => ({
                id: i,
                min: Math.round((distanceRange.min + i * segmentSize) * 10) / 10,
                max: Math.round((distanceRange.min + (i + 1) * segmentSize) * 10) / 10
            }));

            // Ensure the last segment includes the max value exactly
            if (newSegments.length > 0) {
                newSegments[newSegments.length - 1].max = distanceRange.max;
            }

            setSegments(newSegments);
        }
    }, [segmentCount, distanceRange]);

    // Handle segment boundary changes
    const updateSegmentBoundary = (index, field, value) => {
        const newValue = parseFloat(value);
        if (isNaN(newValue)) return;

        const newSegments = [...segments];

        // Update this segment
        newSegments[index] = {
            ...newSegments[index],
            [field]: newValue
        };

        // Ensure segments don't overlap and stay in order
        if (field === 'min') {
            // Ensure min doesn't exceed max of this segment
            if (newValue >= newSegments[index].max) {
                newSegments[index].min = newSegments[index].max - 0.1;
            }

            // Ensure min isn't less than previous segment's max
            if (index > 0 && newValue < newSegments[index - 1].max) {
                newSegments[index].min = newSegments[index - 1].max;
            }
        } else if (field === 'max') {
            // Ensure max isn't less than min of this segment
            if (newValue <= newSegments[index].min) {
                newSegments[index].max = newSegments[index].min + 0.1;
            }

            // Ensure max doesn't exceed next segment's min
            if (index < newSegments.length - 1 && newValue > newSegments[index + 1].min) {
                newSegments[index].max = newSegments[index + 1].min;
            }
        }

        setSegments(newSegments);
    };

    // Apply segment count from input field
    const applySegmentCount = () => {
        const count = parseInt(tempSegmentCount);
        if (!isNaN(count) && count > 0 && count <= 20) {
            setSegmentCount(count);
        } else {
            setTempSegmentCount(segmentCount); // Reset invalid input
        }
    };

    // Generate data for the chart
    const segmentedData = useMemo(() => {
        // First, collect all advice instances and associate them with segments
        const adviceBySegment = segments.map(segment => {
            const segmentAdvice = {};

            // Use filtered data if provided, otherwise use all intersections
            const dataToUse = filteredData || intersections;

            // Iterate through all intersections, passes, and metrics
            Object.values(dataToUse).forEach(intersection => {
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
    }, [intersections, segments, filteredData]);

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

    // Function to reset segments to our default segmentation
    const resetSegments = () => {
        const defaultSegments = [
            { id: 0, min: 0, max: 20 },
            { id: 1, min: 20, max: 50 },
            { id: 2, min: 50, max: 100 },
            { id: 3, min: 100, max: 150 },
            { id: 4, min: 150, max: Math.max(distanceRange.max, 200) }
        ];
        setSegmentCount(5);
        setTempSegmentCount(5);
        setSegments(defaultSegments);
    };

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

            {/* Configuration Controls */}
            <div style={{
                backgroundColor: 'white',
                padding: '16px',
                borderRadius: '6px',
                marginBottom: '16px'
            }}>
                <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '16px',
                    marginBottom: '16px',
                    alignItems: 'flex-end'
                }}>
                    {/* Segment Count Control */}
                    <div>
                        <label
                            htmlFor="segmentCount"
                            style={{
                                display: 'block',
                                fontSize: '14px',
                                fontWeight: '500',
                                marginBottom: '6px',
                                color: '#4b5563'
                            }}
                        >
                            Number of Distance Segments:
                        </label>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input
                                id="segmentCount"
                                type="number"
                                value={tempSegmentCount}
                                onChange={(e) => setTempSegmentCount(e.target.value)}
                                style={{
                                    width: '60px',
                                    padding: '6px 8px',
                                    borderRadius: '4px',
                                    border: '1px solid #d1d5db'
                                }}
                                min="1"
                                max="20"
                            />
                            <button
                                onClick={applySegmentCount}
                                style={{
                                    backgroundColor: '#3b82f6',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    padding: '6px 12px',
                                    cursor: 'pointer',
                                    fontWeight: '500',
                                    fontSize: '14px'
                                }}
                            >
                                Apply
                            </button>
                        </div>
                    </div>

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

                    {/* Reset Button */}
                    <div>
                        <button
                            onClick={resetSegments}
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
                            Reset Segments
                        </button>
                    </div>
                </div>

                {/* Segment Boundary Controls */}
                <div>
                    <h4 style={{
                        fontSize: '14px',
                        fontWeight: '500',
                        marginBottom: '8px',
                        color: '#4b5563'
                    }}>
                        Segment Boundaries:
                    </h4>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                        gap: '8px',
                        maxHeight: '240px',
                        overflowY: 'auto',
                        padding: '8px',
                        backgroundColor: '#f9fafb',
                        borderRadius: '4px'
                    }}>
                        {segments.map((segment, index) => (
                            <div
                                key={segment.id}
                                style={{
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '4px',
                                    padding: '8px',
                                    backgroundColor: 'white'
                                }}
                            >
                                <div style={{
                                    fontWeight: '500',
                                    marginBottom: '6px',
                                    display: 'flex',
                                    justifyContent: 'space-between'
                                }}>
                                    <span>Segment {index + 1}</span>
                                    <span style={{
                                        color: '#6b7280',
                                        fontSize: '12px',
                                        backgroundColor: '#f3f4f6',
                                        padding: '2px 6px',
                                        borderRadius: '4px'
                                    }}>
                                        {sortedSegmentedData[index]?.totalCount || 0} items
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <input
                                        type="number"
                                        value={segment.min}
                                        onChange={(e) => updateSegmentBoundary(index, 'min', e.target.value)}
                                        style={{
                                            width: '70px',
                                            padding: '4px 6px',
                                            borderRadius: '4px',
                                            border: '1px solid #d1d5db',
                                            fontSize: '14px'
                                        }}
                                        step="0.1"
                                    />
                                    <span>to</span>
                                    <input
                                        type="number"
                                        value={segment.max}
                                        onChange={(e) => updateSegmentBoundary(index, 'max', e.target.value)}
                                        style={{
                                            width: '70px',
                                            padding: '4px 6px',
                                            borderRadius: '4px',
                                            border: '1px solid #d1d5db',
                                            fontSize: '14px'
                                        }}
                                        step="0.1"
                                    />
                                    <span>m</span>
                                </div>
                            </div>
                        ))}
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

            {/* Summary Stats for quick reference */}
            <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '6px' }}>
                <h4 style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    marginBottom: '8px',
                    color: '#4b5563'
                }}>
                    Analysis Summary:
                </h4>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: '8px'
                }}>
                    <div style={{
                        padding: '8px',
                        backgroundColor: '#f9fafb',
                        borderRadius: '4px'
                    }}>
                        <span style={{ fontWeight: '500' }}>Total Segments:</span> {segments.length}
                    </div>
                    <div style={{
                        padding: '8px',
                        backgroundColor: '#f9fafb',
                        borderRadius: '4px'
                    }}>
                        <span style={{ fontWeight: '500' }}>Total GLOSA Advice:</span> {
                        sortedSegmentedData.reduce((sum, segment) => sum + segment.totalCount, 0)
                    }
                    </div>
                    <div style={{
                        padding: '8px',
                        backgroundColor: '#f9fafb',
                        borderRadius: '4px'
                    }}>
                        <span style={{ fontWeight: '500' }}>Distance Range:</span> {
                        distanceRange.min
                    } - {
                        distanceRange.max
                    }m
                    </div>
                    <div style={{
                        padding: '8px',
                        backgroundColor: '#f9fafb',
                        borderRadius: '4px'
                    }}>
                        <span style={{ fontWeight: '500' }}>Advice Types:</span> {allAdviceTypes.length}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DistanceSegmentedGlosaAnalysis;