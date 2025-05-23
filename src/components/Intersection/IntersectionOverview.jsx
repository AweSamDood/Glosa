// src/components/Intersection/IntersectionOverview.jsx
import React from 'react';
import {
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    BarChart,
    Bar
} from 'recharts';

const IntersectionOverview = ({intersection}) => {
    if (!intersection?.summary) {
        return <div>No intersection data available</div>;
    }

    const summary = intersection.summary;
    const hasStopPatterns = summary.stopLocations && summary.stopLocations.length > 0;
    const predictionStats = summary.predictionStatistics || {
        predictedSignalGroups: {},
        passThroughsWithPredictions: 0,
        passThroughsWithNoGreenWarning: 0,
        passThroughsWithGPSMismatch: 0
    };

    // Helper function to extract ingress ID for a signal group
    const getIngressForSignalGroup = (sgName) => {
        let ingress = null;

        // Try to find ingress in each pass-through
        if (intersection.passThroughs) {
            for (const pass of intersection.passThroughs) {
                if (pass.signalGroups && pass.signalGroups[sgName]) {
                    const metrics = pass.signalGroups[sgName].metrics || [];
                    for (const metric of metrics) {
                        if (metric._rawEvent &&
                            metric._rawEvent.intersectionPass?.intPassInfo?.ingress !== undefined) {
                            ingress = metric._rawEvent.intersectionPass.intPassInfo.ingress;
                            return ingress; // Return the first found ingress
                        }
                    }
                }
            }
        }

        return ingress;
    };

    // Group signal groups by ingress
    const getSignalGroupsByIngress = () => {
        const groupedSGs = {};

        Object.keys(summary.signalGroupAnalysis || {}).forEach(sgName => {
            const ingress = getIngressForSignalGroup(sgName) || 'Unknown';
            if (!groupedSGs[ingress]) {
                groupedSGs[ingress] = [];
            }
            groupedSGs[ingress].push(sgName);
        });

        return groupedSGs;
    };

    const signalGroupsByIngress = getSignalGroupsByIngress();

    // Prepare data for movement event availability pie chart
    const movementEventData = Object.entries(summary.signalGroupAnalysis).map(([sgName, data]) => ({
        name: sgName,
        available: data.movementEventAvailability.available,
        unavailable: data.movementEventAvailability.unavailable,
        none: data.movementEventAvailability.none,
        total: data.movementEventAvailability.available +
            data.movementEventAvailability.unavailable +
            data.movementEventAvailability.none,
        ingress: getIngressForSignalGroup(sgName)
    }));

    // Prepare data for predicted signal groups chart
    const predictedSignalGroupsData = Object.entries(predictionStats.predictedSignalGroups)
        .map(([sgName, data]) => ({
            signalGroup: sgName,
            count: data.count,
            percentage: parseFloat(data.percentage),
            ingress: getIngressForSignalGroup(sgName)
        }))
        .sort((a, b) => b.count - a.count);

    // Prepare data for pass-through analysis pie chart
    const passThroughAnalysisData = [
        {
            name: 'With Predictions',
            value: predictionStats.passThroughsWithPredictions,
            color: '#10b981' // green
        },
        {
            name: 'No Green (GPS Issue)',
            value: predictionStats.passThroughsWithGPSMismatch,
            color: '#f59e0b' // yellow
        },
        {
            name: 'No Green (Red Pass)',
            value: predictionStats.passThroughsWithNoGreenWarning - predictionStats.passThroughsWithGPSMismatch,
            color: '#dc2626' // red
        },
        {
            name: 'Other',
            value: summary.totalPassThroughs -
                predictionStats.passThroughsWithPredictions -
                predictionStats.passThroughsWithNoGreenWarning,
            color: '#9ca3af' // gray
        }
    ].filter(item => item.value > 0);

    // Colors for pie chart
    const COLORS = ['#10b981', '#9ca3af', '#ef4444']; // green, gray, red

    // Ingress color mapping - for visual differentiation
    const INGRESS_COLORS = {
        1: '#3b82f6', // blue
        2: '#8b5cf6', // purple
        3: '#ec4899', // pink
        4: '#f97316', // orange
        5: '#22c55e', // green
        6: '#64748b', // slate
        7: '#f59e0b', // amber
        8: '#06b6d4', // cyan
        9: '#14b8a6', // teal
        'Unknown': '#9ca3af' // gray
    };

    // Get color for ingress ID
    const getIngressColor = (ingress) => {
        if (ingress === null || ingress === undefined) return INGRESS_COLORS['Unknown'];
        return INGRESS_COLORS[ingress] || INGRESS_COLORS['Unknown'];
    };

    // Prepare GLOSA advice distribution data
    const glosaAdviceData = Object.entries(summary.signalGroupAnalysis).flatMap(([sgName, data]) =>
        Object.entries(data.glosaAdviceStats || {}).map(([advice, count]) => ({
            signalGroup: sgName,
            advice,
            count,
            ingress: getIngressForSignalGroup(sgName)
        }))
    );

    return (
        <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
            padding: '24px',
            marginBottom: '24px'
        }}>
            <h2 style={{fontSize: '20px', fontWeight: '600', marginBottom: '24px'}}>
                Intersection Overview: {intersection.name}
            </h2>

            {/* Basic Stats */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                marginBottom: '32px'
            }}>
                <div style={{backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px'}}>
                    <h3 style={{fontSize: '14px', fontWeight: '500', color: '#6b7280', marginBottom: '8px'}}>Total
                        Pass-Throughs</h3>
                    <p style={{fontSize: '24px', fontWeight: '600', color: '#111827'}}>{summary.totalPassThroughs}</p>
                </div>
                <div style={{backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px'}}>
                    <h3 style={{fontSize: '14px', fontWeight: '500', color: '#6b7280', marginBottom: '8px'}}>Time
                        Range</h3>
                    <p style={{fontSize: '14px', color: '#111827'}}>
                        {summary.timeRange.start ? summary.timeRange.start.toLocaleString() : 'N/A'} -
                        {summary.timeRange.end ? summary.timeRange.end.toLocaleString() : 'N/A'}
                    </p>
                </div>
                <div style={{backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px'}}>
                    <h3 style={{fontSize: '14px', fontWeight: '500', color: '#6b7280', marginBottom: '8px'}}>Signal
                        Groups</h3>
                    <p style={{
                        fontSize: '24px',
                        fontWeight: '600',
                        color: '#111827'
                    }}>{Object.keys(summary.signalGroupAnalysis).length}</p>
                </div>

                {/* ENHANCED GREEN INTERVAL STABILITY SECTION */}
                <div style={{
                    backgroundColor: summary.greenIntervalChanges > 0 ? '#fffaf0' : '#f0fdf4',
                    padding: '16px',
                    borderRadius: '8px',
                    borderLeftWidth: '4px',
                    borderLeftStyle: 'solid',
                    borderLeftColor: summary.greenIntervalChanges > 0 ? '#f97316' : '#10b981'
                }}>
                    <h3 style={{fontSize: '14px', fontWeight: '500', color: '#6b7280', marginBottom: '8px'}}>Green
                        Interval Stability</h3>
                    <div>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                            <p style={{
                                fontSize: '24px',
                                fontWeight: '600',
                                color: summary.greenIntervalChanges > 0 ? '#f97316' : '#10b981'
                            }}>
                                {summary.greenIntervalChanges > 0 ? 'Changes Detected' : 'Stable'}
                            </p>
                            <p style={{
                                fontSize: '14px',
                                fontWeight: '500',
                                color: '#6b7280',
                                backgroundColor: '#f3f4f6',
                                padding: '4px 8px',
                                borderRadius: '4px'
                            }}>
                                Total: {summary.greenIntervalChanges}
                            </p>
                        </div>

                        {summary.greenIntervalChanges > 0 && summary.greenChangeTypes && (
                            <div style={{marginTop: '12px'}}>
                                <div style={{marginBottom: '8px'}}>
                                    <p style={{fontSize: '14px', fontWeight: '500', color: '#4b5563'}}>Change Types:</p>
                                </div>
                                <div style={{display: 'flex', gap: '12px', marginBottom: '12px'}}>
                                    <div style={{
                                        flex: 1,
                                        borderRadius: '8px',
                                        backgroundColor: '#fee2e2',
                                        padding: '12px',
                                        borderWidth: '1px',
                                        borderStyle: 'solid',
                                        borderColor: '#fecaca'
                                    }}>
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            marginBottom: '4px'
                                        }}>
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"
                                                 fill="currentColor"
                                                 style={{width: '16px', height: '16px', color: '#dc2626'}}>
                                                <path
                                                    d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z"/>
                                            </svg>
                                            <span style={{fontWeight: '600', color: '#b91c1c'}}>Negative Changes</span>
                                        </div>
                                        <div style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '4px',
                                            marginTop: '8px'
                                        }}>
                                            <div style={{fontSize: '14px', color: '#991b1b'}}>
                                                <span
                                                    style={{fontWeight: '500'}}>Later Start:</span> {summary.greenChangeTypes.laterGreenStart}
                                            </div>
                                            <div style={{fontSize: '14px', color: '#991b1b'}}>
                                                <span
                                                    style={{fontWeight: '500'}}>Shortened End:</span> {summary.greenChangeTypes.shortenedGreenEnd}
                                            </div>
                                        </div>
                                        <div style={{
                                            fontSize: '20px',
                                            fontWeight: '700',
                                            color: '#dc2626',
                                            textAlign: 'center',
                                            marginTop: '8px'
                                        }}>
                                            {summary.greenChangeTypes.laterGreenStart + summary.greenChangeTypes.shortenedGreenEnd}
                                        </div>
                                    </div>

                                    <div style={{
                                        flex: 1,
                                        borderRadius: '8px',
                                        backgroundColor: '#dcfce7',
                                        padding: '12px',
                                        borderWidth: '1px',
                                        borderStyle: 'solid',
                                        borderColor: '#86efac'
                                    }}>
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            marginBottom: '4px'
                                        }}>
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"
                                                 fill="currentColor"
                                                 style={{width: '16px', height: '16px', color: '#16a34a'}}>
                                                <path
                                                    d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z"/>
                                            </svg>
                                            <span style={{fontWeight: '600', color: '#166534'}}>Positive Changes</span>
                                        </div>
                                        <div style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '4px',
                                            marginTop: '8px'
                                        }}>
                                            <div style={{fontSize: '14px', color: '#166534'}}>
                                                <span
                                                    style={{fontWeight: '500'}}>Earlier Start:</span> {summary.greenChangeTypes.earlierGreenStart}
                                            </div>
                                            <div style={{fontSize: '14px', color: '#166534'}}>
                                                <span
                                                    style={{fontWeight: '500'}}>Extended End:</span> {summary.greenChangeTypes.extendedGreenEnd}
                                            </div>
                                        </div>
                                        <div style={{
                                            fontSize: '20px',
                                            fontWeight: '700',
                                            color: '#16a34a',
                                            textAlign: 'center',
                                            marginTop: '8px'
                                        }}>
                                            {summary.greenChangeTypes.earlierGreenStart + summary.greenChangeTypes.extendedGreenEnd}
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <p style={{ fontSize: '13px', color: '#4b5563', fontStyle: 'italic' }}>
                                        Green interval changes may indicate adaptive traffic light control or traffic management system interventions.
                                        {(summary.greenChangeTypes.laterGreenStart + summary.greenChangeTypes.shortenedGreenEnd) >
                                        (summary.greenChangeTypes.earlierGreenStart + summary.greenChangeTypes.extendedGreenEnd) ?
                                            ' Predominant negative changes might suggest prioritization of other traffic directions.' :
                                            (summary.greenChangeTypes.earlierGreenStart + summary.greenChangeTypes.extendedGreenEnd) >
                                            (summary.greenChangeTypes.laterGreenStart + summary.greenChangeTypes.shortenedGreenEnd) ?
                                                ' Predominant positive changes suggest favorable prioritization for this approach.' :
                                                ' Equal positive and negative changes suggests balanced adaptive control.'}
                                    </p>
                                </div>
                            </div>
                        )}

                        {summary.greenIntervalChanges === 0 && (
                            <div style={{marginTop: '8px', fontSize: '14px', color: '#166534'}}>
                                <p>All green intervals remained consistent throughout all pass-throughs. This indicates
                                    a fixed-time traffic signal with predictable phasing.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Signal Groups by Ingress ID */}
            {Object.keys(signalGroupsByIngress).length > 0 && (
                <div style={{marginBottom: '32px'}}>
                    <h3 style={{fontSize: '18px', fontWeight: '600', marginBottom: '16px'}}>Signal Groups by
                        Ingress</h3>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                        gap: '16px'
                    }}>
                        {Object.entries(signalGroupsByIngress).map(([ingress, signalGroups]) => (
                            <div key={ingress} style={{
                                backgroundColor: '#f9fafb',
                                padding: '16px',
                                borderRadius: '8px',
                                borderLeftWidth: '4px',
                                borderLeftStyle: 'solid',
                                borderLeftColor: getIngressColor(ingress)
                            }}>
                                <h4 style={{
                                    fontSize: '16px',
                                    fontWeight: '600',
                                    marginBottom: '12px',
                                    color: getIngressColor(ingress)
                                }}>
                                    Ingress: {ingress}
                                </h4>
                                <ul style={{listStyleType: 'none', padding: '0', margin: '0'}}>
                                    {signalGroups.map(sgName => (
                                        <li key={sgName} style={{
                                            padding: '8px 12px',
                                            marginBottom: '8px',
                                            backgroundColor: 'white',
                                            borderRadius: '4px',
                                            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                                        }}>
                                            {sgName}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Pass-Through Prediction Analysis */}
            <div style={{marginBottom: '32px'}}>
                <h3 style={{fontSize: '18px', fontWeight: '600', marginBottom: '16px'}}>Pass-Through Analysis</h3>
                <div
                    style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px'}}>
                    {/* Statistics */}
                    <div style={{backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px'}}>
                        <h4 style={{fontSize: '16px', fontWeight: '500', marginBottom: '12px'}}>Pass-Through
                            Statistics</h4>
                        <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                            <p>
                                <span style={{fontWeight: '500'}}>With Predictions:</span>{' '}
                                {predictionStats.passThroughsWithPredictions} ({(predictionStats.passThroughsWithPredictions / summary.totalPassThroughs * 100).toFixed(1)}%)
                            </p>
                            <p>
                                <span style={{fontWeight: '500'}}>GPS Issues:</span>{' '}
                                {predictionStats.passThroughsWithGPSMismatch} ({(predictionStats.passThroughsWithGPSMismatch / summary.totalPassThroughs * 100).toFixed(1)}%)
                            </p>
                            <p>
                                <span style={{fontWeight: '500'}}>No Green Phase:</span>{' '}
                                {predictionStats.passThroughsWithNoGreenWarning} ({(predictionStats.passThroughsWithNoGreenWarning / summary.totalPassThroughs * 100).toFixed(1)}%)
                            </p>
                        </div>
                    </div>

                    {/* Pie Chart */}
                    <div style={{backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px'}}>
                        <h4 style={{fontSize: '16px', fontWeight: '500', marginBottom: '12px'}}>Pass-Through
                            Categories</h4>
                        <div style={{height: '250px'}}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={passThroughAnalysisData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={40}
                                        outerRadius={80}
                                        paddingAngle={2}
                                        dataKey="value"
                                    >
                                        {passThroughAnalysisData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color}/>
                                        ))}
                                    </Pie>
                                    <Tooltip/>
                                    <Legend/>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>

            {/* Predicted Signal Groups Usage */}
            {predictedSignalGroupsData.length > 0 && (
                <div style={{marginBottom: '32px'}}>
                    <h3 style={{fontSize: '18px', fontWeight: '600', marginBottom: '16px'}}>Predicted Signal Groups
                        Usage</h3>
                    <div style={{backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px'}}>
                        <p style={{marginBottom: '16px', color: '#374151'}}>
                            Signal groups predicted to be used for passage across all pass-throughs:
                        </p>
                        <div style={{height: '300px'}}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={predictedSignalGroupsData}>
                                    <CartesianGrid strokeDasharray="3 3"/>
                                    <XAxis
                                        dataKey="signalGroup"
                                        angle={-45}
                                        textAnchor="end"
                                        height={70}
                                    />
                                    <YAxis
                                        label={{value: 'Number of Passes', angle: -90, position: 'insideLeft'}}
                                    />
                                    <Tooltip
                                        formatter={(value, name, props) => {
                                            if (name === 'count') {
                                                const ingressInfo = props.payload.ingress
                                                    ? ` (Ingress: ${props.payload.ingress})`
                                                    : '';
                                                return [`${value} (${props.payload.percentage}%)${ingressInfo}`, 'Passes'];
                                            }
                                            return [value, name];
                                        }}
                                    />
                                    <Bar
                                        dataKey="count"
                                        name="Passes"
                                        // Use ingress color for bar if available
                                        fill="#3b82f6"
                                        // Custom shape to color bars by ingress
                                        shape={(props) => {
                                            // Get ingress from the bar's data
                                            const ingress = props.payload.ingress;
                                            // Set fill color based on ingress
                                            const fill = getIngressColor(ingress);
                                            return <rect
                                                x={props.x}
                                                y={props.y}
                                                width={props.width}
                                                height={props.height}
                                                fill={fill}
                                                stroke="none"
                                            />;
                                        }}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        {/* Legend showing ingress colors */}
                        <div style={{marginTop: '16px', display: 'flex', flexWrap: 'wrap', gap: '8px'}}>
                            {Object.entries(signalGroupsByIngress).map(([ingress, _]) => (
                                <div key={ingress} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '2px 8px',
                                    backgroundColor: 'white',
                                    borderRadius: '16px',
                                    fontSize: '12px',
                                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
                                }}>
                                    <div style={{
                                        width: '12px',
                                        height: '12px',
                                        borderRadius: '50%',
                                        backgroundColor: getIngressColor(ingress)
                                    }}></div>
                                    <span>Ingress: {ingress}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Stop Location Patterns */}
            {hasStopPatterns && (
                <div style={{marginBottom: '32px'}}>
                    <h3 style={{fontSize: '18px', fontWeight: '600', marginBottom: '16px'}}>Detected Stop Patterns</h3>
                    <div style={{backgroundColor: '#f9fafb', padding: '16px', borderRadius: '8px'}}>
                        <p style={{marginBottom: '16px', color: '#374151'}}>
                            The following locations show consistent stopping patterns (speed &lt; 2 km/h):
                        </p>
                        <div style={{height: '300px'}}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={summary.stopLocations}>
                                    <CartesianGrid strokeDasharray="3 3"/>
                                    <XAxis
                                        dataKey="distanceRange"
                                        label={{
                                            value: 'Distance from Intersection',
                                            position: 'insideBottom',
                                            offset: -5
                                        }}
                                    />
                                    <YAxis
                                        label={{value: 'Stop Occurrences', angle: -90, position: 'insideLeft'}}
                                    />
                                    <Tooltip
                                        formatter={(value, name, props) => {
                                            if (name === 'occurrences') {
                                                return [`${value} (${props.payload.percentage}%)`, 'Occurrences'];
                                            }
                                            return [value, name];
                                        }}
                                    />
                                    <Bar dataKey="occurrences" fill="#3b82f6"/>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div style={{marginTop: '16px'}}>
                            <h4 style={{fontSize: '14px', fontWeight: '500', marginBottom: '8px'}}>Stop Location
                                Details:</h4>
                            <ul style={{listStyleType: 'disc', marginLeft: '24px'}}>
                                {summary.stopLocations.map((location, idx) => (
                                    <li key={idx} style={{marginBottom: '4px', color: '#374151'}}>
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
            <div style={{marginBottom: '32px'}}>
                <h3 style={{fontSize: '18px', fontWeight: '600', marginBottom: '16px'}}>Movement Event Availability</h3>
                <div
                    style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px'}}>
                    {movementEventData.map(sg => (
                        <div key={sg.name} style={{
                            backgroundColor: '#f9fafb',
                            padding: '16px',
                            borderRadius: '8px',
                            borderLeftWidth: sg.ingress ? '4px' : '0',
                            borderLeftStyle: sg.ingress ? 'solid' : 'none',
                            borderLeftColor: getIngressColor(sg.ingress)
                        }}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '12px'
                            }}>
                                <h4 style={{fontSize: '16px', fontWeight: '500', margin: 0}}>{sg.name}</h4>
                                {sg.ingress !== undefined && (
                                    <span style={{
                                        backgroundColor: '#e5e7eb',
                                        color: '#4b5563',
                                        padding: '2px 8px',
                                        borderRadius: '12px',
                                        fontSize: '13px',
                                        fontWeight: '500'
                                    }}>
                                        Ingress: {sg.ingress}
                                    </span>
                                )}
                            </div>
                            <div style={{height: '200px'}}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={[
                                                {name: 'Available', value: sg.available},
                                                {name: 'Unavailable', value: sg.unavailable},
                                                {name: 'None', value: sg.none}
                                            ]}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={40}
                                            outerRadius={60}
                                            paddingAngle={2}
                                            dataKey="value"
                                        >
                                            {COLORS.map((color, index) => (
                                                <Cell key={`cell-${index}`} fill={color}/>
                                            ))}
                                        </Pie>
                                        <Tooltip/>
                                        <Legend/>
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* GLOSA Advice Distribution */}
            {glosaAdviceData.length > 0 && (
                <div style={{marginBottom: '32px'}}>
                    <h3 style={{fontSize: '18px', fontWeight: '600', marginBottom: '16px'}}>GLOSA Advice Distribution by
                        Signal Group</h3>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
                        gap: '24px'
                    }}>
                        {Object.entries(summary.signalGroupAnalysis).map(([sgName, data]) => {
                            const sgGlosaData = Object.entries(data.glosaAdviceStats || {}).map(([advice, count]) => ({
                                advice,
                                count
                            }));

                            if (sgGlosaData.length === 0) return null;

                            const ingress = getIngressForSignalGroup(sgName);

                            return (
                                <div key={sgName} style={{
                                    backgroundColor: '#f9fafb',
                                    padding: '16px',
                                    borderRadius: '8px',
                                    borderLeftWidth: ingress !== null ? '4px' : '0',
                                    borderLeftStyle: ingress !== null ? 'solid' : 'none',
                                    borderLeftColor: getIngressColor(ingress)
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: '12px'
                                    }}>
                                        <h4 style={{fontSize: '16px', fontWeight: '500', margin: 0}}>{sgName}</h4>
                                        {ingress !== null && (
                                            <span style={{
                                                backgroundColor: '#e5e7eb',
                                                color: '#4b5563',
                                                padding: '2px 8px',
                                                borderRadius: '12px',
                                                fontSize: '13px',
                                                fontWeight: '500'
                                            }}>
                                                Ingress: {ingress}
                                            </span>
                                        )}
                                    </div>
                                    <div style={{height: '300px'}}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={sgGlosaData}>
                                                <CartesianGrid strokeDasharray="3 3"/>
                                                <XAxis
                                                    dataKey="advice"
                                                    angle={-45}
                                                    textAnchor="end"
                                                    height={100}
                                                    interval={0}
                                                    fontSize={12}
                                                />
                                                <YAxis label={{value: 'Count', angle: -90, position: 'insideLeft'}}/>
                                                <Tooltip/>
                                                <Bar
                                                    dataKey="count"
                                                    fill={ingress !== null ? getIngressColor(ingress) : "#3b82f6"}
                                                />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Signal Group Analysis Table */}
            <div>
                <h3 style={{fontSize: '18px', fontWeight: '600', marginBottom: '16px'}}>Signal Group Analysis</h3>
                <div style={{overflowX: 'auto'}}>
                    <table style={{width: '100%', borderCollapse: 'collapse'}}>
                        <thead>
                        <tr style={{backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb'}}>
                            <th style={{padding: '12px', textAlign: 'left', fontWeight: '600'}}>Signal Group</th>
                            <th style={{padding: '12px', textAlign: 'center', fontWeight: '600'}}>Ingress</th>
                            <th style={{padding: '12px', textAlign: 'center', fontWeight: '600'}}>Occurrences</th>
                            <th style={{padding: '12px', textAlign: 'center', fontWeight: '600'}}>Predicted Uses</th>
                            <th style={{padding: '12px', textAlign: 'center', fontWeight: '600'}}>Distance Range (m)
                            </th>
                            <th style={{padding: '12px', textAlign: 'center', fontWeight: '600'}}>Speed Range (km/h)
                            </th>
                            <th style={{padding: '12px', textAlign: 'center', fontWeight: '600'}}>Green Interval
                                Changes
                            </th>
                        </tr>
                        </thead>
                        <tbody>
                        {Object.entries(summary.signalGroupAnalysis).map(([sgName, data]) => {
                            const predictedData = predictionStats.predictedSignalGroups[sgName];
                            const ingress = getIngressForSignalGroup(sgName);

                            return (
                                <tr key={sgName} style={{
                                    borderBottomWidth: '1px',
                                    borderBottomStyle: 'solid',
                                    borderBottomColor: '#e5e7eb',
                                    backgroundColor: ingress !== null ? `${getIngressColor(ingress)}10` : 'transparent' // Very light ingress color
                                }}>
                                    <td style={{padding: '12px'}}>{sgName}</td>
                                    <td style={{padding: '12px', textAlign: 'center'}}>
                                        {ingress !== null ? (
                                            <span style={{
                                                backgroundColor: getIngressColor(ingress),
                                                color: 'white',
                                                padding: '2px 8px',
                                                borderRadius: '12px',
                                                fontSize: '13px',
                                                fontWeight: '500'
                                            }}>
                                                {ingress}
                                            </span>
                                        ) : (
                                            <span style={{color: '#9ca3af'}}>-</span>
                                        )}
                                    </td>
                                    <td style={{padding: '12px', textAlign: 'center'}}>{data.totalOccurrences}</td>
                                    <td style={{padding: '12px', textAlign: 'center'}}>
                                        {predictedData ? `${predictedData.count} (${predictedData.percentage}%)` : '0 (0.0%)'}
                                    </td>
                                    <td style={{padding: '12px', textAlign: 'center'}}>
                                        {data.distanceRange.min.toFixed(1)} - {data.distanceRange.max.toFixed(1)}
                                    </td>
                                    <td style={{padding: '12px', textAlign: 'center'}}>
                                        {data.speedRange.min.toFixed(1)} - {data.speedRange.max.toFixed(1)}
                                    </td>

                                    {/* ENHANCED GREEN INTERVAL CHANGES COLUMN */}
                                    {/* ENHANCED GREEN INTERVAL CHANGES COLUMN */}
                                    <td style={{padding: '12px', textAlign: 'center'}}>
                                        {data.greenIntervalChanges > 0 ? (
                                            <div>
                                                <div style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    backgroundColor: '#fef3c7',
                                                    padding: '3px 8px',
                                                    borderRadius: '16px',
                                                    fontWeight: '600',
                                                    color: '#d97706'
                                                }}>
                                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"
                                                         fill="currentColor" style={{width: '14px', height: '14px'}}>
                                                        <path fillRule="evenodd"
                                                              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
                                                              clipRule="evenodd"/>
                                                    </svg>
                                                    {data.greenIntervalChanges}
                                                </div>

                                                {data.greenChangeTypes && (
                                                    <div style={{
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: '6px',
                                                        marginTop: '8px',
                                                        backgroundColor: '#f9fafb',
                                                        padding: '6px',
                                                        borderRadius: '6px'
                                                    }}>
                                                        <div style={{
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            gap: '6px'
                                                        }}>
                                                            <div style={{
                                                                flex: 1,
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                alignItems: 'center',
                                                                fontSize: '11px',
                                                                backgroundColor: '#fee2e2',
                                                                padding: '4px 2px',
                                                                borderRadius: '4px'
                                                            }}>
                                                                <span style={{
                                                                    fontWeight: '600',
                                                                    color: '#b91c1c'
                                                                }}>Negative</span>
                                                                <span style={{
                                                                    fontWeight: '700',
                                                                    color: '#dc2626',
                                                                    fontSize: '14px'
                                                                }}>
                                {data.greenChangeTypes.laterGreenStart + data.greenChangeTypes.shortenedGreenEnd}
                            </span>
                                                            </div>
                                                            <div style={{
                                                                flex: 1,
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                alignItems: 'center',
                                                                fontSize: '11px',
                                                                backgroundColor: '#dcfce7',
                                                                padding: '4px 2px',
                                                                borderRadius: '4px'
                                                            }}>
                                                                <span style={{
                                                                    fontWeight: '600',
                                                                    color: '#15803d'
                                                                }}>Positive</span>
                                                                <span style={{
                                                                    fontWeight: '700',
                                                                    color: '#16a34a',
                                                                    fontSize: '14px'
                                                                }}>
                                {data.greenChangeTypes.earlierGreenStart + data.greenChangeTypes.extendedGreenEnd}
                            </span>
                                                            </div>
                                                        </div>

                                                        {/* Ratio Indicator */}
                                                        {data.greenChangeTypes.lostGreen > 0 || data.greenChangeTypes.gotGreen > 0 ? (
                                                            <div style={{
                                                                width: '100%',
                                                                height: '4px',
                                                                backgroundColor: '#f3f4f6',
                                                                borderRadius: '2px',
                                                                overflow: 'hidden',
                                                                display: 'flex'
                                                            }}>
                                                                <div style={{
                                                                    width: `${data.greenChangeTypes.lostGreen / (data.greenChangeTypes.lostGreen + data.greenChangeTypes.gotGreen) * 100}%`,
                                                                    height: '100%',
                                                                    backgroundColor: '#ef4444'
                                                                }}/>
                                                                <div style={{
                                                                    width: `${data.greenChangeTypes.gotGreen / (data.greenChangeTypes.lostGreen + data.greenChangeTypes.gotGreen) * 100}%`,
                                                                    height: '100%',
                                                                    backgroundColor: '#22c55e'
                                                                }}/>
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '3px',
                                                backgroundColor: '#ecfdf5',
                                                padding: '3px 8px',
                                                borderRadius: '16px',
                                                color: '#10b981',
                                                fontWeight: '600'
                                            }}>
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"
                                                     fill="currentColor" style={{width: '14px', height: '14px'}}>
                                                    <path fillRule="evenodd"
                                                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                                                          clipRule="evenodd"/>
                                                </svg>
                                                Stable
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default IntersectionOverview;