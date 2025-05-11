// src/components/GLOSA/GlosaAdviceSimulationAnalysis.jsx
// This component analyzes GLOSA advice reliability by simulating vehicle behavior
// It evaluates how often following GLOSA advice leads to a green light at various distances
import React, { useState, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    LineChart, Line, ReferenceLine
} from 'recharts';

// Constants matching the recalculation script
const ACCELERATION_FACTOR_TRAM = 1.3; // m/s²
const MIN_ALLOWED_SPEED_TRAM = 8 / 3.6; // m/s (8 km/h)
const MAX_ALLOWED_SPEED = 50 / 3.6; // m/s (50 km/h)

const GlosaAdviceSimulationAnalysis = ({ intersections }) => {
    // State for visualization toggle
    const [visualizationType, setVisualizationType] = useState('success-rate');

    // Configurable parameters with defaults
    const [intervalSize, setIntervalSize] = useState(10); // Default 10m intervals
    const [tolerance, setTolerance] = useState(2); // Default ±2s tolerance
    const [xAxisInterval, setXAxisInterval] = useState(1); // Show every nth label

    // Calculate a good default for xAxisInterval based on data range
    const calculateDefaultXAxisInterval = (maxDistance) => {
        const totalIntervals = Math.ceil(maxDistance / intervalSize);
        // Use a heuristic: if more than 20 intervals, show every nth label where n = ceil(totalIntervals/15)
        if (totalIntervals > 20) {
            return Math.ceil(totalIntervals / 15);
        }
        return 1; // Show all labels if few intervals
    };

    // Distance intervals to analyze (in meters)
    const distanceIntervals = useMemo(() => {
        // Create intervals from 0 to max distance found in data, in steps of intervalSize
        let maxDistance = 0;

        // Find maximum distance in the data
        Object.values(intersections).forEach(intersection => {
            (intersection.passThroughs || []).forEach(pass => {
                Object.values(pass.signalGroups || {}).forEach(sg => {
                    (sg.metrics || []).forEach(metric => {
                        if (metric.distance > maxDistance) {
                            maxDistance = metric.distance;
                        }
                    });
                });
            });
        });

        // Round up to nearest interval
        const maxIntervalEnd = Math.ceil(maxDistance / intervalSize) * intervalSize;

        // Set a good default for X-axis interval based on the data range
        const defaultInterval = calculateDefaultXAxisInterval(maxDistance);
        setXAxisInterval(defaultInterval);

        // Create array of intervals
        const intervals = [];
        for (let i = 0; i < maxIntervalEnd; i += intervalSize) {
            intervals.push({
                min: i,
                max: i + intervalSize,
                label: `${i}-${i + intervalSize}m`
            });
        }

        return intervals;
    }, [intersections, intervalSize]);

    // Analyze GLOSA advice reliability in each interval
    const analysisResults = useMemo(() => {
        const results = distanceIntervals.map(interval => {
            // Stats for this interval
            const stats = {
                interval: interval.label,
                min: interval.min,
                max: interval.max,
                totalAdvice: 0,
                successfulAdvice: 0,
                byAdviceType: {
                    accelerate: { total: 0, success: 0 },
                    cruise: { total: 0, success: 0 },
                    decelerate: { total: 0, success: 0 }
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

                        stats.totalAdvice++;
                        stats.byAdviceType[advice].total++;

                        // Simulate following the advice
                        const travelDuration = simulateTravel(
                            distance,
                            currentSpeed,
                            advisedSpeed
                        );

                        // Calculate arrival time
                        const arrivalTime = new Date(timestamp.getTime() + (travelDuration * 1000));

                        // Check if arrival would be during a green phase using the configurable tolerance
                        const wouldArriveOnGreen = checkGreenPhaseAtArrival(
                            sg,
                            arrivalTime,
                            tolerance // Using the configurable tolerance value
                        );

                        if (wouldArriveOnGreen) {
                            stats.successfulAdvice++;
                            stats.byAdviceType[advice].success++;
                        }
                    });
                });
            });

            // Calculate success rates
            if (stats.totalAdvice > 0) {
                stats.successRate = (stats.successfulAdvice / stats.totalAdvice) * 100;

                // Calculate success rates by advice type
                Object.keys(stats.byAdviceType).forEach(adviceType => {
                    const typeStats = stats.byAdviceType[adviceType];
                    if (typeStats.total > 0) {
                        typeStats.successRate = (typeStats.success / typeStats.total) * 100;
                    } else {
                        typeStats.successRate = 0;
                    }
                });
            } else {
                stats.successRate = 0;
            }

            return stats;
        });

        return results;
    }, [intersections, distanceIntervals, tolerance]);

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

    // Check if there would be a green phase at the arrival time
    function checkGreenPhaseAtArrival(signalGroup, arrivalTime, toleranceSeconds) {
        // Define arrival window (accounting for tolerance)
        const arrivalEarly = new Date(arrivalTime.getTime() - (toleranceSeconds * 1000));
        const arrivalLate = new Date(arrivalTime.getTime() + (toleranceSeconds * 1000));


        // Filter metrics to find those within the arrival window
        const relevantMetrics = signalGroup.metrics.filter(metric => {
            return metric.timestamp >= arrivalEarly && metric.timestamp <= arrivalLate;
        });

        // go over all metrics and check if any of them is green
        for (const metric of relevantMetrics) {
            // current green phase (greenStartTime = 0)
            if (metric.greenStartTime === 0 && metric.greenEndTime > 0) {
                return true;
            }
        }
        return false; // No green phase found for arrival time
    }

    // Prepare data for visualization
    const chartData = useMemo(() => {
        return analysisResults.filter(result => result.totalAdvice > 0);
    }, [analysisResults]);

    // Prepare data for advice type breakdown
    const adviceTypeData = useMemo(() => {
        return chartData.map(result => ({
            interval: result.interval,
            min: result.min,
            'Accelerate Success Rate': result.byAdviceType.accelerate.successRate || 0,
            'Cruise Success Rate': result.byAdviceType.cruise.successRate || 0,
            'Decelerate Success Rate': result.byAdviceType.decelerate.successRate || 0,
            'Accelerate Count': result.byAdviceType.accelerate.total || 0,
            'Cruise Count': result.byAdviceType.cruise.total || 0,
            'Decelerate Count': result.byAdviceType.decelerate.total || 0
        }));
    }, [chartData]);

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
                        Success Rate: {data.successRate.toFixed(1)}%
                    </p>
                    <p style={{ margin: '0 0 3px 0' }}>
                        Total Advice: {data.totalAdvice}
                    </p>
                    <p style={{ margin: '0 0 3px 0' }}>
                        Successful: {data.successfulAdvice}
                    </p>
                    <p style={{ margin: '0 0 3px 0', color: '#22c55e' }}>
                        Accelerate: {data.byAdviceType.accelerate.success}/{data.byAdviceType.accelerate.total}
                        {data.byAdviceType.accelerate.total > 0 ?
                            ` (${(data.byAdviceType.accelerate.success / data.byAdviceType.accelerate.total * 100).toFixed(1)}%)` : ''}
                    </p>
                    <p style={{ margin: '0 0 3px 0', color: '#3b82f6' }}>
                        Cruise: {data.byAdviceType.cruise.success}/{data.byAdviceType.cruise.total}
                        {data.byAdviceType.cruise.total > 0 ?
                            ` (${(data.byAdviceType.cruise.success / data.byAdviceType.cruise.total * 100).toFixed(1)}%)` : ''}
                    </p>
                    <p style={{ margin: '0 0 3px 0', color: '#ef4444' }}>
                        Decelerate: {data.byAdviceType.decelerate.success}/{data.byAdviceType.decelerate.total}
                        {data.byAdviceType.decelerate.total > 0 ?
                            ` (${(data.byAdviceType.decelerate.success / data.byAdviceType.decelerate.total * 100).toFixed(1)}%)` : ''}
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
                            Sample Counts:
                        </p>
                        <p style={{ margin: '0 0 3px 0', fontSize: '12px', color: '#22c55e' }}>
                            Accelerate: {payload[0].payload['Accelerate Count']}
                        </p>
                        <p style={{ margin: '0 0 3px 0', fontSize: '12px', color: '#3b82f6' }}>
                            Cruise: {payload[0].payload['Cruise Count']}
                        </p>
                        <p style={{ margin: '0 0 3px 0', fontSize: '12px', color: '#ef4444' }}>
                            Decelerate: {payload[0].payload['Decelerate Count']}
                        </p>
                    </div>
                </div>
            );
        }
        return null;
    };

    // Calculate overall statistics
    const overallStats = useMemo(() => {
        let totalAdvice = 0;
        let totalSuccess = 0;
        let adviceTypeCounts = {
            accelerate: { total: 0, success: 0 },
            cruise: { total: 0, success: 0 },
            decelerate: { total: 0, success: 0 }
        };

        analysisResults.forEach(result => {
            totalAdvice += result.totalAdvice;
            totalSuccess += result.successfulAdvice;

            Object.entries(result.byAdviceType).forEach(([adviceType, stats]) => {
                adviceTypeCounts[adviceType].total += stats.total;
                adviceTypeCounts[adviceType].success += stats.success;
            });
        });

        const successRate = totalAdvice > 0 ? (totalSuccess / totalAdvice) * 100 : 0;

        // Calculate success rates by advice type
        Object.keys(adviceTypeCounts).forEach(adviceType => {
            const stats = adviceTypeCounts[adviceType];
            stats.successRate = stats.total > 0 ? (stats.success / stats.total) * 100 : 0;
        });

        return {
            totalAdvice,
            totalSuccess,
            successRate,
            adviceTypeCounts
        };
    }, [analysisResults]);

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

    return (
        <div style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
                GLOSA Advice Reliability Analysis
            </h3>

            {/* Configuration Controls */}
            <div style={{
                backgroundColor: 'white',
                padding: '16px',
                borderRadius: '8px',
                marginBottom: '16px',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '16px',
                alignItems: 'center'
            }}>
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

                <div style={{ marginLeft: 'auto' }}>
                    <p style={{ fontSize: '13px', color: '#6b7280', fontStyle: 'italic' }}>
                        Changes will recalculate analysis with new parameters
                    </p>
                </div>
            </div>

            {/* Summary Stats Section */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                marginBottom: '24px',
                backgroundColor: 'white',
                padding: '16px',
                borderRadius: '8px'
            }}>
                <div>
                    <h4 style={{ fontSize: '14px', fontWeight: '500', color: '#6b7280', marginBottom: '8px' }}>
                        Overall Success Rate
                    </h4>
                    <p style={{
                        fontSize: '24px',
                        fontWeight: '600',
                        color: overallStats.successRate > 80 ? '#15803d' :
                            overallStats.successRate > 60 ? '#ca8a04' : '#dc2626'
                    }}>
                        {overallStats.successRate.toFixed(1)}%
                    </p>
                    <p style={{ fontSize: '14px', color: '#6b7280' }}>
                        {overallStats.totalSuccess} out of {overallStats.totalAdvice} advices
                    </p>
                </div>

                <div>
                    <h4 style={{ fontSize: '14px', fontWeight: '500', color: '#6b7280', marginBottom: '8px' }}>
                        By Advice Type
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div>
                            <span style={{ color: '#22c55e', fontWeight: '500' }}>Accelerate:</span>{' '}
                            {overallStats.adviceTypeCounts.accelerate.successRate.toFixed(1)}%
                            <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: '4px' }}>
                                ({overallStats.adviceTypeCounts.accelerate.success}/{overallStats.adviceTypeCounts.accelerate.total})
                            </span>
                        </div>
                        <div>
                            <span style={{ color: '#3b82f6', fontWeight: '500' }}>Cruise:</span>{' '}
                            {overallStats.adviceTypeCounts.cruise.successRate.toFixed(1)}%
                            <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: '4px' }}>
                                ({overallStats.adviceTypeCounts.cruise.success}/{overallStats.adviceTypeCounts.cruise.total})
                            </span>
                        </div>
                        <div>
                            <span style={{ color: '#ef4444', fontWeight: '500' }}>Decelerate:</span>{' '}
                            {overallStats.adviceTypeCounts.decelerate.successRate.toFixed(1)}%
                            <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: '4px' }}>
                                ({overallStats.adviceTypeCounts.decelerate.success}/{overallStats.adviceTypeCounts.decelerate.total})
                            </span>
                        </div>
                    </div>
                </div>

                <div>
                    <h4 style={{ fontSize: '14px', fontWeight: '500', color: '#6b7280', marginBottom: '8px' }}>
                        Analysis Parameters
                    </h4>
                    <p style={{ fontSize: '14px', color: '#6b7280' }}>
                        Distance Intervals: {intervalSize}m
                    </p>
                    <p style={{ fontSize: '14px', color: '#6b7280' }}>
                        Green Phase Tolerance: ±{tolerance} seconds
                    </p>
                    <p style={{ fontSize: '14px', color: '#6b7280' }}>
                        Acceleration Rate: {ACCELERATION_FACTOR_TRAM} m/s²
                    </p>
                </div>
            </div>

            {/* Visualization Toggle */}
            <div style={{ marginBottom: '16px', display: 'flex', gap: '16px' }}>
                <button
                    onClick={() => setVisualizationType('success-rate')}
                    style={{
                        padding: '8px 16px',
                        backgroundColor: visualizationType === 'success-rate' ? '#3b82f6' : '#f3f4f6',
                        color: visualizationType === 'success-rate' ? 'white' : '#374151',
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: '500',
                        cursor: 'pointer'
                    }}
                >
                    Overall Success Rate
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

            {/* Chart Visualization */}
            <div style={{
                height: '500px',
                backgroundColor: 'white',
                padding: '16px',
                borderRadius: '8px',
                marginBottom: '16px'
            }}>
                <ResponsiveContainer width="100%" height="100%">
                    {visualizationType === 'success-rate' ? (
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
                                label={{ value: 'Success Rate (%)', angle: -90, position: 'insideLeft' }}
                                domain={[0, 100]}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            <ReferenceLine y={80} stroke="#15803d" strokeDasharray="3 3" />
                            <ReferenceLine y={60} stroke="#ca8a04" strokeDasharray="3 3" />
                            <Bar
                                dataKey="successRate"
                                name="Success Rate"
                                fill="#3b82f6"
                                shape={(props) => {
                                    // Color based on success rate
                                    const fill = props.payload.successRate > 80 ? '#15803d' :
                                        props.payload.successRate > 60 ? '#ca8a04' : '#dc2626';
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
                                label={{ value: 'Success Rate (%)', angle: -90, position: 'insideLeft' }}
                                domain={[0, 100]}
                            />
                            <Tooltip content={<AdviceTypeTooltip />} />
                            <Legend />
                            <ReferenceLine y={80} stroke="#15803d" strokeDasharray="3 3" />
                            <ReferenceLine y={60} stroke="#ca8a04" strokeDasharray="3 3" />
                            <Line
                                type="monotone"
                                dataKey="Accelerate Success Rate"
                                stroke="#22c55e"
                                strokeWidth={2}
                                dot={{ r: 4 }}
                                activeDot={{ r: 6 }}
                                name="Accelerate"
                            />
                            <Line
                                type="monotone"
                                dataKey="Cruise Success Rate"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                dot={{ r: 4 }}
                                activeDot={{ r: 6 }}
                                name="Cruise"
                            />
                            <Line
                                type="monotone"
                                dataKey="Decelerate Success Rate"
                                stroke="#ef4444"
                                strokeWidth={2}
                                dot={{ r: 4 }}
                                activeDot={{ r: 6 }}
                                name="Decelerate"
                            />
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
                    This analysis evaluates the reliability of GLOSA advice at different distances from intersections by:
                </p>
                <ol style={{ paddingLeft: '20px', fontSize: '14px', color: '#374151' }}>
                    <li style={{ marginBottom: '8px' }}>
                        Dividing the approach into {intervalSize}m distance intervals
                    </li>
                    <li style={{ marginBottom: '8px' }}>
                        Finding the first useful advice (accelerate/cruise/decelerate) in each interval
                    </li>
                    <li style={{ marginBottom: '8px' }}>
                        Simulating vehicle behavior when following that advice, using the same acceleration/deceleration model as the GLOSA system
                    </li>
                    <li style={{ marginBottom: '8px' }}>
                        Calculating the expected arrival time at the intersection
                    </li>
                    <li style={{ marginBottom: '8px' }}>
                        Checking if that arrival time coincides with an actual green phase (±{tolerance} seconds tolerance)
                    </li>
                    <li>
                        Calculating success rate: percentage of advice that would successfully get the vehicle through a green light
                    </li>
                </ol>
                <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '12px', fontStyle: 'italic' }}>
                    Higher success rates indicate more reliable GLOSA advice at that distance. Rates above 80% are considered good (green),
                    60-80% are moderate (yellow), and below 60% are poor (red).
                </p>
            </div>
        </div>
    );
};

export default GlosaAdviceSimulationAnalysis;