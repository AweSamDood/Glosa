// Data Table Tab Component
import {useEffect, useState} from "react";

const DataTableTab = ({ passThrough }) => {
    const [selectedSignalGroup, setSelectedSignalGroup] = useState(null);

    // Check if there are any signal groups
    const signalGroupNames = passThrough.signalGroups ? Object.keys(passThrough.signalGroups) : [];
    const hasSignalGroups = signalGroupNames.length > 0;

    // Set selected signal group if none selected and there are groups available
    useEffect(() => {
        if (!selectedSignalGroup && signalGroupNames.length > 0) {
            setSelectedSignalGroup(signalGroupNames[0]);
        }
    }, [signalGroupNames, selectedSignalGroup]);

    // Get metrics for selected signal group with safety checks
    const metrics = (selectedSignalGroup &&
        passThrough.signalGroups &&
        passThrough.signalGroups[selectedSignalGroup] &&
        passThrough.signalGroups[selectedSignalGroup].metrics)
        ? passThrough.signalGroups[selectedSignalGroup].metrics
        : [];

    // If there are no signal groups
    if (!hasSignalGroups) {
        return (
            <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', padding: '24px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>Data Table</h3>
                <p>No signal groups available for this pass-through.</p>
            </div>
        );
    }

    return (
        <div>
            <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>Select Signal Group</h3>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {signalGroupNames.map(name => (
                        <button
                            key={name}
                            onClick={() => setSelectedSignalGroup(name)}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: selectedSignalGroup === name ? '#3b82f6' : '#e5e7eb',
                                color: selectedSignalGroup === name ? 'white' : '#374151',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: selectedSignalGroup === name ? '500' : 'normal'
                            }}
                        >
                            {name}
                        </button>
                    ))}
                </div>
            </div>

            {selectedSignalGroup && (
                <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', overflow: 'hidden' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', padding: '16px', borderBottom: '1px solid #e5e7eb' }}>
                        Data for Signal Group: {selectedSignalGroup}
                    </h3>
                    <div style={{ overflowX: 'auto' }}>
                        {metrics.length > 0 ? (
                            <table style={{ minWidth: '100%', borderCollapse: 'collapse' }}>
                                <thead style={{ backgroundColor: '#f9fafb' }}>
                                <tr>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '500', textTransform: 'uppercase', color: '#6b7280', letterSpacing: '0.05em' }}>Time</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '500', textTransform: 'uppercase', color: '#6b7280', letterSpacing: '0.05em' }}>Distance (m)</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '500', textTransform: 'uppercase', color: '#6b7280', letterSpacing: '0.05em' }}>Speed (km/h)</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '500', textTransform: 'uppercase', color: '#6b7280', letterSpacing: '0.05em' }}>GLOSA Advice</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '500', textTransform: 'uppercase', color: '#6b7280', letterSpacing: '0.05em' }}>GLOSA Speed (km/h)</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '500', textTransform: 'uppercase', color: '#6b7280', letterSpacing: '0.05em' }}>Min/Max Travel Time</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '500', textTransform: 'uppercase', color: '#6b7280', letterSpacing: '0.05em' }}>Green Interval</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '500', textTransform: 'uppercase', color: '#6b7280', letterSpacing: '0.05em' }}>Movement Events</th>
                                </tr>
                                </thead>
                                <tbody>
                                {metrics.map((metric, i) => (
                                    <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#f9fafb' : 'white', borderBottom: '1px solid #e5e7eb' }}>
                                        <td style={{ padding: '12px 16px', fontSize: '14px', color: '#374151' }}>{metric.timestamp.toLocaleTimeString()}</td>
                                        <td style={{ padding: '12px 16px', fontSize: '14px', color: '#374151' }}>{metric.distance.toFixed(1)}</td>
                                        <td style={{ padding: '12px 16px', fontSize: '14px', color: '#374151' }}>{metric.speed.toFixed(1)}</td>
                                        <td style={{ padding: '12px 16px', fontSize: '14px', color: '#374151' }}>
                                            <div style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={metric.glosaAdvice}>
                                                {metric.glosaAdvice || 'N/A'}
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px 16px', fontSize: '14px', color: '#374151' }}>
                                            {metric.glosaSpeedKph !== null ? metric.glosaSpeedKph : 'N/A'}
                                        </td>
                                        <td style={{ padding: '12px 16px', fontSize: '14px', color: '#374151' }}>
                                            {metric.minTravelTime !== null && metric.maxTravelTime !== null
                                                ? `${metric.minTravelTime}/${metric.maxTravelTime}s`
                                                : 'N/A'}
                                        </td>
                                        <td style={{ padding: '12px 16px', fontSize: '14px', color: '#374151' }}>
                                            {metric.greenStartTime !== null || metric.greenEndTime !== null
                                                ? `${metric.greenStartTime || 0}s - ${metric.greenEndTime || 0}s`
                                                : 'N/A'}
                                        </td>
                                        <td style={{ padding: '12px 16px', fontSize: '14px', color: '#374151' }}>
                                            {metric.movementEvents && metric.movementEvents.length > 0 ? (
                                                <div style={{ fontSize: '13px' }}>
                                                    {metric.movementEvents.map((me, idx) => (
                                                        <div key={idx} style={{ marginBottom: idx < metric.movementEvents.length - 1 ? '8px' : '0', padding: '4px', backgroundColor: '#f3f4f6', borderRadius: '4px' }}>
                                                            <div style={{ fontWeight: '500', color: me.state === 'protectedMovementAllowed' ? '#10b981' : me.state === 'stopAndRemain' ? '#ef4444' : '#374151' }}>
                                                                {me.state}
                                                            </div>
                                                            {me.startTime && (
                                                                <div>Start: {me.startTime.toLocaleTimeString()}</div>
                                                            )}
                                                            {me.minEndTime && (
                                                                <div>Min end: {me.minEndTime.toLocaleTimeString()}</div>
                                                            )}
                                                            {me.maxEndTime && (
                                                                <div>Max end: {me.maxEndTime.toLocaleTimeString()}</div>
                                                            )}
                                                            {me.likelyTime && (
                                                                <div>Likely: {me.likelyTime.toLocaleTimeString()}</div>
                                                            )}
                                                            {me.nextTime && (
                                                                <div>Next: {me.nextTime.toLocaleTimeString()}</div>
                                                            )}
                                                            {me.timeConfidence !== null && (
                                                                <div>Confidence: {me.timeConfidence}%</div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : 'None'}
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        ) : (
                            <div style={{ padding: '24px', textAlign: 'center' }}>
                                <p>No metrics available for this signal group.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// export default
export default DataTableTab;