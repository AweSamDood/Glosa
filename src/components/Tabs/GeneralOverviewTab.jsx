// src/components/Tabs/GeneralOverviewTab.jsx
import React, { useMemo } from 'react';
import {
    BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer
} from 'recharts';

const GeneralOverviewTab = ({ intersections }) => {
    // Compute aggregated statistics
    const stats = useMemo(() => {
        if (!intersections || Object.keys(intersections).length === 0) {
            return {
                totalIntersections: 0,
                totalPasses: 0,
                timeRange: { start: null, end: null },
                passesByIntersection: [],
                totalGreenIntervalChanges: 0,
                greenChangeTypes: { lostGreen: 0, gotGreen: 0 },
                signalGroupStats: {
                    totalSignalGroups: 0,
                    signalGroupNames: new Set(),
                    predictedUsage: {},
                    glosaAdviceDistribution: {}
                }
            };
        }

        const aggregatedStats = {
            totalIntersections: Object.keys(intersections).length,
            totalPasses: 0,
            passesByIntersection: [],
            timeRange: {
                start: new Date(),
                end: new Date(0) // Oldest possible date
            },
            totalGreenIntervalChanges: 0,
            greenChangeTypes: { lostGreen: 0, gotGreen: 0 },
            gpsIssueCount: 0,
            noGreenWarningCount: 0,
            withPredictionsCount: 0,
            signalGroupStats: {
                totalSignalGroups: 0,
                signalGroupNames: new Set(),
                predictedUsage: {},
                movementEventAvailability: { available: 0, unavailable: 0, none: 0 },
                glosaAdviceDistribution: {}
            }
        };

        // Process each intersection
        Object.values(intersections).forEach(intersection => {
            const passThroughs = intersection.passThroughs || [];
            const passCount = passThroughs.length;

            // Add to total passes
            aggregatedStats.totalPasses += passCount;

            // Add to passes by intersection chart data
            aggregatedStats.passesByIntersection.push({
                name: intersection.name,
                passes: passCount
            });

            // Update time range
            if (intersection.summary?.timeRange) {
                if (intersection.summary.timeRange.start &&
                    intersection.summary.timeRange.start < aggregatedStats.timeRange.start) {
                    aggregatedStats.timeRange.start = new Date(intersection.summary.timeRange.start);
                }
                if (intersection.summary.timeRange.end &&
                    intersection.summary.timeRange.end > aggregatedStats.timeRange.end) {
                    aggregatedStats.timeRange.end = new Date(intersection.summary.timeRange.end);
                }
            }

            // Process green interval changes
            if (intersection.summary?.greenIntervalChanges) {
                aggregatedStats.totalGreenIntervalChanges += intersection.summary.greenIntervalChanges;
            }

            // Process green change types
            if (intersection.summary?.greenChangeTypes) {
                aggregatedStats.greenChangeTypes.lostGreen +=
                    intersection.summary.greenChangeTypes.lostGreen || 0;
                aggregatedStats.greenChangeTypes.gotGreen +=
                    intersection.summary.greenChangeTypes.gotGreen || 0;
            }

            // Process warning counts
            if (intersection.summary?.predictionStatistics) {
                const predStats = intersection.summary.predictionStatistics;
                aggregatedStats.gpsIssueCount += predStats.passThroughsWithGPSMismatch || 0;
                aggregatedStats.noGreenWarningCount += predStats.passThroughsWithNoGreenWarning || 0;
                aggregatedStats.withPredictionsCount += predStats.passThroughsWithPredictions || 0;

                // Process predicted signal groups
                Object.entries(predStats.predictedSignalGroups || {}).forEach(([sgName, data]) => {
                    if (!aggregatedStats.signalGroupStats.predictedUsage[sgName]) {
                        aggregatedStats.signalGroupStats.predictedUsage[sgName] = 0;
                    }
                    aggregatedStats.signalGroupStats.predictedUsage[sgName] += data.count || 0;
                });
            }

            // Process signal group stats
            Object.entries(intersection.summary?.signalGroupAnalysis || {}).forEach(([sgName, data]) => {
                // Count unique signal groups
                aggregatedStats.signalGroupStats.signalGroupNames.add(sgName);

                // Process movement event availability
                if (data.movementEventAvailability) {
                    aggregatedStats.signalGroupStats.movementEventAvailability.available +=
                        data.movementEventAvailability.available || 0;
                    aggregatedStats.signalGroupStats.movementEventAvailability.unavailable +=
                        data.movementEventAvailability.unavailable || 0;
                    aggregatedStats.signalGroupStats.movementEventAvailability.none +=
                        data.movementEventAvailability.none || 0;
                }

                // Process GLOSA advice
                Object.entries(data.glosaAdviceStats || {}).forEach(([advice, count]) => {
                    if (!aggregatedStats.signalGroupStats.glosaAdviceDistribution[advice]) {
                        aggregatedStats.signalGroupStats.glosaAdviceDistribution[advice] = 0;
                    }
                    aggregatedStats.signalGroupStats.glosaAdviceDistribution[advice] += count;
                });
            });
        });

        // Calculate total signal groups
        aggregatedStats.signalGroupStats.totalSignalGroups =
            aggregatedStats.signalGroupStats.signalGroupNames.size;

        // Sort passes by intersection
        aggregatedStats.passesByIntersection.sort((a, b) => b.passes - a.passes);

        return aggregatedStats;
    }, [intersections]);

    // Format time range for display
    const formattedTimeRange = useMemo(() => {
        if (!stats.timeRange.start || !stats.timeRange.end) {
            return 'No data';
        }
        return `${stats.timeRange.start.toLocaleString()} - ${stats.timeRange.end.toLocaleString()}`;
    }, [stats.timeRange]);

    // Prepare data for charts
    const passStatusData = useMemo(() => {
        return [
            { name: 'With Predictions', value: stats.withPredictionsCount, color: '#10b981' }, // green
            { name: 'GPS Issues', value: stats.gpsIssueCount, color: '#f59e0b' }, // yellow
            { name: 'No Green', value: stats.noGreenWarningCount - stats.gpsIssueCount, color: '#dc2626' }, // red
            { name: 'Other', value: stats.totalPasses - stats.withPredictionsCount - stats.noGreenWarningCount, color: '#9ca3af' } // gray
        ].filter(item => item.value > 0);
    }, [stats]);

    const predictedSignalGroupsData = useMemo(() => {
        return Object.entries(stats.signalGroupStats.predictedUsage)
            .map(([sgName, count]) => ({
                name: sgName,
                value: count,
                percentage: (count / stats.totalPasses * 100).toFixed(1)
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10); // Take top 10
    }, [stats]);

    const movementEventData = useMemo(() => {
        const movAvail = stats.signalGroupStats.movementEventAvailability;
        const total = movAvail.available + movAvail.unavailable + movAvail.none;

        return [
            { name: 'Available', value: movAvail.available, color: '#10b981' }, // green
            { name: 'Unavailable', value: movAvail.unavailable, color: '#9ca3af' }, // gray
            { name: 'None', value: movAvail.none, color: '#ef4444' } // red
        ].filter(item => item.value > 0);
    }, [stats]);

    const greenChangeData = useMemo(() => {
        return [
            { name: 'Lost Green', value: stats.greenChangeTypes.lostGreen, color: '#ef4444' }, // red
            { name: 'Got Green', value: stats.greenChangeTypes.gotGreen, color: '#10b981' } // green
        ].filter(item => item.value > 0);
    }, [stats]);

    const glosaAdviceData = useMemo(() => {
        return Object.entries(stats.signalGroupStats.glosaAdviceDistribution)
            .map(([advice, count]) => ({
                advice,
                count
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10); // Take top 10
    }, [stats]);

    // Colors for charts
    const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#9ca3af'];

    return (
        <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', padding: '24px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '24px' }}>
                GLOSA Analysis Overview
            </h2>

            {/* Key Statistics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
                <div style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: '500', color: '#6b7280', marginBottom: '8px' }}>Total Intersections</h3>
                    <p style={{ fontSize: '24px', fontWeight: '600', color: '#111827' }}>{stats.totalIntersections}</p>
                </div>

                <div style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: '500', color: '#6b7280', marginBottom: '8px' }}>Total Pass-Throughs</h3>
                    <p style={{ fontSize: '24px', fontWeight: '600', color: '#111827' }}>{stats.totalPasses}</p>
                </div>

                <div style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: '500', color: '#6b7280', marginBottom: '8px' }}>Signal Groups</h3>
                    <p style={{ fontSize: '24px', fontWeight: '600', color: '#111827' }}>{stats.signalGroupStats.totalSignalGroups}</p>
                </div>

                <div style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: '500', color: '#6b7280', marginBottom: '8px' }}>Time Range</h3>
                    <p style={{ fontSize: '14px', color: '#111827' }}>{formattedTimeRange}</p>
                </div>
            </div>

            {/* Intersections List */}
            <div style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Intersections</h3>
                <div style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
                        {Object.values(intersections).map(intersection => (
                            <div
                                key={intersection.id}
                                style={{
                                    padding: '12px',
                                    backgroundColor: 'white',
                                    borderRadius: '8px',
                                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                                }}
                            >
                                <div style={{ fontWeight: '600', marginBottom: '4px' }}>{intersection.name}</div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#4b5563' }}>
                                    <span>ID: {intersection.id}</span>
                                    <span>{intersection.passThroughs?.length || 0} passes</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Passes By Intersection Chart */}
            <div style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Passes by Intersection</h3>
                <div style={{ height: '400px', backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={stats.passesByIntersection}
                            margin={{ top: 20, right: 30, left: 20, bottom: 100 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                dataKey="name"
                                angle={-45}
                                textAnchor="end"
                                interval={0}
                                height={100}
                            />
                            <YAxis label={{ value: 'Number of Passes', angle: -90, position: 'insideLeft' }} />
                            <Tooltip />
                            <Bar dataKey="passes" fill="#3b82f6" name="Passes" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Green Interval Changes */}
            <div style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Green Interval Changes</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                    <div style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px' }}>
                        <h4 style={{ fontSize: '16px', fontWeight: '500', marginBottom: '12px' }}>Total Changes</h4>
                        <p style={{ fontSize: '24px', fontWeight: '600', color: stats.totalGreenIntervalChanges > 0 ? '#f97316' : '#10b981' }}>
                            {stats.totalGreenIntervalChanges}
                        </p>
                        {stats.totalGreenIntervalChanges > 0 && (
                            <div style={{ marginTop: '12px' }}>
                                <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                                    {stats.greenChangeTypes.lostGreen > 0 && (
                                        <span style={{
                                            fontSize: '14px',
                                            color: 'white',
                                            backgroundColor: '#ef4444',
                                            padding: '4px 10px',
                                            borderRadius: '16px'
                                        }}>
                                            Lost Green: {stats.greenChangeTypes.lostGreen}
                                        </span>
                                    )}
                                    {stats.greenChangeTypes.gotGreen > 0 && (
                                        <span style={{
                                            fontSize: '14px',
                                            color: 'white',
                                            backgroundColor: '#22c55e',
                                            padding: '4px 10px',
                                            borderRadius: '16px'
                                        }}>
                                            Got Green: {stats.greenChangeTypes.gotGreen}
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {greenChangeData.length > 0 && (
                        <div style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px' }}>
                            <h4 style={{ fontSize: '16px', fontWeight: '500', marginBottom: '12px' }}>Change Type Distribution</h4>
                            <div style={{ height: '250px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={greenChangeData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={70}
                                            outerRadius={90}
                                            paddingAngle={2}
                                            dataKey="value"
                                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                                        >
                                            {greenChangeData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value) => [value, 'Count']} />
                                        <Legend verticalAlign="bottom" />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Pass Status Distribution */}
            <div style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Pass Status Distribution</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
                    <div style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px' }}>
                        <h4 style={{ fontSize: '16px', fontWeight: '500', marginBottom: '12px' }}>Status Counts</h4>
                        <ul style={{ listStyleType: 'none', padding: '0' }}>
                            <li style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e5e7eb' }}>
                                <span>Passes with Predictions:</span>
                                <span style={{ fontWeight: '500', color: '#10b981' }}>{stats.withPredictionsCount}</span>
                            </li>
                            <li style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e5e7eb' }}>
                                <span>Passes with GPS Issues:</span>
                                <span style={{ fontWeight: '500', color: '#f59e0b' }}>{stats.gpsIssueCount}</span>
                            </li>
                            <li style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e5e7eb' }}>
                                <span>Passes with No Green:</span>
                                <span style={{ fontWeight: '500', color: '#ef4444' }}>{stats.noGreenWarningCount - stats.gpsIssueCount}</span>
                            </li>
                            <li style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                                <span>Other Passes:</span>
                                <span style={{ fontWeight: '500' }}>{stats.totalPasses - stats.withPredictionsCount - stats.noGreenWarningCount}</span>
                            </li>
                        </ul>
                    </div>

                    {passStatusData.length > 0 && (
                        <div style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px' }}>
                            <h4 style={{ fontSize: '16px', fontWeight: '500', marginBottom: '12px' }}>Status Distribution</h4>
                            <div style={{ height: '250px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={passStatusData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={70}
                                            outerRadius={90}
                                            paddingAngle={2}
                                            dataKey="value"
                                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                                        >
                                            {passStatusData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value) => [value, 'Count']} />
                                        <Legend verticalAlign="bottom" />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Signal Group Usage */}
            {predictedSignalGroupsData.length > 0 && (
                <div style={{ marginBottom: '32px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Most Used Signal Groups</h3>
                    <div style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px' }}>
                        <div style={{ height: '400px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={predictedSignalGroupsData}
                                    margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis
                                        dataKey="name"
                                        angle={-45}
                                        textAnchor="end"
                                        interval={0}
                                        height={50}
                                    />
                                    <YAxis label={{ value: 'Number of Passes', angle: -90, position: 'insideLeft' }} />
                                    <Tooltip
                                        formatter={(value, name, props) => {
                                            return [`${value} (${props.payload.percentage}%)`, 'Used in Passes'];
                                        }}
                                    />
                                    <Bar dataKey="value" name="Used in Passes" fill="#3b82f6" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {/* Movement Event Availability */}
            {movementEventData.length > 0 && (
                <div style={{ marginBottom: '32px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Movement Event Availability</h3>
                    <div style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px' }}>
                        <div style={{ height: '300px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={movementEventData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={70}
                                        outerRadius={90}
                                        paddingAngle={2}
                                        dataKey="value"
                                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                                    >
                                        {movementEventData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value) => [value, 'Count']} />
                                    <Legend verticalAlign="bottom" />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {/* GLOSA Advice Distribution */}
            {glosaAdviceData.length > 0 && (
                <div style={{ marginBottom: '32px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>GLOSA Advice Distribution</h3>
                    <div style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px' }}>
                        <div style={{ height: '400px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={glosaAdviceData}
                                    margin={{ top: 20, right: 30, left: 20, bottom: 100 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis
                                        dataKey="advice"
                                        angle={-45}
                                        textAnchor="end"
                                        interval={0}
                                        height={100}
                                    />
                                    <YAxis label={{ value: 'Count', angle: -90, position: 'insideLeft' }} />
                                    <Tooltip />
                                    <Bar dataKey="count" name="Count" fill="#3b82f6" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {/* Signal Group List */}
            <div>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>All Signal Groups</h3>
                <div style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px' }}>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                        gap: '8px',
                        maxHeight: '200px',
                        overflowY: 'auto',
                        padding: '8px'
                    }}>
                        {Array.from(stats.signalGroupStats.signalGroupNames).map(sgName => (
                            <div
                                key={sgName}
                                style={{
                                    padding: '8px',
                                    backgroundColor: 'white',
                                    borderRadius: '4px',
                                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                                    fontSize: '14px'
                                }}
                            >
                                {sgName}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GeneralOverviewTab;