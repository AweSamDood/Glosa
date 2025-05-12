// src/components/GLOSA/GreenChangeHistogram.jsx
import React, { useState, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const GreenChangeHistogram = ({ greenChangeMagnitudes }) => {
    // Configuration state
    console.log("GreenChangeHistogram received data:",
        greenChangeMagnitudes ?
            Object.entries(greenChangeMagnitudes).map(([type, values]) =>
                `${type}: ${Array.isArray(values) ? values.length : 'not an array'} values`)
            : 'No data');

    // Configuration state
    const [binSize, setBinSize] = useState(5); // Default bin size of 5 seconds
    const [selectedChangeTypes, setSelectedChangeTypes] = useState({
        earlierGreenStart: true,
        extendedGreenEnd: true,
        laterGreenStart: true,
        shortenedGreenEnd: true
    });

    // Get the max value across all change types for setting the chart range
    const maxValue = useMemo(() => {
        let max = 0;
        Object.entries(greenChangeMagnitudes || {}).forEach(([type, values]) => {
            if (Array.isArray(values) && values.length > 0) {
                const typeMax = Math.max(...values);
                if (typeMax > max) max = typeMax;
            }
        });
        return max;
    }, [greenChangeMagnitudes]);

    // Create histogram data
    const histogramData = useMemo(() => {
        if (!greenChangeMagnitudes) return [];

        // Debug: Log what we're actually working with
        console.log("Creating histogram with data:",
            Object.entries(greenChangeMagnitudes).map(([type, values]) =>
                `${type}: ${Array.isArray(values) ? values.length : 'not an array'} values`
            ).join(', '));

        // Determine the number of bins based on the max value and bin size
        const maxBin = Math.ceil(maxValue / binSize) * binSize;
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

        // Fill the bins with data
        Object.entries(greenChangeMagnitudes).forEach(([type, values]) => {
            if (Array.isArray(values) && values.length > 0) {
                console.log(`Processing ${values.length} values for ${type}`);
                values.forEach(value => {
                    // Find the appropriate bin
                    const binIndex = Math.floor(value / binSize);
                    if (binIndex >= 0 && binIndex < bins.length) {
                        bins[binIndex][type]++;
                    } else {
                        console.log(`Value ${value} for ${type} is outside bin range (0-${bins.length-1})`);
                    }
                });
            } else {
                console.log(`No valid values for ${type}`);
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
    }, [greenChangeMagnitudes, binSize, maxValue]);

    // Calculate summary statistics
    const stats = useMemo(() => {
        const result = {
            earlierGreenStart: { count: 0, avg: 0, min: Infinity, max: 0 },
            extendedGreenEnd: { count: 0, avg: 0, min: Infinity, max: 0 },
            laterGreenStart: { count: 0, avg: 0, min: Infinity, max: 0 },
            shortenedGreenEnd: { count: 0, avg: 0, min: Infinity, max: 0 }
        };

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

    // Format change type for display
    const formatChangeType = (type) => {
        switch(type) {
            case 'earlierGreenStart': return 'Earlier Green Start';
            case 'extendedGreenEnd': return 'Extended Green End';
            case 'laterGreenStart': return 'Later Green Start';
            case 'shortenedGreenEnd': return 'Shortened Green End';
            default: return type;
        }
    };

    // Function to calculate total changes
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
                            Max Change: {maxValue.toFixed(1)}s
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

            {/* Histogram Chart */}
            {histogramData.length > 0 ? (
                <div style={{
                    backgroundColor: 'white',
                    padding: '16px',
                    borderRadius: '8px',
                    height: '400px'
                }}>
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
                    textAlign: 'center'
                }}>
                    <p style={{ color: '#6b7280' }}>
                        No green interval change data available.
                    </p>
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
                <p>
                    Larger changes (higher magnitude) indicate greater variability in traffic signal timing.
                    Frequent large-magnitude changes may suggest adaptive traffic control responding to changing conditions.
                </p>
            </div>
        </div>
    );
};

export default GreenChangeHistogram;