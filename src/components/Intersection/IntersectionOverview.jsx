// src/components/Intersection/IntersectionOverview.jsx
import React from 'react';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';

const IntersectionOverview = ({ intersection }) => {
    if (!intersection?.summary) {
        return <div>No intersection data available</div>;
    }

    const summary = intersection.summary;
    const hasStopPatterns = summary.stopLocations && summary.stopLocations.length > 0;

    // Prepare data for movement event availability pie chart
    const movementEventData = Object.entries(summary.signalGroupAnalysis).map(([sgName, data]) => ({
        name: sgName,
        available: data.movementEventAvailability.available,
        unavailable: data.movementEventAvailability.unavailable,
        none: data.movementEventAvailability.none,
        total: data.movementEventAvailability.available +
            data.movementEventAvailability.unavailable +
            data.movementEventAvailability.none
    }));

    // Colors for pie chart
    const COLORS = ['#10b981', '#9ca3af', '#ef4444']; // green, gray, red

    // Prepare GLOSA advice distribution data
    const glosaAdviceData = Object.entries(summary.signalGroupAnalysis).flatMap(([sgName, data]) =>
        Object.entries(data.glosaAdviceStats || {}).map(([advice, count]) => ({
            signalGroup: sgName,
            advice,
            count
        }))
    );

    return (
        <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', padding: '24px', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '24px' }}>
                Intersection Overview: {intersection.name}
            </h2>

            {/* Basic Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
                <div style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: '500', color: '#6b7280', marginBottom: '8px' }}>Total Pass-Throughs</h3>
                    <p style={{ fontSize: '24px', fontWeight: '600', color: '#111827' }}>{summary.totalPassThroughs}</p>
                </div>
                <div style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: '500', color: '#6b7280', marginBottom: '8px' }}>Time Range</h3>
                    <p style={{ fontSize: '14px', color: '#111827' }}>
                        {summary.timeRange.start ? summary.timeRange.start.toLocaleString() : 'N/A'} -
                        {summary.timeRange.end ? summary.timeRange.end.toLocaleString() : 'N/A'}
                    </p>
                </div>
                <div style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: '500', color: '#6b7280', marginBottom: '8px' }}>Signal Groups</h3>
                    <p style={{ fontSize: '24px', fontWeight: '600', color: '#111827' }}>{Object.keys(summary.signalGroupAnalysis).length}</p>
                </div>
                <div style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: '500', color: '#6b7280', marginBottom: '8px' }}>Green Interval Changes</h3>
                    <p style={{ fontSize: '24px', fontWeight: '600', color: summary.greenIntervalChanges > 0 ? '#f97316' : '#10b981' }}>
                        {summary.greenIntervalChanges}
                    </p>
                </div>
            </div>

            {/* Stop Location Patterns */}
            {hasStopPatterns && (
                <div style={{ marginBottom: '32px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Detected Stop Patterns</h3>
                    <div style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px' }}>
                        <p style={{ marginBottom: '16px', color: '#374151' }}>
                            The following locations show consistent stopping patterns (speed &lt; 2 km/h):
                        </p>
                        <div style={{ height: '300px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={summary.stopLocations}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis
                                        dataKey="distanceRange"
                                        label={{ value: 'Distance from Intersection', position: 'insideBottom', offset: -5 }}
                                    />
                                    <YAxis
                                        label={{ value: 'Stop Occurrences', angle: -90, position: 'insideLeft' }}
                                    />
                                    <Tooltip
                                        formatter={(value, name, props) => {
                                            if (name === 'occurrences') {
                                                return [`${value} (${props.payload.percentage}%)`, 'Occurrences'];
                                            }
                                            return [value, name];
                                        }}
                                    />
                                    <Bar dataKey="occurrences" fill="#3b82f6" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div style={{ marginTop: '16px' }}>
                            <h4 style={{ fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>Stop Location Details:</h4>
                            <ul style={{ listStyleType: 'disc', marginLeft: '24px' }}>
                                {summary.stopLocations.map((location, idx) => (
                                    <li key={idx} style={{ marginBottom: '4px', color: '#374151' }}>
                                        <strong>{location.distanceRange}</strong>: {location.occurrences} stops
                                        ({location.percentage}% of passes) - Signal Group: {location.signalGroup}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {/* Movement Event Availability by Signal Group */}
            <div style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Movement Event Availability</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
                    {movementEventData.map(sg => (
                        <div key={sg.name} style={{ backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px' }}>
                            <h4 style={{ fontSize: '16px', fontWeight: '500', marginBottom: '12px' }}>{sg.name}</h4>
                            <div style={{ height: '200px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={[
                                                { name: 'Available', value: sg.available },
                                                { name: 'Unavailable', value: sg.unavailable },
                                                { name: 'None', value: sg.none }
                                            ]}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={40}
                                            outerRadius={60}
                                            paddingAngle={2}
                                            dataKey="value"
                                        >
                                            {COLORS.map((color, index) => (
                                                <Cell key={`cell-${index}`} fill={color} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* GLOSA Advice Distribution */}
            {glosaAdviceData.length > 0 && (
                <div style={{ marginBottom: '32px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>GLOSA Advice Distribution</h3>
                    <div style={{ height: '400px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={glosaAdviceData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="advice"
                                    angle={-45}
                                    textAnchor="end"
                                    height={100}
                                    interval={0}
                                />
                                <YAxis label={{ value: 'Count', angle: -90, position: 'insideLeft' }} />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="count" fill="#3b82f6" name="Occurrences" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Signal Group Analysis Table */}
            <div>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Signal Group Analysis</h3>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                        <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                            <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Signal Group</th>
                            <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>Occurrences</th>
                            <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>Distance Range (m)</th>
                            <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>Speed Range (km/h)</th>
                            <th style={{ padding: '12px', textAlign: 'center', fontWeight: '600' }}>Green Interval Changes</th>
                        </tr>
                        </thead>
                        <tbody>
                        {Object.entries(summary.signalGroupAnalysis).map(([sgName, data]) => (
                            <tr key={sgName} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                <td style={{ padding: '12px' }}>{sgName}</td>
                                <td style={{ padding: '12px', textAlign: 'center' }}>{data.totalOccurrences}</td>
                                <td style={{ padding: '12px', textAlign: 'center' }}>
                                    {data.distanceRange.min.toFixed(1)} - {data.distanceRange.max.toFixed(1)}
                                </td>
                                <td style={{ padding: '12px', textAlign: 'center' }}>
                                    {data.speedRange.min.toFixed(1)} - {data.speedRange.max.toFixed(1)}
                                </td>
                                <td style={{ padding: '12px', textAlign: 'center' }}>
                                        <span style={{ color: data.greenIntervalChanges > 0 ? '#f97316' : '#10b981' }}>
                                            {data.greenIntervalChanges}
                                        </span>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default IntersectionOverview;