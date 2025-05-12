// src/components/GLOSA/GreenChangeHistogram.jsx
import React, { useState, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    ScatterChart, Scatter, ZAxis
} from 'recharts';

const GreenChangeHistogram = ({ greenChangeMagnitudes }) => {
    // Format change type for display - moved to the top to avoid reference error
    const formatChangeType = (type) => {
        switch(type) {
            case 'earlierGreenStart': return 'Earlier Green Start';
            case 'extendedGreenEnd': return 'Extended Green End';
            case 'laterGreenStart': return 'Later Green Start';
            case 'shortenedGreenEnd': return 'Shortened Green End';
            default: return type;
        }
    };

    // Configuration state
    console.log("GreenChangeHistogram received data:",
        greenChangeMagnitudes ?
            Object.entries(greenChangeMagnitudes).map(([type, values]) =>
                `${type}: ${Array.isArray(values) ? values.length : 'not an array'} values`)
            : 'No data');

    // Define outlier threshold
    const OUTLIER_THRESHOLD = 60; // seconds

    // Configuration state
    const [binSize, setBinSize] = useState(5); // Default bin size of 5 seconds
    const [selectedChangeTypes, setSelectedChangeTypes] = useState({
        earlierGreenStart: true,
        extendedGreenEnd: true,
        laterGreenStart: true,
        shortenedGreenEnd: true
    });

    // Split data into regular values and outliers
    const { regularData, outlierData } = useMemo(() => {
        const regular = {
            earlierGreenStart: [],
            extendedGreenEnd: [],
            laterGreenStart: [],
            shortenedGreenEnd: []
        };

        const outliers = {
            earlierGreenStart: [],
            extendedGreenEnd: [],
            laterGreenStart: [],
            shortenedGreenEnd: []
        };

        // Split values based on outlier threshold
        Object.entries(greenChangeMagnitudes || {}).forEach(([type, values]) => {
            if (Array.isArray(values)) {
                values.forEach(value => {
                    if (value > OUTLIER_THRESHOLD) {
                        outliers[type].push(value);
                    } else {
                        regular[type].push(value);
                    }
                });
            }
        });

        return { regularData: regular, outlierData: outliers };
    }, [greenChangeMagnitudes]);

    // Get the max value across all regular change types for setting the chart range
    const maxValue = useMemo(() => {
        let max = 0;
        Object.entries(regularData || {}).forEach(([type, values]) => {
            if (Array.isArray(values) && values.length > 0) {
                const typeMax = Math.max(...values);
                if (typeMax > max) max = typeMax;
            }
        });
        return max;
    }, [regularData]);

    // Create histogram data for regular values
    const histogramData = useMemo(() => {
        if (!regularData) return [];

        // Debug: Log what we're actually working with
        console.log("Creating histogram with regular data:",
            Object.entries(regularData).map(([type, values]) =>
                `${type}: ${Array.isArray(values) ? values.length : 'not an array'} values`
            ).join(', '));

        // Determine the number of bins based on the max value and bin size
        // Cap at OUTLIER_THRESHOLD
        const maxBin = Math.min(Math.ceil(maxValue / binSize) * binSize, OUTLIER_THRESHOLD);
        const bins = [];

        // Create empty bins
        for (let i = 0; i <= maxBin; i += binSize) {
            bins.push({
                binStart: i,
                binEnd: i + binSize,
                binLabel: `${i}-${i + binSize}s`,
                earlierGreenStart: 0,
                extendedGreenEnd: 0,
                laterGreenStart: 0,
                shortenedGreenEnd: 0
            });
        }

        // Fill the bins with regular data
        Object.entries(regularData).forEach(([type, values]) => {
            if (Array.isArray(values) && values.length > 0) {
                console.log(`Processing ${values.length} regular values for ${type}`);
                values.forEach(value => {
                    // Find the appropriate bin
                    const binIndex = Math.floor(value / binSize);
                    if (binIndex >= 0 && binIndex < bins.length) {
                        bins[binIndex][type]++;
                    } else {
                        console.log(`Value ${value} for ${type} is outside regular bin range (0-${bins.length-1})`);
                    }
                });
            } else {
                console.log(`No valid regular values for ${type}`);
            }
        });

        // Filter out empty bins (where all types are 0)
        const nonEmptyBins = bins.filter(bin =>
            bin.earlierGreenStart > 0 ||
            bin.extendedGreenEnd > 0 ||
            bin.laterGreenStart > 0 ||
            bin.shortenedGreenEnd > 0
        );

        console.log(`Created ${nonEmptyBins.length} non-empty bins from ${bins.length} total bins`);
        return nonEmptyBins;
    }, [regularData, binSize, maxValue]);

    // Prepare outlier data for visualization
    const outlierChartData = useMemo(() => {
        const result = [];

        Object.entries(outlierData).forEach(([type, values]) => {
            if (Array.isArray(values) && values.length > 0) {
                values.forEach(value => {
                    result.push({
                        type,
                        value,
                        displayType: formatChangeType(type),
                        size: 10 // Size for scatter plot
                    });
                });
            }
        });

        // Sort by magnitude
        return result.sort((a, b) => a.value - b.value);
    }, [outlierData]);

    // Count outliers by type
    const outlierCounts = useMemo(() => {
        const counts = {
            earlierGreenStart: outlierData.earlierGreenStart.length,
            extendedGreenEnd: outlierData.extendedGreenEnd.length,
            laterGreenStart: outlierData.laterGreenStart.length,
            shortenedGreenEnd: outlierData.shortenedGreenEnd.length,
            total: 0
        };

        counts.total = counts.earlierGreenStart + counts.extendedGreenEnd +
            counts.laterGreenStart + counts.shortenedGreenEnd;

        return counts;
    }, [outlierData]);

    // Calculate summary statistics for all data (including outliers)
    const stats = useMemo(() => {
        const result = {
            earlierGreenStart: { count: 0, avg: 0, min: Infinity, max: 0 },
            extendedGreenEnd: { count: 0, avg: 0, min: Infinity, max: 0 },
            laterGreenStart: { count: 0, avg: 0, min: Infinity, max: 0 },
            shortenedGreenEnd: { count: 0, avg: 0, min: Infinity, max: 0 }
        };

        // Combine regular and outlier data for stats calculation
        Object.entries(greenChangeMagnitudes || {}).forEach(([type, values]) => {
            if (Array.isArray(values) && values.length > 0) {
                result[type].count = values.length;
                result[type].avg = values.reduce((sum, val) => sum + val, 0) / values.length;
                result[type].min = Math.min(...values);
                result[type].max = Math.max(...values);
            }
        });

        return result;
    }, [greenChangeMagnitudes]);

    // Handle change type selection toggle
    const toggleChangeType = (type) => {
        setSelectedChangeTypes(prev => ({
            ...prev,
            [type]: !prev[type]
        }));
    };

    // Handle bin size change
    const handleBinSizeChange = (e) => {
        const newSize = parseInt(e.target.value);
        if (!isNaN(newSize) && newSize > 0) {
            setBinSize(newSize);
        }
    };

    // Get background color for change type buttons
    const getButtonStyle = (type) => ({
        padding: '6px 12px',
        backgroundColor: selectedChangeTypes[type] ? getColor(type, 0.2) : '#f3f4f6',
        color: selectedChangeTypes[type] ? getColorDarker(type) : '#6b7280',
        border: `1px solid ${selectedChangeTypes[type] ? getColor(type) : '#d1d5db'}`,
        borderRadius: '6px',
        fontSize: '13px',
        fontWeight: selectedChangeTypes[type] ? '600' : '400',
        cursor: 'pointer',
        marginRight: '8px',
        marginBottom: '8px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px'
    });

    // Get color for change type
    const getColor = (type, opacity = 1) => {
        const colors = {
            earlierGreenStart: `rgba(34, 197, 94, ${opacity})`, // green
            extendedGreenEnd: `rgba(16, 185, 129, ${opacity})`, // emerald
            laterGreenStart: `rgba(239, 68, 68, ${opacity})`, // red
            shortenedGreenEnd: `rgba(220, 38, 38, ${opacity})` // dark red
        };
        return colors[type] || `rgba(107, 114, 128, ${opacity})`;
    };

    // Get darker color for text
    const getColorDarker = (type) => {
        const colors = {
            earlierGreenStart: '#166534', // dark green
            extendedGreenEnd: '#065f46', // dark emerald
            laterGreenStart: '#991b1b', // dark red
            shortenedGreenEnd: '#7f1d1d' // darker red
        };
        return colors[type] || '#374151';
    };

    // Custom tooltip for histogram
    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div style={{
                    backgroundColor: 'white',
                    padding: '10px',
                    border: '1px solid #ccc',
                    borderRadius: '6px',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                }}>
                    <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>{`${label} seconds change`}</p>
                    {payload.map((entry, index) => {
                        // Only display selected change types
                        if (selectedChangeTypes[entry.dataKey]) {
                            return (
                                <p key={index} style={{
                                    color: getColorDarker(entry.dataKey),
                                    margin: '3px 0',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    minWidth: '200px'
                                }}>
                                    <span>{formatChangeType(entry.dataKey)}:</span>
                                    <span style={{ fontWeight: '600' }}>{entry.value} changes</span>
                                </p>
                            );
                        }
                        return null;
                    })}
                </div>
            );
        }
        return null;
    };

    // Custom tooltip for outlier scatter chart
    const OutlierTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div style={{
                    backgroundColor: 'white',
                    padding: '10px',
                    border: '1px solid #ccc',
                    borderRadius: '6px',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                }}>
                    <p style={{ fontWeight: 'bold', marginBottom: '5px', color: getColorDarker(data.type) }}>
                        {data.displayType}
                    </p>
                    <p style={{ margin: '3px 0' }}>
                        Magnitude: <span style={{ fontWeight: '600' }}>{data.value.toFixed(1)} seconds</span>
                    </p>
                </div>
            );
        }
        return null;
    };

    // This function was moved to the top of the component to avoid reference errors

    // Function to calculate total changes (regular + outliers)
    const calculateTotalChanges = () => {
        let total = 0;
        Object.entries(greenChangeMagnitudes || {}).forEach(([type, values]) => {
            if (Array.isArray(values)) {
                total += values.length;
            }
        });
        return total;
    };

    // Get total number of changes
    const totalChanges = calculateTotalChanges();

    return (
        <div style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>
                Green Interval Change Magnitude Histogram
            </h3>

            {/* Configuration Controls */}
            <div style={{
                backgroundColor: 'white',
                padding: '16px',
                borderRadius: '8px',
                marginBottom: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
            }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                    <div>
                        <label htmlFor="bin-size" style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>
                            Bin Size (seconds):
                        </label>
                        <input
                            id="bin-size"
                            type="number"
                            value={binSize}
                            onChange={handleBinSizeChange}
                            min="1"
                            max="30"
                            style={{
                                width: '80px',
                                padding: '8px',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                fontSize: '14px'
                            }}
                        />
                    </div>

                    <div>
                        <span style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>
                            Total Changes: {totalChanges}
                        </span>
                        <div style={{ fontSize: '13px', color: '#6b7280' }}>
                            <span>Regular Changes: {totalChanges - outlierCounts.total}</span>
                            {outlierCounts.total > 0 && (
                                <span style={{ marginLeft: '8px', color: '#f59e0b', fontWeight: '500' }}>
                                    Outliers (&gt;{OUTLIER_THRESHOLD}s): {outlierCounts.total}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '6px' }}>
                        Change Types:
                    </label>
                    <div>
                        <button
                            style={getButtonStyle('earlierGreenStart')}
                            onClick={() => toggleChangeType('earlierGreenStart')}
                        >
                            <div style={{
                                width: '10px',
                                height: '10px',
                                backgroundColor: getColor('earlierGreenStart'),
                                borderRadius: '50%'
                            }}></div>
                            Earlier Green Start ({stats.earlierGreenStart.count})
                        </button>

                        <button
                            style={getButtonStyle('extendedGreenEnd')}
                            onClick={() => toggleChangeType('extendedGreenEnd')}
                        >
                            <div style={{
                                width: '10px',
                                height: '10px',
                                backgroundColor: getColor('extendedGreenEnd'),
                                borderRadius: '50%'
                            }}></div>
                            Extended Green End ({stats.extendedGreenEnd.count})
                        </button>

                        <button
                            style={getButtonStyle('laterGreenStart')}
                            onClick={() => toggleChangeType('laterGreenStart')}
                        >
                            <div style={{
                                width: '10px',
                                height: '10px',
                                backgroundColor: getColor('laterGreenStart'),
                                borderRadius: '50%'
                            }}></div>
                            Later Green Start ({stats.laterGreenStart.count})
                        </button>

                        <button
                            style={getButtonStyle('shortenedGreenEnd')}
                            onClick={() => toggleChangeType('shortenedGreenEnd')}
                        >
                            <div style={{
                                width: '10px',
                                height: '10px',
                                backgroundColor: getColor('shortenedGreenEnd'),
                                borderRadius: '50%'
                            }}></div>
                            Shortened Green End ({stats.shortenedGreenEnd.count})
                        </button>
                    </div>
                </div>
            </div>

            {/* Statistics Summary */}
            <div style={{
                backgroundColor: 'white',
                padding: '16px',
                borderRadius: '8px',
                marginBottom: '16px'
            }}>
                <h4 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '12px' }}>
                    Change Magnitude Statistics
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                    {Object.entries(stats).map(([type, data]) => (
                        data.count > 0 && selectedChangeTypes[type] ? (
                            <div
                                key={type}
                                style={{
                                    padding: '12px',
                                    borderRadius: '8px',
                                    backgroundColor: getColor(type, 0.1),
                                    border: `1px solid ${getColor(type, 0.3)}`
                                }}
                            >
                                <h5 style={{
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    marginBottom: '8px',
                                    color: getColorDarker(type)
                                }}>
                                    {formatChangeType(type)}
                                </h5>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <p style={{ fontSize: '13px', margin: 0 }}>
                                        <span style={{ fontWeight: '500' }}>Count:</span> {data.count}
                                        {outlierData[type].length > 0 && (
                                            <span style={{
                                                marginLeft: '8px',
                                                color: '#f59e0b',
                                                fontSize: '12px',
                                                fontWeight: '500'
                                            }}>
                                                (incl. {outlierData[type].length} outliers)
                                            </span>
                                        )}
                                    </p>
                                    <p style={{ fontSize: '13px', margin: 0 }}>
                                        <span style={{ fontWeight: '500' }}>Average:</span> {data.avg.toFixed(1)}s
                                    </p>
                                    <p style={{ fontSize: '13px', margin: 0 }}>
                                        <span style={{ fontWeight: '500' }}>Range:</span> {data.min.toFixed(1)}s - {data.max.toFixed(1)}s
                                    </p>
                                </div>
                            </div>
                        ) : null
                    ))}
                </div>
            </div>

            {/* Regular Histogram Chart */}
            {histogramData.length > 0 ? (
                <div style={{
                    backgroundColor: 'white',
                    padding: '16px',
                    borderRadius: '8px',
                    height: '400px',
                    marginBottom: outlierCounts.total > 0 ? '16px' : '0'
                }}>
                    <h4 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '12px' }}>
                        Regular Changes (≤ {OUTLIER_THRESHOLD} seconds)
                    </h4>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={histogramData}
                            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                dataKey="binLabel"
                                label={{
                                    value: 'Change Magnitude (seconds)',
                                    position: 'insideBottom',
                                    offset: -10
                                }}
                                angle={-45}
                                textAnchor="end"
                                height={80}
                            />
                            <YAxis
                                label={{
                                    value: 'Number of Changes',
                                    angle: -90,
                                    position: 'insideLeft'
                                }}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />

                            {/* Only render bars for selected change types */}
                            {selectedChangeTypes.earlierGreenStart && (
                                <Bar
                                    dataKey="earlierGreenStart"
                                    name="Earlier Green Start"
                                    fill={getColor('earlierGreenStart')}
                                    stackId="stack"
                                />
                            )}

                            {selectedChangeTypes.extendedGreenEnd && (
                                <Bar
                                    dataKey="extendedGreenEnd"
                                    name="Extended Green End"
                                    fill={getColor('extendedGreenEnd')}
                                    stackId="stack"
                                />
                            )}

                            {selectedChangeTypes.laterGreenStart && (
                                <Bar
                                    dataKey="laterGreenStart"
                                    name="Later Green Start"
                                    fill={getColor('laterGreenStart')}
                                    stackId="stack"
                                />
                            )}

                            {selectedChangeTypes.shortenedGreenEnd && (
                                <Bar
                                    dataKey="shortenedGreenEnd"
                                    name="Shortened Green End"
                                    fill={getColor('shortenedGreenEnd')}
                                    stackId="stack"
                                />
                            )}
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <div style={{
                    backgroundColor: 'white',
                    padding: '24px',
                    borderRadius: '8px',
                    textAlign: 'center',
                    marginBottom: outlierCounts.total > 0 ? '16px' : '0'
                }}>
                    <p style={{ color: '#6b7280' }}>
                        No regular green interval change data available.
                    </p>
                </div>
            )}

            {/* Outlier Visualization */}
            {outlierCounts.total > 0 && (
                <div style={{
                    backgroundColor: 'white',
                    padding: '16px',
                    borderRadius: '8px',
                }}>
                    <h4 style={{
                        fontSize: '15px',
                        fontWeight: '600',
                        marginBottom: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="#f59e0b" width="20" height="20">
                            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.515 2.625H3.72c-1.345 0-2.188-1.458-1.515-2.625l6.28-10.875zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                        </svg>
                        Outlier Changes (> {OUTLIER_THRESHOLD} seconds)
                    </h4>

                    {/* Outlier Chart */}
                    {outlierChartData.length > 0 ? (
                        <div style={{ height: '200px', marginBottom: '16px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <ScatterChart
                                    margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis
                                        type="number"
                                        dataKey="value"
                                        name="Magnitude"
                                        domain={['dataMin', 'dataMax']}
                                        label={{
                                            value: 'Change Magnitude (seconds)',
                                            position: 'insideBottom',
                                            offset: -10
                                        }}
                                    />
                                    <YAxis
                                        type="category"
                                        dataKey="displayType"
                                        name="Type"
                                        width={150}
                                    />
                                    <ZAxis type="number" dataKey="size" range={[50, 50]} />
                                    <Tooltip content={<OutlierTooltip />} />
                                    {selectedChangeTypes.earlierGreenStart && outlierData.earlierGreenStart.length > 0 && (
                                        <Scatter
                                            name="Earlier Green Start"
                                            data={outlierChartData.filter(d => d.type === 'earlierGreenStart')}
                                            fill={getColor('earlierGreenStart')}
                                        />
                                    )}
                                    {selectedChangeTypes.extendedGreenEnd && outlierData.extendedGreenEnd.length > 0 && (
                                        <Scatter
                                            name="Extended Green End"
                                            data={outlierChartData.filter(d => d.type === 'extendedGreenEnd')}
                                            fill={getColor('extendedGreenEnd')}
                                        />
                                    )}
                                    {selectedChangeTypes.laterGreenStart && outlierData.laterGreenStart.length > 0 && (
                                        <Scatter
                                            name="Later Green Start"
                                            data={outlierChartData.filter(d => d.type === 'laterGreenStart')}
                                            fill={getColor('laterGreenStart')}
                                        />
                                    )}
                                    {selectedChangeTypes.shortenedGreenEnd && outlierData.shortenedGreenEnd.length > 0 && (
                                        <Scatter
                                            name="Shortened Green End"
                                            data={outlierChartData.filter(d => d.type === 'shortenedGreenEnd')}
                                            fill={getColor('shortenedGreenEnd')}
                                        />
                                    )}
                                </ScatterChart>
                            </ResponsiveContainer>
                        </div>
                    ) : null}

                    {/* Outlier table */}
                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                            <tr style={{ backgroundColor: '#f3f4f6' }}>
                                <th style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Type</th>
                                <th style={{ padding: '8px 12px', textAlign: 'right', borderBottom: '1px solid #e5e7eb' }}>Magnitude (seconds)</th>
                            </tr>
                            </thead>
                            <tbody>
                            {outlierChartData.map((outlier, index) => (
                                selectedChangeTypes[outlier.type] && (
                                    <tr key={index} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                        <td style={{
                                            padding: '8px 12px',
                                            color: getColorDarker(outlier.type),
                                            fontWeight: '500'
                                        }}>
                                            {outlier.displayType}
                                        </td>
                                        <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                                            {outlier.value.toFixed(1)}
                                        </td>
                                    </tr>
                                )
                            ))}
                            {outlierChartData.filter(o => selectedChangeTypes[o.type]).length === 0 && (
                                <tr>
                                    <td colSpan={2} style={{ padding: '16px', textAlign: 'center', color: '#6b7280' }}>
                                        No outliers for selected change types
                                    </td>
                                </tr>
                            )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <div style={{
                marginTop: '16px',
                fontSize: '14px',
                color: '#6b7280',
                backgroundColor: 'white',
                padding: '16px',
                borderRadius: '8px'
            }}>
                <h4 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '10px', color: '#374151' }}>
                    Understanding Green Interval Changes
                </h4>
                <p style={{ marginBottom: '10px' }}>
                    This histogram shows the distribution of green interval changes by magnitude in seconds, categorized by type:
                </p>
                <ul style={{ paddingLeft: '20px', marginBottom: '10px' }}>
                    <li style={{ marginBottom: '6px', color: getColorDarker('earlierGreenStart') }}>
                        <strong>Earlier Green Start</strong>: Green phase starts earlier than predicted (positive change)
                    </li>
                    <li style={{ marginBottom: '6px', color: getColorDarker('extendedGreenEnd') }}>
                        <strong>Extended Green End</strong>: Green phase ends later than predicted (positive change)
                    </li>
                    <li style={{ marginBottom: '6px', color: getColorDarker('laterGreenStart') }}>
                        <strong>Later Green Start</strong>: Green phase starts later than predicted (negative change)
                    </li>
                    <li style={{ marginBottom: '6px', color: getColorDarker('shortenedGreenEnd') }}>
                        <strong>Shortened Green End</strong>: Green phase ends earlier than predicted (negative change)
                    </li>
                </ul>
                <p style={{ marginBottom: '10px' }}>
                    Larger changes (higher magnitude) indicate greater variability in traffic signal timing.
                    Frequent large-magnitude changes may suggest adaptive traffic control responding to changing conditions.
                </p>
                <p>
                    Changes greater than {OUTLIER_THRESHOLD} seconds are considered outliers and displayed separately.
                    These extreme changes could indicate significant traffic control interventions or potential data anomalies.
                </p>
            </div>
        </div>
    );
};

export default GreenChangeHistogram;