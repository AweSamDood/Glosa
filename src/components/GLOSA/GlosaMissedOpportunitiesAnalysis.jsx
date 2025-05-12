// src/components/GLOSA/GlosaMissedOpportunitiesAnalysis.jsx
// This component analyzes missed opportunities where following GLOSA advice would have gotten
// the driver through on green, but they actually missed the green light
import React, { useState, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    LineChart, Line, ReferenceLine, PieChart, Pie, Cell
} from 'recharts';

// Constants matching the recalculation script
const ACCELERATION_FACTOR_TRAM = 1.3; // m/s²
const MIN_ALLOWED_SPEED_TRAM = 8 / 3.6; // m/s (8 km/h)
const MAX_ALLOWED_SPEED = 50 / 3.6; // m/s (50 km/h)

// Time threshold - how many seconds after predicted arrival we check if driver is still waiting
const WAITING_THRESHOLD_SECONDS = 5;

const GlosaMissedOpportunitiesAnalysis = ({ intersections }) => {
    // State for visualization toggle
    const [visualizationType, setVisualizationType] = useState('missed-opportunities');

    // Configurable parameters with defaults - shared with GlosaAdviceReliabilityAnalysis
    const [intervalSize, setIntervalSize] = useState(20); // Default 20m intervals
    const [tolerance, setTolerance] = useState(2); // Default ±2s tolerance
    const [xAxisInterval, setXAxisInterval] = useState(1); // Show every nth label

    // Min and max distance
    const [minDistance, setMinDistance] = useState(20); // Default 20m min
    const [maxDistance, setMaxDistance] = useState(300); // Default 300m max

    // State for toggling advice types in detail visualization
    const [showAccelerate, setShowAccelerate] = useState(true);
    const [showCruise, setShowCruise] = useState(true);
    const [showDecelerate, setShowDecelerate] = useState(true);

    // Calculate a good default for xAxisInterval based on data range
    const calculateDefaultXAxisInterval = (maxDist) => {
        const totalIntervals = Math.ceil((maxDist - minDistance) / intervalSize);
        // Use a heuristic: if more than 20 intervals, show every nth label where n = ceil(totalIntervals/15)
        if (totalIntervals > 20) {
            return Math.ceil(totalIntervals / 15);
        }
        return 1; // Show all labels if few intervals
    };

    // Find absolute maximum distance in the data
    const absoluteMaxDistance = useMemo(() => {
        let maxDist = 0;
        // Find maximum distance in the data
        Object.values(intersections).forEach(intersection => {
            (intersection.passThroughs || []).forEach(pass => {
                Object.values(pass.signalGroups || {}).forEach(sg => {
                    (sg.metrics || []).forEach(metric => {
                        if (metric.distance > maxDist) {
                            maxDist = metric.distance;
                        }
                    });
                });
            });
        });
        return maxDist;
    }, [intersections]);

    // Distance intervals to analyze (in meters)
    const distanceIntervals = useMemo(() => {
        // Use user-defined max distance, but cap it at absolute maximum from data
        const effectiveMaxDistance = Math.min(maxDistance, absoluteMaxDistance);

        // Round up to nearest interval
        const maxIntervalEnd = Math.ceil(effectiveMaxDistance / intervalSize) * intervalSize;

        // Set a good default for X-axis interval based on the data range
        const defaultInterval = calculateDefaultXAxisInterval(effectiveMaxDistance);
        setXAxisInterval(defaultInterval);

        // Create array of intervals starting from minDistance
        const intervals = [];
        for (let i = minDistance; i < maxIntervalEnd; i += intervalSize) {
            intervals.push({
                min: i,
                max: i + intervalSize,
                label: `${i}-${i + intervalSize}m`
            });
        }

        return intervals;
    }, [intersections, intervalSize, minDistance, maxDistance, absoluteMaxDistance]);

    // Helper function: Check if there would be a green phase at the arrival time
    function checkGreenPhaseAtArrival(signalGroup, arrivalTime, toleranceSeconds) {
        // Define arrival window (accounting for tolerance)
        const arrivalEarly = new Date(arrivalTime.getTime() - (toleranceSeconds * 1000));
        const arrivalLate = new Date(arrivalTime.getTime() + (toleranceSeconds * 1000));

        // Filter metrics to find those within the arrival window
        const relevantMetrics = signalGroup.metrics.filter(metric => {
            return metric.timestamp >= arrivalEarly && metric.timestamp <= arrivalLate;
        });

        // Go over all metrics and check if any of them is green
        for (const metric of relevantMetrics) {
            // current green phase (greenStartTime = 0)
            if (metric.greenStartTime === 0 && metric.greenEndTime > 0) {
                return true;
            }
        }
        return false; // No green phase found for arrival time
    }

    // Simulate travel time based on acceleration/deceleration model from the recalculation script
    function simulateTravel(distance, currentSpeed, targetSpeed) {
        // Ensure minimum speed thresholds and cap maximum speed
        currentSpeed = Math.max(0, currentSpeed); // Ensure non-negative current speed
        targetSpeed = Math.max(MIN_ALLOWED_SPEED_TRAM, Math.min(MAX_ALLOWED_SPEED, targetSpeed));

        // For very small distances, return a minimal time
        if (distance < 0.1) {
            return 0.1; // 100ms minimum
        }

        // Time to accelerate/decelerate to target speed
        const speedDiff = targetSpeed - currentSpeed;
        const accelTime = Math.abs(speedDiff) / ACCELERATION_FACTOR_TRAM;

        // Distance covered during acceleration/deceleration
        const accelDistance = (currentSpeed * accelTime) +
            (0.5 * Math.sign(speedDiff) * ACCELERATION_FACTOR_TRAM * accelTime * accelTime);

        // If acceleration covers the entire distance
        if (accelDistance >= distance) {
            // Calculate exact time for partial acceleration
            try {
                if (speedDiff >= 0) { // Accelerating
                    return (Math.sqrt(currentSpeed * currentSpeed + 2 * ACCELERATION_FACTOR_TRAM * distance) - currentSpeed) / ACCELERATION_FACTOR_TRAM;
                } else { // Decelerating
                    // Make sure we don't have negative values under the square root
                    if (currentSpeed * currentSpeed - 2 * ACCELERATION_FACTOR_TRAM * distance < 0) {
                        // Can't decelerate enough in this distance, use approximation
                        return distance / ((currentSpeed + targetSpeed) / 2);
                    }
                    return (currentSpeed - Math.sqrt(currentSpeed * currentSpeed - 2 * ACCELERATION_FACTOR_TRAM * distance)) / ACCELERATION_FACTOR_TRAM;
                }
            } catch (error) {
                // Fallback for any calculation errors
                console.warn("Error in travel time calculation, using approximation:", error);
                return distance / ((currentSpeed + targetSpeed) / 2); // Simple average speed approximation
            }
        }

        // Remaining distance at target speed
        const remainingDistance = distance - accelDistance;
        const cruiseTime = remainingDistance / targetSpeed;

        // Total travel time
        return accelTime + cruiseTime;
    }

    // Check if driver was still waiting after predicted arrival time
    function wasDriverStillWaiting(signalGroup, predictedArrivalTime) {
        // Create a window starting from predicted arrival
        const waitStart = new Date(predictedArrivalTime.getTime());
        const waitEnd = new Date(predictedArrivalTime.getTime() + (WAITING_THRESHOLD_SECONDS * 1000));

        // Get metrics between these timestamps
        const metricsAfterPredictedArrival = signalGroup.metrics.filter(metric => {
            return metric.timestamp >= waitStart && metric.timestamp <= waitEnd;
        });

        // If no metrics, driver might have passed already
        if (metricsAfterPredictedArrival.length === 0) {
            return false;
        }

        // Check if vehicle was still approaching (not through yet)
        // We consider driver still waiting if vehicle speed is less than 10 km/h
        // or there's no green light during this period
        let stillApproaching = false;
        let sawGreenLight = false;

        for (const metric of metricsAfterPredictedArrival) {
            // If speed is low, consider still waiting
            if (metric.speed < 10) {
                stillApproaching = true;
            }

            // Check if there's a current green
            if (metric.greenStartTime === 0 && metric.greenEndTime > 0) {
                sawGreenLight = true;
            }
        }

        // Driver was still waiting if approaching AND no green OR
        // saw green but still slow (indicating couldn't make it through)
        return stillApproaching && (!sawGreenLight ||
            (sawGreenLight && metricsAfterPredictedArrival.some(m => m.speed < 5)));
    }

    // Analyze Missed Opportunities
    const analysisResults = useMemo(() => {
        const results = distanceIntervals.map(interval => {
            // Stats for this interval
            const stats = {
                interval: interval.label,
                min: interval.min,
                max: interval.max,
                totalOpportunities: 0,
                missedOpportunities: 0,
                byAdviceType: {
                    accelerate: { total: 0, missed: 0 },
                    cruise: { total: 0, missed: 0 },
                    decelerate: { total: 0, missed: 0 }
                }
            };

            // Process each intersection
            Object.values(intersections).forEach(intersection => {
                (intersection.passThroughs || []).forEach(pass => {
                    // For each pass-through, analyze all signal groups
                    Object.values(pass.signalGroups || {}).forEach(sg => {
                        // Find metrics within this distance interval
                        const metricsInInterval = (sg.metrics || []).filter(metric =>
                            metric.distance >= interval.min &&
                            metric.distance < interval.max &&
                            metric.glosaAdvice &&
                            ["accelerate", "cruise", "decelerate"].includes(metric.glosaAdvice.toLowerCase())
                        );

                        if (metricsInInterval.length === 0) return; // No useful advice in this interval

                        // Take the first useful advice in this interval
                        const firstAdviceMetric = metricsInInterval[0];
                        const advice = firstAdviceMetric.glosaAdvice.toLowerCase();
                        const currentSpeed = firstAdviceMetric.speed / 3.6; // Convert km/h to m/s
                        const advisedSpeed = firstAdviceMetric.glosaSpeedKph / 3.6; // Convert km/h to m/s
                        const distance = firstAdviceMetric.distance;
                        const timestamp = firstAdviceMetric.timestamp;

                        // Simulate following the advice
                        const travelDuration = simulateTravel(
                            distance,
                            currentSpeed,
                            advisedSpeed
                        );

                        // Calculate arrival time
                        const predictedArrivalTime = new Date(timestamp.getTime() + (travelDuration * 1000));

                        // Check if arrival would be during a green phase
                        const wouldArriveOnGreen = checkGreenPhaseAtArrival(
                            sg,
                            predictedArrivalTime,
                            tolerance
                        );

                        // Only count opportunities where GLOSA would work (arrive on green)
                        if (wouldArriveOnGreen) {
                            stats.totalOpportunities++;
                            stats.byAdviceType[advice].total++;

                            // Check if driver was actually still waiting after predicted arrival
                            // This would indicate they missed the opportunity to go through on green
                            if (wasDriverStillWaiting(sg, predictedArrivalTime)) {
                                stats.missedOpportunities++;
                                stats.byAdviceType[advice].missed++;
                            }
                        }
                    });
                });
            });

            // Calculate missed opportunity rates
            if (stats.totalOpportunities > 0) {
                stats.missedRate = (stats.missedOpportunities / stats.totalOpportunities) * 100;

                // Calculate rates by advice type
                Object.keys(stats.byAdviceType).forEach(adviceType => {
                    const typeStats = stats.byAdviceType[adviceType];
                    if (typeStats.total > 0) {
                        typeStats.missedRate = (typeStats.missed / typeStats.total) * 100;
                    } else {
                        typeStats.missedRate = 0;
                    }
                });
            } else {
                stats.missedRate = 0;
            }

            return stats;
        });

        return results;
    }, [intersections, distanceIntervals, tolerance]);

    // Prepare data for visualization
    const chartData = useMemo(() => {
        return analysisResults.filter(result => result.totalOpportunities > 0);
    }, [analysisResults]);

    // Prepare data for advice type breakdown
    const adviceTypeData = useMemo(() => {
        return chartData.map(result => ({
            interval: result.interval,
            min: result.min,
            'Accelerate Missed Rate': result.byAdviceType.accelerate.missedRate || 0,
            'Cruise Missed Rate': result.byAdviceType.cruise.missedRate || 0,
            'Decelerate Missed Rate': result.byAdviceType.decelerate.missedRate || 0,
            'Accelerate Count': result.byAdviceType.accelerate.total || 0,
            'Accelerate Missed': result.byAdviceType.accelerate.missed || 0,
            'Cruise Count': result.byAdviceType.cruise.total || 0,
            'Cruise Missed': result.byAdviceType.cruise.missed || 0,
            'Decelerate Count': result.byAdviceType.decelerate.total || 0,
            'Decelerate Missed': result.byAdviceType.decelerate.missed || 0
        }));
    }, [chartData]);

    // Calculate overall statistics
    const overallStats = useMemo(() => {
        let totalOpportunities = 0;
        let totalMissed = 0;
        let adviceTypeCounts = {
            accelerate: { total: 0, missed: 0 },
            cruise: { total: 0, missed: 0 },
            decelerate: { total: 0, missed: 0 }
        };

        analysisResults.forEach(result => {
            totalOpportunities += result.totalOpportunities;
            totalMissed += result.missedOpportunities;

            Object.entries(result.byAdviceType).forEach(([adviceType, stats]) => {
                adviceTypeCounts[adviceType].total += stats.total;
                adviceTypeCounts[adviceType].missed += stats.missed;
            });
        });

        const missedRate = totalOpportunities > 0 ? (totalMissed / totalOpportunities) * 100 : 0;

        // Calculate rates by advice type
        Object.keys(adviceTypeCounts).forEach(adviceType => {
            const stats = adviceTypeCounts[adviceType];
            stats.missedRate = stats.total > 0 ? (stats.missed / stats.total) * 100 : 0;
        });

        return {
            totalOpportunities,
            totalMissed,
            missedRate,
            adviceTypeCounts
        };
    }, [analysisResults]);

    // Prepare summary data for pie chart
    const summaryPieData = useMemo(() => [
        { name: "Utilized Opportunities", value: overallStats.totalOpportunities - overallStats.totalMissed, color: "#22c55e" },
        { name: "Missed Opportunities", value: overallStats.totalMissed, color: "#ef4444" }
    ], [overallStats]);

    // Prepare advice type summary data for chart
    const adviceTypeSummaryData = useMemo(() => [
        {
            name: "Accelerate",
            missed: overallStats.adviceTypeCounts.accelerate.missed,
            utilized: overallStats.adviceTypeCounts.accelerate.total - overallStats.adviceTypeCounts.accelerate.missed,
            missedRate: overallStats.adviceTypeCounts.accelerate.missedRate,
            color: "#22c55e"
        },
        {
            name: "Cruise",
            missed: overallStats.adviceTypeCounts.cruise.missed,
            utilized: overallStats.adviceTypeCounts.cruise.total - overallStats.adviceTypeCounts.cruise.missed,
            missedRate: overallStats.adviceTypeCounts.cruise.missedRate,
            color: "#3b82f6"
        },
        {
            name: "Decelerate",
            missed: overallStats.adviceTypeCounts.decelerate.missed,
            utilized: overallStats.adviceTypeCounts.decelerate.total - overallStats.adviceTypeCounts.decelerate.missed,
            missedRate: overallStats.adviceTypeCounts.decelerate.missedRate,
            color: "#ef4444"
        }
    ], [overallStats]);

    // Custom tooltip for the chart
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div style={{
                    backgroundColor: 'white',
                    padding: '10px',
                    border: '1px solid #ccc',
                    borderRadius: '4px'
                }}>
                    <p style={{ fontWeight: 'bold', margin: '0 0 5px 0' }}>{label}</p>
                    <p style={{ margin: '0 0 3px 0' }}>
                        Missed Rate: {data.missedRate.toFixed(1)}%
                    </p>
                    <p style={{ margin: '0 0 3px 0' }}>
                        Total Opportunities: {data.totalOpportunities}
                    </p>
                    <p style={{ margin: '0 0 3px 0' }}>
                        Missed Opportunities: {data.missedOpportunities}
                    </p>
                    <p style={{ margin: '0 0 3px 0', color: '#22c55e' }}>
                        Accelerate: {data.byAdviceType.accelerate.missed}/{data.byAdviceType.accelerate.total}
                        {data.byAdviceType.accelerate.total > 0 ?
                            ` (${(data.byAdviceType.accelerate.missed / data.byAdviceType.accelerate.total * 100).toFixed(1)}%)` : ''}
                    </p>
                    <p style={{ margin: '0 0 3px 0', color: '#3b82f6' }}>
                        Cruise: {data.byAdviceType.cruise.missed}/{data.byAdviceType.cruise.total}
                        {data.byAdviceType.cruise.total > 0 ?
                            ` (${(data.byAdviceType.cruise.missed / data.byAdviceType.cruise.total * 100).toFixed(1)}%)` : ''}
                    </p>
                    <p style={{ margin: '0 0 3px 0', color: '#ef4444' }}>
                        Decelerate: {data.byAdviceType.decelerate.missed}/{data.byAdviceType.decelerate.total}
                        {data.byAdviceType.decelerate.total > 0 ?
                            ` (${(data.byAdviceType.decelerate.missed / data.byAdviceType.decelerate.total * 100).toFixed(1)}%)` : ''}
                    </p>
                </div>
            );
        }
        return null;
    };

    // Advice type tooltip
    const AdviceTypeTooltip = ({ active, payload, label }) => {
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
                            color: entry.color,
                            display: 'flex',
                            justifyContent: 'space-between',
                            width: '220px'
                        }}>
                            <span>{entry.name}:</span>
                            <span>{entry.value.toFixed(1)}%</span>
                        </p>
                    ))}
                    <div style={{ borderTop: '1px solid #eee', marginTop: '5px', paddingTop: '5px' }}>
                        <p style={{ margin: '0 0 3px 0', fontSize: '12px' }}>
                            Missed/Total:
                        </p>
                        {showAccelerate && (
                            <p style={{ margin: '0 0 3px 0', fontSize: '12px', color: '#22c55e' }}>
                                Accelerate: {payload[0].payload['Accelerate Missed']}/{payload[0].payload['Accelerate Count']}
                            </p>
                        )}
                        {showCruise && (
                            <p style={{ margin: '0 0 3px 0', fontSize: '12px', color: '#3b82f6' }}>
                                Cruise: {payload[0].payload['Cruise Missed']}/{payload[0].payload['Cruise Count']}
                            </p>
                        )}
                        {showDecelerate && (
                            <p style={{ margin: '0 0 3px 0', fontSize: '12px', color: '#ef4444' }}>
                                Decelerate: {payload[0].payload['Decelerate Missed']}/{payload[0].payload['Decelerate Count']}
                            </p>
                        )}
                    </div>
                </div>
            );
        }
        return null;
    };

    // Custom tooltip for summary pie chart
    const SummaryPieTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            return (
                <div style={{
                    backgroundColor: 'white',
                    padding: '10px',
                    border: '1px solid #ccc',
                    borderRadius: '4px'
                }}>
                    <p style={{ fontWeight: 'bold', margin: '0 0 5px 0', color: payload[0].payload.color }}>
                        {payload[0].name}
                    </p>
                    <p style={{ margin: '0 0 3px 0' }}>
                        Count: {payload[0].value}
                    </p>
                    <p style={{ margin: '0 0 3px 0' }}>
                        Percentage: {((payload[0].value / summaryPieData.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1)}%
                    </p>
                </div>
            );
        }
        return null;
    };

    // Toast-style tooltip for the stacked bar chart
    const StackedBarTooltip = ({ active, payload, label }) => {
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
                            {entry.name}: {entry.value}
                        </p>
                    ))}
                    <div style={{ borderTop: '1px solid #eee', marginTop: '5px', paddingTop: '5px' }}>
                        <p style={{ margin: '0 0 3px 0', fontWeight: '500' }}>
                            Total: {payload.reduce((sum, entry) => sum + entry.value, 0)}
                        </p>
                        <p style={{ margin: '0 0 3px 0', fontWeight: '500' }}>
                            Missed Rate: {payload[0].payload.missedRate.toFixed(1)}%
                        </p>
                    </div>
                </div>
            );
        }
        return null;
    };

    // Handle interval size change
    const handleIntervalSizeChange = (e) => {
        const value = parseInt(e.target.value, 10);
        if (!isNaN(value) && value > 0) {
            setIntervalSize(value);
        }
    };

    // Handle tolerance change
    const handleToleranceChange = (e) => {
        const value = parseInt(e.target.value, 10);
        if (!isNaN(value) && value >= 0) {
            setTolerance(value);
        }
    };

    // Handle X-axis interval change
    const handleXAxisIntervalChange = (e) => {
        const value = parseInt(e.target.value, 10);
        if (!isNaN(value) && value > 0) {
            setXAxisInterval(value);
        }
    };

    // Handle min distance change
    const handleMinDistanceChange = (e) => {
        const value = parseInt(e.target.value, 10);
        if (!isNaN(value) && value >= 0 && value < maxDistance) {
            setMinDistance(value);
        }
    };

    // Handle max distance change
    const handleMaxDistanceChange = (e) => {
        const value = parseInt(e.target.value, 10);
        if (!isNaN(value) && value > minDistance) {
            setMaxDistance(value);
        }
    };

    // Toggle button style generator
    const getToggleButtonStyle = (isActive) => ({
        padding: '4px 8px',
        backgroundColor: isActive ? '#f0f9ff' : '#f3f4f6',
        color: isActive ? '#3b82f6' : '#6b7280',
        border: `1px solid ${isActive ? '#93c5fd' : '#d1d5db'}`,
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: isActive ? '600' : '400',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '4px'
    });

    return (
        <div style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
                GLOSA Missed Opportunities Analysis
            </h3>

            {/* Configuration Controls */}
            <div style={{
                backgroundColor: 'white',
                padding: '16px',
                borderRadius: '8px',
                marginBottom: '16px'
            }}>
                <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Analysis Parameters</h4>

                <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '16px',
                    alignItems: 'center'
                }}>
                    {/* Interval Size */}
                    <div>
                        <label htmlFor="interval-size" style={{ display: 'block', fontSize: '14px', marginBottom: '4px', fontWeight: '500' }}>
                            Distance Interval (m):
                        </label>
                        <input
                            id="interval-size"
                            type="number"
                            min="1"
                            max="50"
                            value={intervalSize}
                            onChange={handleIntervalSizeChange}
                            style={{
                                width: '70px',
                                padding: '6px 8px',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px',
                                fontSize: '14px'
                            }}
                        />
                    </div>

                    {/* Min Distance */}
                    <div>
                        <label htmlFor="min-distance" style={{ display: 'block', fontSize: '14px', marginBottom: '4px', fontWeight: '500' }}>
                            Min Distance (m):
                        </label>
                        <input
                            id="min-distance"
                            type="number"
                            min="0"
                            max={maxDistance - 1}
                            value={minDistance}
                            onChange={handleMinDistanceChange}
                            style={{
                                width: '70px',
                                padding: '6px 8px',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px',
                                fontSize: '14px'
                            }}
                        />
                    </div>

                    {/* Max Distance */}
                    <div>
                        <label htmlFor="max-distance" style={{ display: 'block', fontSize: '14px', marginBottom: '4px', fontWeight: '500' }}>
                            Max Distance (m):
                        </label>
                        <input
                            id="max-distance"
                            type="number"
                            min={minDistance + 1}
                            max="1000"
                            value={maxDistance}
                            onChange={handleMaxDistanceChange}
                            style={{
                                width: '70px',
                                padding: '6px 8px',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px',
                                fontSize: '14px'
                            }}
                        />
                    </div>

                    {/* Tolerance */}
                    <div>
                        <label htmlFor="tolerance" style={{ display: 'block', fontSize: '14px', marginBottom: '4px', fontWeight: '500' }}>
                            Green Phase Tolerance (±s):
                        </label>
                        <input
                            id="tolerance"
                            type="number"
                            min="0"
                            max="10"
                            value={tolerance}
                            onChange={handleToleranceChange}
                            style={{
                                width: '70px',
                                padding: '6px 8px',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px',
                                fontSize: '14px'
                            }}
                        />
                    </div>

                    {/* X-Axis Interval */}
                    <div>
                        <label htmlFor="x-axis-interval" style={{ display: 'block', fontSize: '14px', marginBottom: '4px', fontWeight: '500' }}>
                            X-Axis Label Interval:
                        </label>
                        <input
                            id="x-axis-interval"
                            type="number"
                            min="1"
                            max="10"
                            value={xAxisInterval}
                            onChange={handleXAxisIntervalChange}
                            style={{
                                width: '70px',
                                padding: '6px 8px',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px',
                                fontSize: '14px'
                            }}
                        />
                    </div>
                </div>

                <p style={{
                    fontSize: '13px',
                    color: '#6b7280',
                    fontStyle: 'italic',
                    marginTop: '12px'
                }}>
                    Changes will recalculate analysis with new parameters. Waiting threshold after predicted arrival: {WAITING_THRESHOLD_SECONDS} seconds.
                    {absoluteMaxDistance > 0 && ` Data contains distances up to ${Math.ceil(absoluteMaxDistance)}m.`}
                </p>
            </div>

            {/* Summary Section with Pie Chart */}
            <div style={{
                backgroundColor: 'white',
                padding: '16px',
                borderRadius: '8px',
                marginBottom: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
            }}>
                <h4 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>
                    Overall Missed Opportunities Summary
                </h4>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                    gap: '24px'
                }}>
                    {/* Stats Column */}
                    <div>
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px'
                        }}>
                            <div>
                                <div style={{ fontSize: '14px', fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}>
                                    Missed Opportunity Rate
                                </div>
                                <div style={{
                                    fontSize: '28px',
                                    fontWeight: '600',
                                    color: overallStats.missedRate > 30 ? '#dc2626' :
                                        overallStats.missedRate > 15 ? '#ca8a04' : '#22c55e'
                                }}>
                                    {overallStats.missedRate.toFixed(1)}%
                                </div>
                                <div style={{ fontSize: '14px', color: '#6b7280' }}>
                                    {overallStats.totalMissed} of {overallStats.totalOpportunities} opportunities missed
                                </div>
                            </div>

                            <div style={{ marginTop: '8px' }}>
                                <div style={{ fontSize: '14px', fontWeight: '500', color: '#6b7280', marginBottom: '4px' }}>
                                    By Advice Type
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <div>
                                        <span style={{ color: '#22c55e', fontWeight: '500' }}>Accelerate:</span>{' '}
                                        {overallStats.adviceTypeCounts.accelerate.missedRate.toFixed(1)}%
                                        <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: '4px' }}>
                                            ({overallStats.adviceTypeCounts.accelerate.missed}/{overallStats.adviceTypeCounts.accelerate.total})
                                        </span>
                                    </div>
                                    <div>
                                        <span style={{ color: '#3b82f6', fontWeight: '500' }}>Cruise:</span>{' '}
                                        {overallStats.adviceTypeCounts.cruise.missedRate.toFixed(1)}%
                                        <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: '4px' }}>
                                            ({overallStats.adviceTypeCounts.cruise.missed}/{overallStats.adviceTypeCounts.cruise.total})
                                        </span>
                                    </div>
                                    <div>
                                        <span style={{ color: '#ef4444', fontWeight: '500' }}>Decelerate:</span>{' '}
                                        {overallStats.adviceTypeCounts.decelerate.missedRate.toFixed(1)}%
                                        <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: '4px' }}>
                                            ({overallStats.adviceTypeCounts.decelerate.missed}/{overallStats.adviceTypeCounts.decelerate.total})
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Pie Chart Column */}
                    <div style={{ height: '250px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={summaryPieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={90}
                                    paddingAngle={2}
                                    dataKey="value"
                                >
                                    {summaryPieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip content={<SummaryPieTooltip />} />
                                <Legend verticalAlign="bottom" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Stacked Bar Chart for Advice Types */}
                    <div style={{ height: '250px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={adviceTypeSummaryData}
                                layout="vertical"
                                margin={{ top: 20, right: 30, left: 80, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    tick={{ fill: (entry) => {
                                            switch(entry) {
                                                case 'Accelerate': return '#22c55e';
                                                case 'Cruise': return '#3b82f6';
                                                case 'Decelerate': return '#ef4444';
                                                default: return '#000000';
                                            }
                                        }, fontWeight: '500' }}
                                />
                                <Tooltip content={<StackedBarTooltip />} />
                                <Legend />
                                <Bar dataKey="missed" stackId="a" fill="#ef4444" name="Missed" />
                                <Bar dataKey="utilized" stackId="a" fill="#22c55e" name="Utilized" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Visualization Toggle */}
            <div style={{ marginBottom: '16px', display: 'flex', gap: '16px' }}>
                <button
                    onClick={() => setVisualizationType('missed-opportunities')}
                    style={{
                        padding: '8px 16px',
                        backgroundColor: visualizationType === 'missed-opportunities' ? '#3b82f6' : '#f3f4f6',
                        color: visualizationType === 'missed-opportunities' ? 'white' : '#374151',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: '500',
                        cursor: 'pointer'
                    }}
                >
                    Overall Missed Rate
                </button>
                <button
                    onClick={() => setVisualizationType('advice-type')}
                    style={{
                        padding: '8px 16px',
                        backgroundColor: visualizationType === 'advice-type' ? '#3b82f6' : '#f3f4f6',
                        color: visualizationType === 'advice-type' ? 'white' : '#374151',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: '500',
                        cursor: 'pointer'
                    }}
                >
                    By Advice Type
                </button>
            </div>

            {/* Advice Type Toggles - Only show when advice-type visualization is selected */}
            {visualizationType === 'advice-type' && (
                <div style={{
                    marginBottom: '16px',
                    display: 'flex',
                    gap: '8px',
                    flexWrap: 'wrap',
                    backgroundColor: 'white',
                    padding: '12px',
                    borderRadius: '6px'
                }}>
                    <span style={{ fontSize: '14px', fontWeight: '500', marginRight: '4px' }}>Show:</span>
                    <button
                        onClick={() => setShowAccelerate(!showAccelerate)}
                        style={getToggleButtonStyle(showAccelerate)}
                    >
                        <div style={{
                            width: '10px',
                            height: '10px',
                            backgroundColor: '#22c55e',
                            borderRadius: '50%'
                        }}></div>
                        Accelerate
                    </button>
                    <button
                        onClick={() => setShowCruise(!showCruise)}
                        style={getToggleButtonStyle(showCruise)}
                    >
                        <div style={{
                            width: '10px',
                            height: '10px',
                            backgroundColor: '#3b82f6',
                            borderRadius: '50%'
                        }}></div>
                        Cruise
                    </button>
                    <button
                        onClick={() => setShowDecelerate(!showDecelerate)}
                        style={getToggleButtonStyle(showDecelerate)}
                    >
                        <div style={{
                            width: '10px',
                            height: '10px',
                            backgroundColor: '#ef4444',
                            borderRadius: '50%'
                        }}></div>
                        Decelerate
                    </button>
                </div>
            )}

            {/* Chart Visualization */}
            <div style={{
                height: '500px',
                backgroundColor: 'white',
                padding: '16px',
                borderRadius: '8px',
                marginBottom: '16px'
            }}>
                <ResponsiveContainer width="100%" height="100%">
                    {visualizationType === 'missed-opportunities' ? (
                        <BarChart
                            data={chartData}
                            margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                dataKey="interval"
                                angle={-45}
                                textAnchor="end"
                                height={70}
                                interval={xAxisInterval - 1} // Convert to 0-based index
                                label={{ value: 'Distance from Intersection (m)', position: 'insideBottom', offset: -5 }}
                            />
                            <YAxis
                                label={{ value: 'Missed Opportunity Rate (%)', angle: -90, position: 'insideLeft' }}
                                domain={[0, 100]}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            <ReferenceLine y={30} stroke="#dc2626" strokeDasharray="3 3" />
                            <ReferenceLine y={15} stroke="#ca8a04" strokeDasharray="3 3" />
                            <Bar
                                dataKey="missedRate"
                                name="Missed Opportunity Rate"
                                fill="#3b82f6"
                                shape={(props) => {
                                    // Color based on missed rate - inverse of success rate coloring
                                    const fill = props.payload.missedRate > 30 ? '#dc2626' :
                                        props.payload.missedRate > 15 ? '#ca8a04' : '#22c55e';
                                    return (
                                        <rect
                                            x={props.x}
                                            y={props.y}
                                            width={props.width}
                                            height={props.height}
                                            fill={fill}
                                            stroke="none"
                                        />
                                    );
                                }}
                            />
                        </BarChart>
                    ) : (
                        <LineChart
                            data={adviceTypeData}
                            margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                dataKey="interval"
                                angle={-45}
                                textAnchor="end"
                                height={70}
                                interval={xAxisInterval - 1} // Convert to 0-based index
                                label={{ value: 'Distance from Intersection (m)', position: 'insideBottom', offset: -5 }}
                            />
                            <YAxis
                                label={{ value: 'Missed Rate (%)', angle: -90, position: 'insideLeft' }}
                                domain={[0, 100]}
                            />
                            <Tooltip content={<AdviceTypeTooltip />} />
                            <Legend />
                            <ReferenceLine y={30} stroke="#dc2626" strokeDasharray="3 3" />
                            <ReferenceLine y={15} stroke="#ca8a04" strokeDasharray="3 3" />

                            {/* Only show selected advice types */}
                            {showAccelerate && (
                                <Line
                                    type="monotone"
                                    dataKey="Accelerate Missed Rate"
                                    stroke="#22c55e"
                                    strokeWidth={2}
                                    dot={{ r: 4 }}
                                    activeDot={{ r: 6 }}
                                    name="Accelerate"
                                />
                            )}

                            {showCruise && (
                                <Line
                                    type="monotone"
                                    dataKey="Cruise Missed Rate"
                                    stroke="#3b82f6"
                                    strokeWidth={2}
                                    dot={{ r: 4 }}
                                    activeDot={{ r: 6 }}
                                    name="Cruise"
                                />
                            )}

                            {showDecelerate && (
                                <Line
                                    type="monotone"
                                    dataKey="Decelerate Missed Rate"
                                    stroke="#ef4444"
                                    strokeWidth={2}
                                    dot={{ r: 4 }}
                                    activeDot={{ r: 6 }}
                                    name="Decelerate"
                                />
                            )}
                        </LineChart>
                    )}
                </ResponsiveContainer>
            </div>

            {/* Analysis Explanation */}
            <div style={{ backgroundColor: 'white', padding: '16px', borderRadius: '8px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                    How This Analysis Works
                </h4>
                <p style={{ fontSize: '14px', color: '#374151', marginBottom: '12px' }}>
                    This analysis identifies missed opportunities where following GLOSA advice would have led to a better outcome:
                </p>
                <ol style={{ paddingLeft: '20px', fontSize: '14px', color: '#374151' }}>
                    <li style={{ marginBottom: '8px' }}>
                        Analyzing data between {minDistance}m and {Math.min(maxDistance, absoluteMaxDistance)}m from the intersection, in {intervalSize}m intervals
                    </li>
                    <li style={{ marginBottom: '8px' }}>
                        Finding situations where the GLOSA advice would have led to arriving during a green light
                    </li>
                    <li style={{ marginBottom: '8px' }}>
                        Checking if the driver was still waiting at the intersection {WAITING_THRESHOLD_SECONDS} seconds after
                        the predicted arrival time (indicating they missed the green opportunity)
                    </li>
                    <li style={{ marginBottom: '8px' }}>
                        Calculating the "missed opportunity rate" - percentage of potentially beneficial GLOSA advice that wasn't utilized
                    </li>
                </ol>
                <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '12px', fontStyle: 'italic' }}>
                    Lower missed opportunity rates are better, indicating drivers are already optimizing their approach to intersections.
                    Higher rates suggest GLOSA could provide significant value by helping drivers time their approach better to avoid unnecessary stops.
                </p>
            </div>
        </div>
    );
};

export default GlosaMissedOpportunitiesAnalysis;