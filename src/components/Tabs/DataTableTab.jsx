// src/components/Tabs/DataTableTab.jsx
import React, { useState, useEffect } from 'react';

// Icon for change indicator in the table row
const RowChangeIcon = ({ title }) => (
    <svg title={title} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" style={{ width: '14px', height: '14px', color: '#f97316', verticalAlign: 'middle' }}>
        <path fillRule="evenodd" d="M14 8a.75.75 0 0 1-.75.75H2.75a.75.75 0 0 1 0-1.5h10.5A.75.75 0 0 1 14 8ZM2 5.75a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 5.75Zm1.78 5.03a.75.75 0 0 1 0-1.06l1.72-1.72a.75.75 0 0 1 1.06 0l1.72 1.72a.75.75 0 0 1-1.06 1.06L6 9.56l-1.16 1.16a.75.75 0 0 1-1.06 0Z" clipRule="evenodd" />
    </svg>
);

const DataTableTab = ({ passThrough }) => {
    const [selectedSignalGroup, setSelectedSignalGroup] = useState(null);

    // Safely get signal group names
    const signalGroupNames = passThrough?.signalGroups ? Object.keys(passThrough.signalGroups) : [];
    const hasSignalGroups = signalGroupNames.length > 0;

    // Effect to manage selected signal group
    useEffect(() => {
        // If a group is selected but not available in the current passThrough, reset
        if (selectedSignalGroup && !signalGroupNames.includes(selectedSignalGroup)) {
            setSelectedSignalGroup(hasSignalGroups ? signalGroupNames[0] : null);
        }
        // If no group is selected but groups are available, select the first one
        else if (!selectedSignalGroup && hasSignalGroups) {
            setSelectedSignalGroup(signalGroupNames[0]);
        }
        // If no groups available, ensure selection is null
        else if (!hasSignalGroups) {
            setSelectedSignalGroup(null);
        }
    }, [passThrough, signalGroupNames, selectedSignalGroup, hasSignalGroups]); // Add hasSignalGroups dependency

    // Get metrics for selected signal group safely
    const metrics = (selectedSignalGroup &&
        passThrough?.signalGroups?.[selectedSignalGroup]?.metrics)
        ? passThrough.signalGroups[selectedSignalGroup].metrics
        : [];

    // Render placeholder if no signal groups
    if (!hasSignalGroups) {
        return (
            <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', padding: '24px', marginTop: '24px' /* Add margin if tabs aren't shown */ }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>Data Table</h3>
                <p>No signal groups available for this pass-through.</p>
            </div>
        );
    }

    return (
        // Container for the entire tab content
        <div>
            {/* Signal Group Selection */}
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
                                fontWeight: selectedSignalGroup === name ? '600' : '500',
                                transition: 'background-color 0.2s ease, color 0.2s ease',
                            }}
                        >
                            {name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Data Table Card */}
            {selectedSignalGroup && (
                <div style={{ backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', overflow: 'hidden' /* Clip corners */ }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', padding: '16px', borderBottom: '1px solid #e5e7eb', margin: 0 }}>
                        Data for Signal Group: {selectedSignalGroup}
                    </h3>
                    {/* This div handles horizontal scrolling *only* for the table */}
                    <div style={{ overflowX: 'auto', paddingBottom: '1px' /* Prevents scrollbar cutting border */ }}>
                        {metrics.length > 0 ? (
                            <table style={{
                                // REMOVED width: '100%', let table size naturally
                                minWidth: '100%', // Ensure table fills container at minimum
                                borderCollapse: 'collapse',
                                tableLayout: 'auto', // Let browser determine column widths
                            }}>
                                <thead style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, zIndex: 1 /* Keep header visible on scroll */ }}>
                                <tr>
                                    {/* Status column */}
                                    <th style={{ width: '40px', padding: '12px 8px', textAlign: 'center', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280', letterSpacing: '0.05em' }}></th>
                                    {/* Other headers */}
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Time</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Dist (m)</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Speed (km/h)</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>GLOSA Advice</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>GLOSA Spd</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Travel (s)</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Green Int (s)</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', color: '#6b7280', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Movement Events</th>
                                </tr>
                                </thead>
                                <tbody>
                                {metrics.map((metric, i) => {
                                    const intervalChanged = metric.greenIntervalChanged;
                                    const rowStyle = {
                                        backgroundColor: intervalChanged ? '#fffbeb' : (i % 2 === 0 ? 'white' : '#f9fafb'),
                                        borderBottom: '1px solid #e5e7eb',
                                        transition: 'background-color 0.3s ease',
                                    };
                                    // Alternate row styling without transition for performance if needed
                                    // const rowStyle = {
                                    //     backgroundColor: intervalChanged ? '#fffbeb' : (i % 2 === 0 ? 'white' : '#f9fafb'),
                                    //     borderBottom: '1px solid #e5e7eb',
                                    // };

                                    return (
                                        <tr key={i} style={rowStyle} >
                                            {/* Status Cell */}
                                            <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                                                {intervalChanged && <RowChangeIcon title="Green interval changed significantly from previous message" />}
                                            </td>
                                            {/* Data Cells */}
                                            <td style={{ padding: '10px 16px', fontSize: '14px', color: '#374151', whiteSpace: 'nowrap' }}>{metric.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 1 })}</td>
                                            <td style={{ padding: '10px 16px', fontSize: '14px', color: '#374151', textAlign: 'right' }}>{metric.distance.toFixed(1)}</td>
                                            <td style={{ padding: '10px 16px', fontSize: '14px', color: '#374151', textAlign: 'right' }}>{metric.speed.toFixed(1)}</td>
                                            <td style={{ padding: '10px 16px', fontSize: '14px', color: '#374151' }}>
                                                <div style={{ minWidth:'120px', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={metric.glosaAdvice || 'N/A'}>
                                                    {metric.glosaAdvice || 'N/A'}
                                                </div>
                                            </td>
                                            <td style={{ padding: '10px 16px', fontSize: '14px', color: '#374151', textAlign: 'right' }}>
                                                {metric.glosaSpeedKph !== null ? metric.glosaSpeedKph.toFixed(1) : 'N/A'}
                                            </td>
                                            <td style={{ padding: '10px 16px', fontSize: '14px', color: '#374151', whiteSpace: 'nowrap', textAlign: 'center' }}>
                                                {metric.minTravelTime !== null && metric.maxTravelTime !== null
                                                    ? `${metric.minTravelTime}/${metric.maxTravelTime}`
                                                    : 'N/A'}
                                            </td>
                                            <td style={{ padding: '10px 16px', fontSize: '14px', color: '#374151', whiteSpace: 'nowrap', textAlign: 'center' }}>
                                                {(metric.greenStartTime !== null || metric.greenEndTime !== null)
                                                    ? `[${metric.greenStartTime ?? '-'}, ${metric.greenEndTime ?? '-'}]`
                                                    : 'N/A'}
                                            </td>
                                            <td style={{ padding: '10px 16px', fontSize: '13px', color: '#374151', minWidth: '300px' /* Give movement events more space */ }}>
                                                {metric.movementEvents && metric.movementEvents.length > 0 ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                        {metric.movementEvents.map((me, idx) => (
                                                            <div key={idx} style={{ padding: '4px 6px', backgroundColor: '#f3f4f6', borderRadius: '4px' }}>
                                                                <div style={{ fontWeight: '600', color: me.state === 'protectedMovementAllowed' || me.state === 'permissiveMovementAllowed' ? '#059669' : me.state === 'stopAndRemain' ? '#dc2626' : '#374151', marginBottom: '2px', whiteSpace: 'normal' }}>
                                                                    {me.state}
                                                                </div>
                                                                <div style={{ fontSize: '12px', color: '#4b5563', display: 'flex', flexWrap: 'wrap', gap: '4px 10px' /* Increased gap */ }}>
                                                                    {me.minEndTime && <span>MinEnd: {me.minEndTime.toLocaleTimeString([],{hour:'2-digit', minute:'2-digit', second:'2-digit'})}</span>}
                                                                    {me.maxEndTime && <span>MaxEnd: {me.maxEndTime.toLocaleTimeString([],{hour:'2-digit', minute:'2-digit', second:'2-digit'})}</span>}
                                                                    {me.likelyTime && <span>Likely: {me.likelyTime.toLocaleTimeString([],{hour:'2-digit', minute:'2-digit', second:'2-digit'})}</span>}
                                                                    {me.timeConfidence !== null && <span>Conf: {me.timeConfidence}%</span>}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : <span style={{color: '#9ca3af'}}>None</span>}
                                            </td>
                                        </tr>
                                    );
                                })}
                                </tbody>
                            </table>
                        ) : (
                            <div style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>
                                <p>No metrics available for this signal group.</p>
                            </div>
                        )}
                    </div> {/* End Horizontal Scroll Wrapper */}
                </div> // End Data Table Card
            )}
        </div> // End Tab Content Container
    );
};

export default DataTableTab;